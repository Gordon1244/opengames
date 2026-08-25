"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { createClient } from "../lib/supabase/client";
import type { Locale } from "../lib/i18n";

type RoomPolicy = "player" | "creator" | "global" | "hybrid";
type Room = { room_id: string; room_topic: string; room_code: string | null; visibility: string; room_mode: string; team_count: number | null; max_players: number | null; persistent: boolean };
type BridgeRequest = { source?: string; version?: number; requestId?: string; type?: string; [key: string]: unknown };

export default function GamePlayer({ title, playUrl, gameId, uiLocale, gameLocale, region, signedIn, cloudSavesEnabled, multiplayerEnabled, multiplayerMaxPlayers, multiplayerModes, roomPolicy, managedUnlimited, canManageRooms }: {
  title: string; playUrl: string; gameId: string; uiLocale: Locale; gameLocale: string; region: string; signedIn: boolean;
  cloudSavesEnabled: boolean; multiplayerEnabled: boolean; multiplayerMaxPlayers: number; multiplayerModes: string[];
  roomPolicy: RoomPolicy; managedUnlimited: boolean; canManageRooms: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const roomRef = useRef<Room | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sentAtRef = useRef<number[]>([]);
  const [bridgeReady, setBridgeReady] = useState(false);
  const english = uiLocale === "en";

  async function countActualPlay() {
    const storageKey = `opengames:play-counted:${gameId}`;
    try {
      if (window.sessionStorage.getItem(storageKey)) return;
      const response = await fetch(`/api/games/${encodeURIComponent(gameId)}/play`, { method: "POST", credentials: "same-origin", keepalive: true });
      if (response.ok) window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // Metrics must never prevent the game from loading.
    }
  }

  function post(payload: Record<string, unknown>) {
    iframeRef.current?.contentWindow?.postMessage({ source: "opengames-platform", version: 1, ...payload }, "*");
  }

  function capabilities() {
    return {
      account: { signedIn }, locale: gameLocale, region,
      cloudSaves: { enabled: cloudSavesEnabled, maxSlots: 10, maxBytes: 65536 },
      multiplayer: { enabled: multiplayerEnabled, maxPlayers: multiplayerMaxPlayers, modes: multiplayerModes, roomPolicy, managedUnlimited, canManageRooms, voice: false },
    };
  }

  async function leaveRoom() {
    const supabase = createClient(); const room = roomRef.current;
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = null;
    if (channelRef.current && supabase) await supabase.removeChannel(channelRef.current);
    channelRef.current = null; roomRef.current = null;
    if (room && supabase) await supabase.rpc("opengames_leave_multiplayer_room", { p_room_id: room.room_id });
  }

  async function connectRoom(room: Room) {
    const supabase = createClient();
    if (!supabase) throw new Error("MULTIPLAYER_UNAVAILABLE");
    await leaveRoom();
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.access_token) throw new Error("AUTH_REQUIRED");
    await supabase.realtime.setAuth(session.session.access_token);
    const connectionId = crypto.randomUUID();
    const channel = supabase.channel(room.room_topic, { config: { private: true, broadcast: { self: false, ack: true }, presence: { key: connectionId } } });
    channel.on("broadcast", { event: "game" }, ({ payload }) => post({ type: "multiplayer.message", payload }));
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      post({ type: "multiplayer.presence", playerCount: Object.values(state).flat().length });
    });
    await new Promise<void>((resolve, reject) => channel.subscribe(async (status, error) => {
      if (status === "SUBSCRIBED") { await channel.track({ connectionId }); resolve(); }
      if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) reject(error || new Error(status));
    }));
    channelRef.current = channel; roomRef.current = room;
    heartbeatRef.current = setInterval(() => { void supabase.rpc("opengames_touch_multiplayer_room", { p_room_id: room.room_id }); }, 45_000);
    return room;
  }

  async function multiplayer(request: BridgeRequest) {
    if (!multiplayerEnabled) throw new Error("FEATURE_DISABLED");
    if (!signedIn) throw new Error("AUTH_REQUIRED");
    const supabase = createClient(); if (!supabase) throw new Error("MULTIPLAYER_UNAVAILABLE");
    const mode = typeof request.mode === "string" ? request.mode : multiplayerModes[0];
    if (!multiplayerModes.includes(mode)) throw new Error("MODE_NOT_ALLOWED");
    if (request.type === "multiplayer.list") {
      const { data, error } = await supabase.rpc("opengames_list_multiplayer_rooms", { p_game_id: gameId });
      if (error) throw error; return { rooms: data ?? [] };
    }
    if (request.type === "multiplayer.create") {
      const persistent = request.persistent === true;
      const creatorRoom = persistent || request.creatorManaged === true;
      if (creatorRoom && (!canManageRooms || !["creator", "hybrid"].includes(roomPolicy))) throw new Error("CREATOR_ROOM_NOT_ALLOWED");
      if (!creatorRoom && !["player", "hybrid"].includes(roomPolicy)) throw new Error("PLAYER_ROOMS_DISABLED");
      const visibility = request.visibility === "password" ? "password" : "public";
      const password = typeof request.password === "string" ? request.password : "";
      const teamCount = mode === "teams" && Number.isInteger(request.teamCount) ? Number(request.teamCount) : null;
      const maxPlayers = creatorRoom && managedUnlimited ? null : multiplayerMaxPlayers;
      if (creatorRoom) {
        const { data, error } = await supabase.functions.invoke("opengames-managed-room", { body: { gameId, action: "creator-room", visibility, password: password || null, mode, teamCount } });
        if (error || !data?.room) throw error || new Error("ROOM_REQUEST_FAILED"); return { room: await connectRoom(data.room as Room) };
      }
      const { data, error } = await supabase.rpc("opengames_create_multiplayer_room", { p_game_id: gameId, p_visibility: visibility, p_password: password || null, p_mode: mode, p_team_count: teamCount, p_max_players: maxPlayers, p_persistent: false, p_room_kind: "player" });
      if (error) throw error; return { room: await connectRoom((data as Room[])[0]) };
    }
    if (request.type === "multiplayer.join") {
      const code = typeof request.code === "string" ? request.code.toUpperCase().trim() : "";
      const password = typeof request.password === "string" ? request.password : null;
      const { data, error } = await supabase.rpc("opengames_join_multiplayer_room", { p_game_id: gameId, p_code: code, p_password: password });
      if (error) throw error; return { room: await connectRoom((data as Room[])[0]) };
    }
    if (request.type === "multiplayer.joinGlobal") {
      if (roomPolicy !== "global") throw new Error("GLOBAL_WORLD_DISABLED");
      const { data, error } = await supabase.functions.invoke("opengames-managed-room", { body: { gameId, action: "global", mode } });
      if (error || !data?.room) throw error || new Error("ROOM_REQUEST_FAILED"); return { room: await connectRoom(data.room as Room) };
    }
    if (request.type === "multiplayer.send") {
      if (!channelRef.current) throw new Error("NOT_IN_ROOM");
      const encoded = JSON.stringify(request.payload);
      if (new TextEncoder().encode(encoded).byteLength > 8192) throw new Error("MESSAGE_TOO_LARGE");
      const now = Date.now(); sentAtRef.current = sentAtRef.current.filter((time) => now - time < 1000);
      if (sentAtRef.current.length >= 30) throw new Error("RATE_LIMITED");
      sentAtRef.current.push(now);
      const result = await channelRef.current.send({ type: "broadcast", event: "game", payload: request.payload });
      if (result !== "ok") throw new Error("SEND_FAILED"); return { sent: true };
    }
    if (request.type === "multiplayer.close") {
      if (!roomRef.current) throw new Error("NOT_IN_ROOM");
      const { data, error } = await supabase.rpc("opengames_close_multiplayer_room", { p_room_id: roomRef.current.room_id });
      if (error || !data) throw error || new Error("HOST_ONLY"); await leaveRoom(); return { closed: true };
    }
    if (request.type === "multiplayer.leave") { await leaveRoom(); return { left: true }; }
    throw new Error("UNKNOWN_MULTIPLAYER_ACTION");
  }

  useEffect(() => {
    const handler = async (event: MessageEvent<BridgeRequest>) => {
      if (event.source !== iframeRef.current?.contentWindow || event.data?.source !== "opengames-game" || event.data.version !== 1) return;
      const request = event.data; const requestId = typeof request.requestId === "string" ? request.requestId : crypto.randomUUID();
      try {
        let result: unknown;
        if (request.type === "ready") { setBridgeReady(true); result = capabilities(); }
        else if (request.type === "save.load") {
          if (!cloudSavesEnabled) throw new Error("FEATURE_DISABLED");
          const slot = typeof request.slot === "string" ? request.slot : "default";
          const response = await fetch(`/api/games/${encodeURIComponent(gameId)}/saves?slot=${encodeURIComponent(slot)}`, { cache: "no-store" }); result = await response.json(); if (!response.ok) throw new Error((result as { error?: string }).error || "SAVE_LOAD_FAILED");
        } else if (request.type === "save.write") {
          if (!cloudSavesEnabled) throw new Error("FEATURE_DISABLED");
          const response = await fetch(`/api/games/${encodeURIComponent(gameId)}/saves`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slot: request.slot || "default", data: request.data, version: request.saveVersion ?? 0 }) }); result = await response.json(); if (!response.ok) throw new Error((result as { error?: string }).error || "SAVE_WRITE_FAILED");
        } else if (request.type === "save.delete") {
          if (!cloudSavesEnabled) throw new Error("FEATURE_DISABLED");
          const slot = typeof request.slot === "string" ? request.slot : "default";
          const response = await fetch(`/api/games/${encodeURIComponent(gameId)}/saves?slot=${encodeURIComponent(slot)}`, { method: "DELETE" }); result = await response.json(); if (!response.ok) throw new Error((result as { error?: string }).error || "SAVE_DELETE_FAILED");
        } else if (request.type?.startsWith("multiplayer.")) result = await multiplayer(request);
        else throw new Error("UNKNOWN_ACTION");
        post({ type: "response", requestId, ok: true, result });
      } catch (error) {
        const message = error instanceof Error ? error.message : "REQUEST_FAILED";
        post({ type: "response", requestId, ok: false, error: message });
      }
    };
    window.addEventListener("message", handler);
    return () => { window.removeEventListener("message", handler); void leaveRoom(); };
  // Capability props are fixed for this rendered game page.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <section className="player-wrap"><div className="player-bar"><div><i /> SANDBOXED PLAYER</div><span>{bridgeReady ? (english ? "OpenGames services connected — credentials stay private" : "OpenGames 服務已連接，帳號憑證保持隔離") : (english ? "Account data is isolated from the game" : "遊戲無法直接讀取帳號資料")}</span></div><iframe ref={iframeRef} title={`${title} ${english ? "game" : "遊戲"}`} src={playUrl} onLoad={() => { void countActualPlay(); }} sandbox="allow-scripts allow-pointer-lock" allow="autoplay; fullscreen; gamepad" allowFullScreen /></section>;
}

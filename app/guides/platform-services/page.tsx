import { SiteFooter, SiteHeader } from "../../../components/SiteHeader";
import { copy, getLocale } from "../../../lib/i18n";

const installCode = `<script src="/opengames-sdk.js"></script>
<script>
  const platform = await OpenGames.ready();
  console.log(platform.account.signedIn, platform.cloudSaves.enabled);
</script>`;
const localeCode = `const platform = await OpenGames.ready();
const locale = platform.locale; // "zh-Hant", "en", "ja"…
const region = platform.region; // "TW", "JP", "US" or "XX"
showTranslatedMenu(locale);`;
const saveCode = `const loaded = await OpenGames.saves.load("campaign");
let version = loaded.save?.version ?? 0;
let state = loaded.save?.data ?? { level: 1, coins: 0 };

const written = await OpenGames.saves.write(state, {
  slot: "campaign",
  version
});
version = written.save.version;`;
const roomCode = `// Public co-op room
const created = await OpenGames.multiplayer.create({
  visibility: "public",
  mode: "co-op"
});
showRoomCode(created.room.room_code);

// Password-protected team room
await OpenGames.multiplayer.create({
  visibility: "password",
  password: playerEnteredPassword,
  mode: "teams",
  teamCount: 2
});

const publicRooms = await OpenGames.multiplayer.list();
await OpenGames.multiplayer.join(code, passwordOrNull);`;
const eventsCode = `OpenGames.on("multiplayer.message", ({ payload }) => {
  applyRemoteInput(payload);
});
OpenGames.on("multiplayer.presence", ({ playerCount }) => {
  updateLobbyCount(playerCount);
});

await OpenGames.multiplayer.send({
  type: "input",
  frame: 1024,
  buttons: ["jump"]
});`;
const managedCode = `// Only the actual creator can request a permanent room.
await OpenGames.multiplayer.create({
  creatorManaged: true,
  persistent: true,
  visibility: "public",
  mode: "shared"
});

// When “One game-wide world” is selected:
await OpenGames.multiplayer.joinGlobal("shared");`;

function Code({ children }: { children: string }) { return <pre className="sdk-code"><code>{children}</code></pre>; }

export default async function PlatformServicesGuide() {
  const locale = await getLocale(); const en = locale === "en";
  return <main><SiteHeader /><article className="sdk-guide">
    <header><p className="eyebrow"><span /> OPENGAMES GAME SDK</p><h1>{copy(locale, <>把帳號服務<br />接進你的遊戲。</>, <>Connect account services<br />to your game.</>)}</h1><p>{copy(locale, "SDK 透過受控橋接提供地區語言、雲端存檔與邀請碼連線；遊戲永遠不會收到登入 Cookie、Email 或 Supabase 權杖。", "The controlled bridge provides regional language, cloud saves, and invite-code multiplayer. Your game never receives sign-in cookies, email addresses, or Supabase tokens.")}</p></header>
    <nav className="sdk-guide-nav"><a href="#install">01 {en ? "Install" : "載入"}</a><a href="#locale">02 {en ? "Language" : "語言"}</a><a href="#saves">03 {en ? "Saves" : "存檔"}</a><a href="#rooms">04 {en ? "Rooms" : "連線"}</a><a href="#limits">05 {en ? "Limits" : "限制"}</a></nav>
    <section id="install"><span>01</span><div><h2>{en ? "Load the bridge SDK" : "載入橋接 SDK"}</h2><p>{en ? "Enable services in Creator dashboard → Game services, include this script in index.html, and call ready after the game UI initializes." : "先到「作品控制台 → 遊戲服務」開啟功能，再把下列程式加入 index.html；遊戲介面初始化後呼叫 ready。"}</p><Code>{installCode}</Code><aside>{en ? "Outside OpenGames, detect window.OpenGames and fall back to localStorage or offline play." : "在 OpenGames 以外測試時，先檢查 window.OpenGames；沒有時退回 localStorage 或離線模式。"}</aside></div></section>
    <section id="locale"><span>02</span><div><h2>{en ? "Use the selected game language" : "使用平台選定的遊戲語言"}</h2><p>{en ? "Declare translations actually included in the build. OpenGames chooses among them using remembered preference, browser language, coarse country, then creator fallback. Region is a two-letter country code, never an IP address." : "創作者要先勾選遊戲實際內建的翻譯。OpenGames 再依已記住的偏好、瀏覽器語言、概略國家與創作者預設語言做選擇。region 只有兩碼國家代碼，不包含 IP。"}</p><Code>{localeCode}</Code><aside>{en ? "OpenGames selects a locale; it cannot translate missing game text." : "OpenGames 只負責選擇語言，不會自動產生遊戲尚未提供的翻譯。"}</aside></div></section>
    <section id="saves"><span>03</span><div><h2>{en ? "Save progress to the account" : "把進度存到 OpenGames 帳號"}</h2><p>{en ? "Each player gets 10 slots per game, 64 KiB each. Keep the returned version and send it with the next write so two devices cannot silently overwrite each other." : "每位玩家、每款遊戲最多 10 格，每格 64 KiB。保存回傳的 version，下一次寫入時一併送出，避免兩台裝置無聲互相覆蓋。"}</p><Code>{saveCode}</Code><aside>{en ? "On VERSION_CONFLICT, reload and ask which progress to keep. Do not overwrite automatically." : "若出現 VERSION_CONFLICT，請重新載入並讓玩家選擇要保留的進度，不要自動覆蓋。"}</aside></div></section>
    <section id="rooms"><span>04</span><div><h2>{en ? "Create rooms inside the game" : "在遊戲內建立房間"}</h2><p>{en ? "Build a lobby UI and call the SDK. Public rooms appear in list(); password rooms require 4–32 characters and store only a one-way hash. Player rooms close after 10 inactive minutes." : "請在遊戲內製作大廳介面，再呼叫 SDK。公開房會出現在 list()；密碼房需要 4–32 字元，平台只保留不可逆雜湊。玩家房無活動 10 分鐘後關閉。"}</p><Code>{roomCode}</Code><h3>{en ? "Exchange game state" : "交換遊戲狀態"}</h3><Code>{eventsCode}</Code><h3>{en ? "Creator rooms and the game-wide world" : "創作者房間與全遊戲世界"}</h3><Code>{managedCode}</Code><aside>{en ? "The creator allows everyone-together, co-op, versus, or teams. The game still defines message meaning and team assignment." : "創作者可允許「全體共享、合作、對戰、分組」。平台負責房間與傳送，訊息意義和分隊方式仍由遊戲決定。"}</aside></div></section>
    <section id="limits"><span>05</span><div><h2>{en ? "Design for quotas and disconnects" : "處理配額與斷線"}</h2><ul><li>{en ? "JSON messages: 8 KiB each, 30 sends per second per page." : "JSON 訊息每則最多 8 KiB；每個遊戲頁每秒最多 30 則。"}</li><li>{en ? "Use Presence for lobby count and Broadcast for frequent gameplay updates." : "Presence 用於大廳人數；高頻遊戲資料使用 Broadcast。"}</li><li>{en ? "No platform player cap still obeys Supabase plan limits; large worlds need sharding or paid capacity." : "平台不設人數上限仍受 Supabase 方案限制；大型世界需要分流或付費容量。"}</li><li>{en ? "Support reconnect, authoritative resync, and an offline fallback." : "務必處理重新連線、權威狀態重同步及離線備援。"}</li><li>{en ? "Never send passwords, tokens, email, chat logs, or personal data in payloads." : "不要把密碼、權杖、Email、聊天紀錄或個資放進遊戲訊息。"}</li></ul><p className="sdk-voice-note">{en ? "Voice chat is intentionally unavailable." : "目前刻意不提供語音聊天。"}</p></div></section>
  </article><SiteFooter /></main>;
}

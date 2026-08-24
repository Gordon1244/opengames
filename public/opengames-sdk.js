(function (global) {
  "use strict";
  var pending = new Map();
  var listeners = new Map();

  function request(type, payload) {
    var requestId = crypto.randomUUID();
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { pending.delete(requestId); reject(new Error("OpenGames request timed out")); }, 15000);
      pending.set(requestId, { resolve: resolve, reject: reject, timer: timer });
      parent.postMessage(Object.assign({ source: "opengames-game", version: 1, requestId: requestId, type: type }, payload || {}), "*");
    });
  }

  function on(type, callback) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(callback);
    return function () { listeners.get(type)?.delete(callback); };
  }

  addEventListener("message", function (event) {
    if (event.source !== parent || !event.data || event.data.source !== "opengames-platform" || event.data.version !== 1) return;
    if (event.data.type === "response") {
      var item = pending.get(event.data.requestId); if (!item) return;
      clearTimeout(item.timer); pending.delete(event.data.requestId);
      if (event.data.ok) item.resolve(event.data.result); else item.reject(new Error(event.data.error || "OpenGames request failed"));
      return;
    }
    (listeners.get(event.data.type) || []).forEach(function (callback) { callback(event.data); });
  });

  global.OpenGames = Object.freeze({
    ready: function () { return request("ready"); },
    on: on,
    saves: Object.freeze({
      load: function (slot) { return request("save.load", { slot: slot || "default" }); },
      write: function (data, options) { options = options || {}; return request("save.write", { slot: options.slot || "default", data: data, saveVersion: options.version || 0 }); },
      remove: function (slot) { return request("save.delete", { slot: slot || "default" }); }
    }),
    multiplayer: Object.freeze({
      list: function () { return request("multiplayer.list"); },
      create: function (options) { return request("multiplayer.create", options || {}); },
      join: function (code, password) { return request("multiplayer.join", { code: code, password: password || null }); },
      joinGlobal: function (mode) { return request("multiplayer.joinGlobal", { mode: mode }); },
      send: function (payload) { return request("multiplayer.send", { payload: payload }); },
      leave: function () { return request("multiplayer.leave"); },
      close: function () { return request("multiplayer.close"); }
    })
  });
})(window);

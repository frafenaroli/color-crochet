/*
 * storage.js — persistenza locale (localStorage).
 * Ricorda l'ultima palette creata e le preferenze di dimensione testo.
 * Tutto lato client, nessun dato inviato a server.
 */
(function () {
  "use strict";
  window.CC = window.CC || {};

  var KEY_STATE = "colorcrochet:stato";
  var KEY_FONT = "colorcrochet:font";

  function safeGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, val) {
    try { window.localStorage.setItem(key, val); } catch (e) { /* ignora */ }
  }

  CC.storage = {
    salvaStato: function (stato) {
      safeSet(KEY_STATE, JSON.stringify(stato));
    },
    leggiStato: function () {
      var raw = safeGet(KEY_STATE);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (e) { return null; }
    },
    salvaFont: function (scala) {
      safeSet(KEY_FONT, String(scala));
    },
    leggiFont: function () {
      var raw = safeGet(KEY_FONT);
      var n = parseFloat(raw);
      return isNaN(n) ? null : n;
    },
  };
})();

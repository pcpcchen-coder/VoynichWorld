/*
 * 存檔：localStorage，3 個手動欄位＋自動存檔。存檔含 version，載入時依序套用遷移掛勾。
 * localStorage 不可用（隱私模式、file:// 被封鎖等）時，以記憶體暫存代替，遊戲仍可進行。
 */
(function () {
  'use strict';
  var V = window.VELLORA, U = V.util;
  var Sv = V.save = {};
  Sv.VERSION = 1;
  Sv.SLOTS = ['auto', 'slot1', 'slot2', 'slot3'];
  Sv.SLOT_NAMES = { auto: '自動存檔', slot1: '欄位一', slot2: '欄位二', slot3: '欄位三' };
  // 遷移掛勾：migrations[n] 把第 n 版存檔轉成第 n+1 版。資料檔也可在 meta.saveMigrations 追加。
  Sv.migrations = {};
  var mem = {}, ok = false;
  try {
    var k = '__vellora_test__';
    window.localStorage.setItem(k, '1'); window.localStorage.removeItem(k); ok = true;
  } catch (e) { ok = false; }
  Sv.persistent = ok;

  function get(key) { try { return ok ? window.localStorage.getItem(key) : (mem[key] || null); } catch (e) { return mem[key] || null; } }
  function set(key, val) { mem[key] = val; try { if (ok) window.localStorage.setItem(key, val); return true; } catch (e) { return false; } }
  function del(key) { delete mem[key]; try { if (ok) window.localStorage.removeItem(key); } catch (e) { /* 忽略 */ } }
  function prefix() { return 'vellora.' + ((V.data.meta && V.data.meta.id) || 'game') + '.'; }

  // ---- 設定 ----
  Sv.settings = { textSpeed: 'normal', master: 8, sfx: 8, ambience: 6, touch: 'auto' };
  Sv.loadSettings = function () {
    try { var raw = get('vellora.settings'); if (raw) { var o = JSON.parse(raw); Object.keys(Sv.settings).forEach(function (k2) { if (o[k2] != null) Sv.settings[k2] = o[k2]; }); } } catch (e) { /* 用預設 */ }
    Sv.applySettings();
  };
  Sv.saveSettings = function () { set('vellora.settings', JSON.stringify(Sv.settings)); Sv.applySettings(); };
  Sv.applySettings = function () {
    var s = Sv.settings;
    V.audio.setVolumes({ master: s.master / 10, sfx: s.sfx / 10, ambience: s.ambience / 10 });
    var show = s.touch === 'on' || (s.touch === 'auto' && V.input.isTouch);
    document.body.classList.toggle('touch-enabled', show);
    V.emit('settings');
  };

  // ---- 存讀 ----
  Sv.snapshot = function () {
    var s = V.game.s, p = V.field.player;
    if (p) { s.x = p.x; s.y = p.y; s.dir = p.dir; }
    return {
      version: Sv.VERSION, dataId: (V.data.meta && V.data.meta.id) || 'game', savedAt: Date.now(),
      summary: { map: (V.data.maps[s.map] || {}).name || s.map, level: s.level, playtime: Math.floor(s.playtime), folios: Object.keys(s.folios).length, chapter: (V.data.meta && V.data.meta.chapter) || '' },
      state: U.clone(s)
    };
  };
  Sv.write = function (slot) {
    if (!V.game.s) return false;
    try { return set(prefix() + slot, JSON.stringify(Sv.snapshot())); } catch (e) { console.warn('存檔失敗', e); return false; }
  };
  Sv.auto = function () { if (V.cutscene && V.cutscene.running) return; Sv.write('auto'); };
  Sv.migrate = function (save) {
    var guard = 0;
    var extra = (V.data.meta && V.data.meta.saveMigrations) || {};
    while ((save.version || 0) < Sv.VERSION && guard++ < 50) {
      var v = save.version || 0, fn = Sv.migrations[v] || extra[v];
      if (fn) save = fn(save) || save;
      save.version = v + 1;
    }
    return save;
  };
  Sv.read = function (slot) {
    try {
      var raw = get(prefix() + slot); if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !o.state) return null;
      if ((o.version || 0) > Sv.VERSION) return null; // 來自較新版本
      return Sv.migrate(o);
    } catch (e) { return null; }
  };
  Sv.info = function (slot) { var o = Sv.read(slot); return o ? { slot: slot, savedAt: o.savedAt, summary: o.summary || {} } : null; };
  Sv.latest = function () {
    var best = null;
    Sv.SLOTS.forEach(function (sl) { var i = Sv.info(sl); if (i && (!best || i.savedAt > best.savedAt)) best = i; });
    return best;
  };
  Sv.remove = function (slot) { del(prefix() + slot); };

  // 把存檔套用成目前狀態（補上新版本才有的欄位）
  Sv.restore = function (save) {
    var fresh = V.game.newState();
    var st = save.state;
    Object.keys(fresh).forEach(function (k2) {
      if (st[k2] === undefined) st[k2] = fresh[k2];
      else if (fresh[k2] && typeof fresh[k2] === 'object' && !Array.isArray(fresh[k2])) {
        Object.keys(fresh[k2]).forEach(function (j) { if (st[k2][j] === undefined && (k2 === 'stats' || k2 === 'dims' || k2 === 'conn')) st[k2][j] = fresh[k2][j]; });
      }
    });
    V.game.s = st;
    return st;
  };
  Sv.fmtDate = function (ts) {
    var d = new Date(ts), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '/' + p(d.getMonth() + 1) + '/' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  };
})();

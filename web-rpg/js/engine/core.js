/*
 * 《薇蘿：葉帖紀行》引擎核心
 * 建立全域命名空間 window.VELLORA、資料容器、共用工具與事件匯流排。
 * 本檔不依賴 DOM，可在 node 的 vm 中載入（驗證器會用到）。
 */
(function (root) {
  'use strict';
  var V = root.VELLORA = root.VELLORA || {};
  V.engineVersion = '1.0.0';

  // ---- 資料容器：資料檔以 VELLORA.data.xxx = {...} 註冊 ----
  var COLLECTIONS = ['maps', 'actors', 'dialogues', 'cutscenes', 'quests', 'items',
    'recipes', 'shops', 'encounters', 'folios', 'skills', 'glossary', 'zones', 'tutorials'];
  V.COLLECTIONS = COLLECTIONS;
  V.resetData = function () {
    var d = { meta: {}, start: {}, levels: [] };
    COLLECTIONS.forEach(function (k) { d[k] = {}; });
    V.data = d;
    return d;
  };
  if (!V.data) V.resetData();
  else COLLECTIONS.forEach(function (k) { if (!V.data[k]) V.data[k] = {}; });

  // ---- 工具 ----
  var U = V.util = {};
  U.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  U.hash2 = function (x, y, s) {
    var h = (x * 374761393 + y * 668265263 + (s || 0) * 2147483647) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  U.rng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.rand = Math.random;
  U.randInt = function (a, b) { return a + Math.floor(U.rand() * (b - a + 1)); };
  U.range = function (r) { // r: 數字或 [最小, 最大]
    if (Array.isArray(r)) return U.randInt(r[0], r[1]);
    return r || 0;
  };
  U.weighted = function (list, wkey) {
    var tot = 0, i;
    for (i = 0; i < list.length; i++) tot += (list[i][wkey || 'weight'] || 1);
    var r = U.rand() * tot;
    for (i = 0; i < list.length; i++) {
      r -= (list[i][wkey || 'weight'] || 1);
      if (r < 0) return list[i];
    }
    return list[list.length - 1];
  };
  U.shuffle = function (arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(U.rand() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };
  U.clone = function (o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); };
  U.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  U.toArray = function (v) { return v == null ? [] : (Array.isArray(v) ? v : [v]); };
  U.fmtTime = function (sec) {
    sec = Math.floor(sec || 0);
    var h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
    return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  };
  U.wait = function (ms) {
    return new Promise(function (res) { V.timers.add(ms, res); });
  };

  // 方向
  V.DIRS = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
  };
  V.DIR_LIST = ['down', 'left', 'right', 'up'];
  V.opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };

  // ---- 計時器（遊戲時間；受偵錯加速影響）----
  V.timers = {
    list: [],
    add: function (ms, fn) { this.list.push({ t: ms, fn: fn }); },
    update: function (dtMs) {
      if (!this.list.length) return;
      var keep = [], done = [];
      for (var i = 0; i < this.list.length; i++) {
        var it = this.list[i]; it.t -= dtMs;
        if (it.t <= 0) done.push(it); else keep.push(it);
      }
      this.list = keep;
      for (var j = 0; j < done.length; j++) done[j].fn();
    }
  };

  // ---- 事件匯流排 ----
  var handlers = {};
  V.on = function (evt, fn) { (handlers[evt] = handlers[evt] || []).push(fn); };
  V.off = function (evt, fn) {
    if (!handlers[evt]) return;
    handlers[evt] = handlers[evt].filter(function (f) { return f !== fn; });
  };
  V.emit = function (evt, payload) {
    var hs = handlers[evt]; if (!hs) return;
    hs.slice().forEach(function (fn) {
      try { fn(payload); } catch (e) { if (root.console) console.error(e); }
    });
  };

  // ---- 執行期設定（偵錯加速等）----
  V.runtime = { speed: 1, debug: false, demo: false, dataSet: 'official' };

  // ---- 色板（依 ip-bible/00-visual-language.md）----
  V.PAL = {
    ochre: '#D66A32', indigo: '#172A46', teal: '#2B7D79', glow: '#73D6D0',
    bone: '#D8CCB3', copper: '#98613C', ember: '#292B2C', sulfur: '#A64232',
    ink: '#14121a'
  };

  // ---- 味符 ----
  V.GLYPHS = {
    '鹹': { key: 'salt', color: '#c58a52', ring: '#98613C', desc: '銅鏽、礦物。硫化中毒的前兆。', treat: '燼灰' },
    '苦': { key: 'bitter', color: '#8fc9a3', ring: '#3f7d5f', desc: '薄荷轉苦。防禦訊號失控、狂躁。', treat: '縫苦' },
    '焦': { key: 'burnt', color: '#e07a3f', ring: '#292B2C', desc: '焦糊。管路栓塞。', treat: '靛乳' },
    '澀': { key: 'astringent', color: '#c9b993', ring: '#7d6d55', desc: '乾、緊。乾化、失水。', treat: '池糖液' },
    '腥': { key: 'fishy', color: '#a48ac0', ring: '#4d3f63', desc: '腥濁。汲蟲死亡堵塞。', treat: '清淤（手技）' },
    '甜': { key: 'sweet', color: '#73D6D0', ring: '#2B7D79', desc: '健康的糖流。不是病，不該處置。', treat: '不處置' }
  };
  V.GLYPH_ORDER = ['鹹', '苦', '焦', '澀', '腥', '甜'];

  // 四向度
  V.DIMS = {
    bo: { name: '播', full: '重播' }, fen: { name: '焚', full: '切除' },
    rong: { name: '融', full: '接入' }, lu: { name: '錄', full: '記錄' }
  };
})(typeof window !== 'undefined' ? window : this);

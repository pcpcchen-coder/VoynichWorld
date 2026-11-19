/*
 * 3D 渲染核心與畫質設定。
 *   V.quality：畫質（auto／high／low），存在共用設定 V.save.settings.quality。
 *   V.r3d：WebGLRenderer、尺寸、每幀分派（標題背景／地圖／遭遇診療場景）。
 * 低畫質：關閉陰影、降低解析度與粒子數、關閉動態點光源與霧氣面片。
 */
(function () {
  'use strict';
  var V = window.VELLORA;
  var THREE = window.THREE;

  // ---------------- 畫質 ----------------
  var Q = V.quality = { level: 'high', forced: null, autoDropped: false };
  V.save.settings.quality = 'auto';
  var PRESETS = {
    high: { shadows: true, shadowSize: 2048, pixelRatio: 2, spores: 1, mist: true, lights: 6, aa: true, water: 'fancy', grass: 1 },
    low: { shadows: false, shadowSize: 0, pixelRatio: 1, spores: 0.4, mist: false, lights: 0, aa: false, water: 'simple', grass: 0.45 }
  };
  Q.isMobile = (navigator.maxTouchPoints || 0) > 0 && Math.min(screen.width, screen.height) < 820;
  Q.pick = function () {
    if (Q.forced) return Q.forced;
    var s = V.save.settings.quality || 'auto';
    if (s === 'high' || s === 'low') return s;
    if (Q.autoDropped) return 'low';
    return Q.isMobile ? 'low' : 'high';
  };
  Q.force = function (lv) { if (lv === 'high' || lv === 'low') Q.forced = lv; };
  Q.p = function () { return PRESETS[Q.level]; };
  Q.applySaved = function () { Q.set(Q.pick()); };
  Q.set = function (lv) {
    if (!PRESETS[lv]) lv = 'high';
    var changed = lv !== Q.level;
    Q.level = lv;
    document.body.setAttribute('data-quality', lv);
    if (R.renderer) { R.applyQuality(); if (changed) V.emit('quality', lv); }
  };
  // 自動畫質：高畫質下連續 6 秒低於 24 fps 就降到低畫質（只在設定為「自動」時）
  var slowT = 0;
  Q.watch = function (raw) {
    if (Q.level !== 'high' || Q.forced || (V.save.settings.quality || 'auto') !== 'auto' || !V.runtime.fps) return;
    if (V.runtime.fps < 24) slowT += raw; else slowT = Math.max(0, slowT - raw * 2);
    if (slowT > 6) { slowT = 0; Q.autoDropped = true; Q.set('low'); V.ui.toast('畫面不夠流暢，已自動切換為低畫質（可在設定中改回）。'); }
  };

  // 設定選單加上「畫質」
  var QNAMES = { auto: '自動', high: '高', low: '低' };
  var baseItems = V.menu.settingsItems, baseCycle = V.menu.settingsCycle;
  V.menu.settingsItems = function () {
    var a = baseItems();
    a.unshift({ id: 'quality', label: '畫質', right: QNAMES[V.save.settings.quality || 'auto'] + (Q.forced ? '（網址指定）' : (V.save.settings.quality === 'auto' || !V.save.settings.quality ? '：' + QNAMES[Q.level] : '')) });
    return a;
  };
  V.menu.settingsCycle = function (id) {
    if (id === 'quality') {
      var s = V.save.settings, list = ['auto', 'high', 'low'];
      s.quality = list[(list.indexOf(s.quality || 'auto') + 1) % list.length];
      Q.autoDropped = false;
      V.save.saveSettings(); V.audio.play('confirm');
      Q.set(Q.pick());
      return;
    }
    baseCycle(id);
  };

  // ---------------- 渲染核心 ----------------
  var R = V.r3d = { renderer: null, w: 1, h: 1, time: 0, mode: 'none' };
  R.init = function (canvas) {
    if (!THREE) { V.fatal3d('找不到 3D 函式庫（vendor/three.min.js）。'); return false; }
    Q.level = Q.pick();
    var p = PRESETS[Q.level];
    try {
      R.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: p.aa, powerPreference: 'high-performance', preserveDrawingBuffer: V.runtime.debug || /[?&]debug=1/.test(location.search) });
    } catch (e) {
      V.fatal3d('這個瀏覽器無法建立 WebGL 3D 畫面。\n請改用支援 WebGL 的瀏覽器，或改玩 2D 版（../web-rpg/index.html）。\n\n' + (e && e.message || e));
      return false;
    }
    var r = R.renderer;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.25;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); R.lost = true; }, false);
    canvas.addEventListener('webglcontextrestored', function () { R.lost = false; R.applyQuality(); V.emit('quality', Q.level); }, false);
    R.applyQuality();
    return true;
  };
  R.applyQuality = function () {
    var p = PRESETS[Q.level], r = R.renderer; if (!r) return;
    r.shadowMap.enabled = p.shadows;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, p.pixelRatio) * (Q.level === 'low' && (window.devicePixelRatio || 1) <= 1 ? 0.85 : 1));
    r.setSize(R.w, R.h, false);
  };
  R.resize = function (w, h) {
    R.w = Math.max(1, w); R.h = Math.max(1, h);
    if (R.renderer) R.renderer.setSize(R.w, R.h, false);
    V.emit('resize3d');
  };
  // 每幀：遭遇中畫診療場景；地圖上畫世界；標題畫面畫背景巡景
  R.frame = function (dt, raw) {
    R.time += raw;
    if (!R.renderer || R.lost) return;
    Q.watch(raw);
    if (V.ui.has('battle') && V.battle3d && V.battle3d.active()) { R.mode = 'battle'; V.battle3d.render(dt, raw); return; }
    if (V.scene === 'field' && V.field.map) { R.mode = 'field'; V.field3d.render(dt, raw); return; }
    if (V.scene === 'title' && V.screens3d) { R.mode = 'title'; V.screens3d.renderTitle(dt, raw); return; }
    R.mode = 'clear';
    R.renderer.setClearColor(0x0b0a0e, 1); R.renderer.clear();
  };
})();

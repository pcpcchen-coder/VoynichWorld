/*
 * 3D 版啟動與主迴圈。對應 2D 版的 web-rpg/js/engine/main.js：
 * 依清單載入與 2D 版相同的資料檔（路徑加上 ../web-rpg/ 前綴）→ 初始化 → 標題畫面；
 * 每幀更新輸入、計時器、介面、地圖邏輯（共用 field.js），再交給 3D 呈現層繪製。
 * 資料檔以動態 <script>（async=false）依序插入，file:// 下可用，不需要 fetch 或模組。
 */
(function () {
  'use strict';
  var V = window.VELLORA, U = V.util;
  var DATA_PREFIX = '../web-rpg/';
  var last = 0, hudEl, hudKey = '', padOn = null, fpsAcc = 0, fpsN = 0;
  V.runtime.renderer = '3d';
  V.runtime.fps = 0;

  function params() {
    var o = {}; (location.search || '').replace(/^\?/, '').split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); o[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
    return o;
  }
  function loadScripts(list, done) {
    var i = 0;
    (function next() {
      if (i >= list.length) return done(null);
      var s = document.createElement('script');
      s.src = list[i++]; s.async = false;
      s.onload = next;
      s.onerror = function () { done(new Error('無法載入資料檔：' + s.src)); };
      document.head.appendChild(s);
    })();
  }
  function fatal(msg) {
    var el = document.getElementById('boot'); if (!el) return;
    el.className = 'boot error'; el.innerHTML = '<p>啟動失敗</p><pre></pre>'; el.querySelector('pre').textContent = msg;
  }
  V.fatal3d = fatal;

  function boot() {
    var q = params(), mf = V.dataManifest || {};
    var official = (mf.official || []).map(function (p) { return DATA_PREFIX + p; });
    V.runtime.debug = q.debug === '1';
    if (q.speed) V.runtime.speed = Math.max(0.25, Math.min(16, parseFloat(q.speed) || 1));
    if (q.quality) V.quality.force(q.quality);
    if (!official.length) return fatal('找不到正式資料清單（../web-rpg/js/data/manifest.js）。3D 版需要與 2D 版放在同一個倉庫中。');
    if (!V.r3d.init(document.getElementById('view3d'))) return;
    V.runtime.dataSet = 'official';
    if (V.dataInlined) return start();   // 單檔版（tools/build-single.js）：資料已內嵌
    loadScripts(official, function (err) {
      if (err) return fatal(err.message + '\n3D 版直接讀取 2D 版的資料檔，請確認 web-rpg/ 目錄存在。');
      start();
    });
  }

  function resize() {
    var W = window.innerWidth, H = window.innerHeight;
    V.field.setView(320, 180);   // 2D 鏡頭的邏輯尺寸（3D 版不使用，但共用程式會讀到）
    V.r3d.resize(W, H);
    document.body.classList.toggle('portrait', H > W);
    document.body.classList.toggle('short', H < 500);
  }

  function start() {
    try {
      V.ui.init();
      V.input3d.build(document.getElementById('game'));
      hudEl = document.getElementById('hud');
      V.save.loadSettings();
      V.quality.applySaved();
      resize();
      window.addEventListener('resize', resize);
      window.addEventListener('orientationchange', function () { setTimeout(resize, 200); });
      document.addEventListener('pointerdown', function () { V.audio.unlock(); }, { passive: true });
      if (V.runtime.debug) { V.debugInit(); V.debug3dInit && V.debug3dInit(); }
      V.field3d.install();
      var b = document.getElementById('boot'); if (b) b.parentNode.removeChild(b);
      V.screens.title();
      last = performance.now();
      requestAnimationFrame(frame);
    } catch (e) { fatal(String(e && e.stack || e)); throw e; }
  }

  function updateHud() {
    var s = V.game.s; if (!s) return;
    var show = V.scene === 'field' && !V.ui.has('battle') && !V.ui.has('menu') && !V.ui.has('craft') && !V.ui.has('ending') && !V.ui.has('folio');
    var goal = show && V.save.settings.goal !== 'off' ? V.game.objective() : '';
    var key = show ? [Math.ceil(s.stamina), V.game.maxStamina(), V.game.loadPct(), s.level, goal].join('|') : 'off';
    if (key === hudKey) return;
    hudKey = key;
    hudEl.hidden = !show;
    if (!show) return;
    hudEl.innerHTML = '<span class="hud-lv">Lv ' + s.level + '</span>' +
      '<span class="hud-row"><b>體</b>' + V.ui.bar('hp' + (s.stamina / V.game.maxStamina() < 0.3 ? ' low' : ''), s.stamina, V.game.maxStamina()) + '</span>' +
      '<span class="hud-row"><b>感</b>' + V.ui.bar('load' + (V.game.loadPct() >= 70 ? ' hot' : ''), s.load, V.game.maxLoad()) + '</span>' +
      (goal ? '<span class="hud-goal">▸ ' + U.esc(goal) + '</span>' : '');
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    var real = Math.max(0, (ts - last) / 1000), raw = Math.min(0.05, real); last = ts;
    if (real > 0) { fpsAcc += real; fpsN++; if (fpsAcc >= 1) { V.runtime.fps = Math.round(fpsN / fpsAcc * 10) / 10; V.runtime.frameMs = Math.round(fpsAcc / fpsN * 1000); fpsAcc = 0; fpsN = 0; } }
    var dt = raw * V.runtime.speed;
    V.input.update(raw);
    V.input3d.update(raw);
    V.timers.update(dt * 1000);
    var top = V.ui.top();
    if (top) { if (top.update) top.update(dt); }
    else if (V.scene === 'field') V.field.control(dt);
    if (V.scene === 'field') {
      if (V.game.s) V.game.s.playtime += raw;
      V.field.update(dt);
    }
    try { V.r3d.frame(dt, raw); } catch (e) { console.error(e); }
    updateHud();
    var t2 = V.ui.top();
    var want = V.scene === 'field' && (!t2 || t2.kind === 'dialogue' || t2.kind === 'wait');
    document.body.classList.toggle('panel-open', V.ui.has('menu') || V.ui.has('craft') || V.ui.has('battle'));
    document.body.classList.toggle('in-battle', V.ui.has('battle'));
    if (want !== padOn) { padOn = want; document.body.classList.toggle('pad-on', want); if (!want) { V.input.releaseAll(); V.input3d.release(); } }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

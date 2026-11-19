/*
 * 啟動與主迴圈：依清單載入資料檔 → 初始化 → 標題畫面；每幀更新輸入、計時器、介面、地圖並繪製。
 * 資料檔以動態 <script> 依序插入（file:// 下可用，不需要 fetch 或模組）。
 */
(function () {
  'use strict';
  var V = window.VELLORA, U = V.util;
  var canvas, ctx, viewW = 320, viewH = 180, scale = 2, last = 0, hudEl, hudKey = '', padOn = null;

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

  function boot() {
    var q = params(), mf = V.dataManifest || {};
    var official = mf.official || [], demo = mf.demo || [];
    V.runtime.debug = q.debug === '1';
    if (q.speed) V.runtime.speed = Math.max(0.25, Math.min(16, parseFloat(q.speed) || 1));
    var useDemo = q.demo === '1' || !official.length;
    function loadDemo() {
      V.resetData(); V.runtime.demo = true; V.runtime.dataSet = 'demo';
      loadScripts(demo, function (err) { if (err) return fatal(err.message); start(); });
    }
    if (useDemo) return loadDemo();
    V.runtime.dataSet = 'official';
    loadScripts(official, function (err) {
      if (err) { console.warn(err.message + '；改載入測試房資料。'); return loadDemo(); }
      start();
    });
  }

  function resize() {
    var W = window.innerWidth, H = window.innerHeight;
    scale = Math.max(2, Math.floor(Math.min(W, H) / 160));
    viewW = Math.ceil(W / scale); viewH = Math.ceil(H / scale);
    canvas.width = viewW; canvas.height = viewH;
    canvas.style.width = viewW * scale + 'px'; canvas.style.height = viewH * scale + 'px';
    ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    V.field.setView(viewW, viewH);
    document.body.classList.toggle('portrait', H > W);
    document.body.classList.toggle('short', H < 500);
  }

  function start() {
    try {
      canvas = document.getElementById('view');
      V.ui.init();
      V.input.buildTouch(document.getElementById('game'));
      hudEl = document.getElementById('hud');
      V.save.loadSettings();
      resize();
      window.addEventListener('resize', resize);
      window.addEventListener('orientationchange', function () { setTimeout(resize, 200); });
      document.addEventListener('pointerdown', function () { V.audio.unlock(); }, { passive: true });
      if (V.runtime.debug) V.debugInit();
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
      (goal ? '<span class="hud-goal">▸ ' + V.util.esc(goal) + '</span>' : '');
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    var raw = Math.min(0.05, Math.max(0, (ts - last) / 1000)); last = ts;
    var dt = raw * V.runtime.speed;
    V.input.update(raw);
    V.timers.update(dt * 1000);
    var top = V.ui.top();
    if (top) { if (top.update) top.update(dt); }
    else if (V.scene === 'field') V.field.control(dt);
    if (V.scene === 'field') {
      if (V.game.s) V.game.s.playtime += raw;
      V.field.update(dt);
      if (!V.ui.has('battle')) V.field.render(ctx);
    } else { ctx.fillStyle = '#0b0a0e'; ctx.fillRect(0, 0, viewW, viewH); }
    updateHud();
    // 觸控虛擬鍵：只在地圖（含對話）時顯示
    var t2 = V.ui.top();
    var want = V.scene === 'field' && (!t2 || t2.kind === 'dialogue' || t2.kind === 'wait');
    // 選單／調劑／遭遇開啟時，提示改到下方，避免蓋住標題列的按鈕
    document.body.classList.toggle('panel-open', V.ui.has('menu') || V.ui.has('craft') || V.ui.has('battle'));
    if (want !== padOn) { padOn = want; document.body.classList.toggle('pad-on', want); if (!want) V.input.releaseAll(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

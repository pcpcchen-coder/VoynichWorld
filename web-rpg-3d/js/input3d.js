/*
 * 3D 版的額外輸入：類比移動向量、鏡頭旋轉與縮放。抽象按鍵（confirm／cancel／menu／方向）仍由共用的 input.js 處理。
 *   鍵盤：WASD／方向鍵移動（相對鏡頭）、Q／E 轉鏡頭、R／F 縮放（或滑鼠滾輪）、滑鼠拖曳轉鏡頭
 *   觸控：左下虛擬搖桿、在畫面其他地方拖曳轉鏡頭、雙指縮放、A／B 鈕、右上 ≡
 */
(function () {
  'use strict';
  var V = window.VELLORA, I = V.input;
  var X = V.input3d = { stick: { x: 0, y: 0, on: false }, camDX: 0, camDY: 0, zoom: 0, keysRot: 0 };
  var rotKeys = { KeyQ: -1, KeyE: 1, PageUp: -1, PageDown: 1 }, zoomKeys = { KeyR: -1, KeyF: 1, Equal: -1, Minus: 1 };
  var heldRot = {}, heldZoom = {};
  window.addEventListener('keydown', function (e) {
    if (rotKeys[e.code]) { heldRot[e.code] = rotKeys[e.code]; e.preventDefault(); }
    if (zoomKeys[e.code]) { heldZoom[e.code] = zoomKeys[e.code]; e.preventDefault(); }
  });
  window.addEventListener('keyup', function (e) { delete heldRot[e.code]; delete heldZoom[e.code]; });
  window.addEventListener('blur', function () { heldRot = {}; heldZoom = {}; });

  // 地圖上可以操作鏡頭（遭遇、選單等介面開啟時不行）
  function camAllowed() { return V.scene === 'field' && !V.ui.has('battle') && !V.ui.has('menu') && !V.ui.has('craft') && !V.ui.has('folio') && !V.ui.has('ending'); }

  X.build = function (root) {
    var canvas = document.getElementById('view3d');
    // 滑鼠拖曳／觸控拖曳畫面＝轉鏡頭
    var drag = null, pinch = null, touches = {};
    canvas.addEventListener('pointerdown', function (e) {
      touches[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(touches);
      if (ids.length === 2) { var a = touches[ids[0]], b = touches[ids[1]]; pinch = Math.hypot(a.x - b.x, a.y - b.y); drag = null; return; }
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* 忽略 */ }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (touches[e.pointerId]) { touches[e.pointerId].x = e.clientX; touches[e.pointerId].y = e.clientY; }
      var ids = Object.keys(touches);
      if (pinch && ids.length === 2) {
        var a = touches[ids[0]], b = touches[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (camAllowed()) X.zoom += (pinch - d) * 0.02; pinch = d; return;
      }
      if (!drag || drag.id !== e.pointerId) return;
      if (camAllowed()) { X.camDX += (e.clientX - drag.x); X.camDY += (e.clientY - drag.y); }
      drag.x = e.clientX; drag.y = e.clientY;
    });
    function end(e) { delete touches[e.pointerId]; if (drag && drag.id === e.pointerId) drag = null; if (Object.keys(touches).length < 2) pinch = null; }
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('wheel', function (e) { if (camAllowed()) { X.zoom += e.deltaY * 0.004; e.preventDefault(); } }, { passive: false });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    // 觸控：沿用 2D 版的 .touchpad 容器與顯示規則，內容換成類比搖桿＋A／B
    var pad = document.createElement('div');
    pad.className = 'touchpad tp3d';
    pad.innerHTML = '<div class="tp-stick" aria-label="移動搖桿"><span class="tp-knob"></span></div>' +
      '<div class="tp-ab"><button class="tp-btn tp-b" data-act="cancel" aria-label="B 取消">B</button>' +
      '<button class="tp-btn tp-a" data-act="confirm" aria-label="A 確認">A</button></div>';
    root.appendChild(pad);
    var menuBtn = document.createElement('button');
    menuBtn.className = 'tp-menu'; menuBtn.setAttribute('aria-label', '選單'); menuBtn.textContent = '≡';
    root.appendChild(menuBtn);
    var stickEl = pad.querySelector('.tp-stick'), knob = pad.querySelector('.tp-knob'), pid = null;
    function setStick(e) {
      var r = stickEl.getBoundingClientRect(), R = r.width / 2;
      var dx = (e.clientX - (r.left + R)) / R, dy = (e.clientY - (r.top + R)) / R, m = Math.hypot(dx, dy);
      if (m > 1) { dx /= m; dy /= m; m = 1; }
      if (m < 0.12) { dx = 0; dy = 0; }
      X.stick.x = dx; X.stick.y = dy; X.stick.on = true;
      knob.style.transform = 'translate(' + (dx * R * 0.55) + 'px,' + (dy * R * 0.55) + 'px)';
      // 選單內的方向導覽：搖桿推到底也當方向鍵
      var dir = m > 0.6 ? (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')) : null;
      if (dir !== X._dir) { if (X._dir) I.setHeld(X._dir, false); X._dir = dir; if (dir) I.setHeld(dir, true); }
    }
    stickEl.addEventListener('pointerdown', function (e) {
      e.preventDefault(); V.audio && V.audio.unlock(); pid = e.pointerId;
      try { stickEl.setPointerCapture(pid); } catch (er) { /* 忽略 */ }
      setStick(e);
    });
    stickEl.addEventListener('pointermove', function (e) { if (e.pointerId === pid) setStick(e); });
    function sEnd(e) { if (e.pointerId !== pid) return; pid = null; X.release(); }
    stickEl.addEventListener('pointerup', sEnd); stickEl.addEventListener('pointercancel', sEnd); stickEl.addEventListener('lostpointercapture', sEnd);
    X.release = function () { X.stick.x = X.stick.y = 0; X.stick.on = false; knob.style.transform = ''; if (X._dir) { I.setHeld(X._dir, false); X._dir = null; } };
    Array.prototype.forEach.call(pad.querySelectorAll('.tp-btn'), function (b) {
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault(); V.audio && V.audio.unlock();
        b.classList.add('down'); I.press(b.getAttribute('data-act'));
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { b.addEventListener(ev, function () { b.classList.remove('down'); }); });
    });
    menuBtn.addEventListener('pointerdown', function (e) { e.preventDefault(); V.audio && V.audio.unlock(); I.press('menu'); });
    pad.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  };
  X.release = function () {};

  X.update = function (dt) {
    var r = 0, z = 0, k;
    for (k in heldRot) r += heldRot[k];
    for (k in heldZoom) z += heldZoom[k];
    X.keysRot = r;
    if (z) X.zoom += z * dt * 3;
  };
  // 取出本幀累積的鏡頭拖曳量
  X.takeCam = function () { var o = { dx: X.camDX, dy: X.camDY, zoom: X.zoom }; X.camDX = X.camDY = X.zoom = 0; return o; };
  // 移動向量（螢幕座標：x 右、y 下），鍵盤或搖桿
  X.moveVec = function () {
    if (X.stick.on && (X.stick.x || X.stick.y)) return { x: X.stick.x, y: X.stick.y, analog: true };
    var x = (I.held('right') ? 1 : 0) - (I.held('left') ? 1 : 0), y = (I.held('down') ? 1 : 0) - (I.held('up') ? 1 : 0);
    if (!x && !y) return null;
    var m = Math.hypot(x, y); return { x: x / m, y: y / m };
  };
})();

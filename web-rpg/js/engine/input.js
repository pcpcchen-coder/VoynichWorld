/*
 * 輸入：鍵盤＋觸控虛擬鍵，統一成抽象按鍵。
 *   方向：up / down / left / right（可持續按住）
 *   確認：confirm（Z、Enter、空白、A 鈕）
 *   取消：cancel（X、Esc、Backspace、B 鈕）— 在地圖上同時是「開選單」
 *   選單：menu（Esc、M、觸控 ≡ 鈕）
 * 每幀由主迴圈呼叫 update()；其他模組以 pressed()/held()/nav() 讀取。
 */
(function () {
  'use strict';
  var V = window.VELLORA;
  var I = V.input = {};
  var held = {}, queue = [], frame = {}, repeatT = {}, lastDevice = 'keyboard';
  var KEYMAP = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    KeyZ: 'confirm', Enter: 'confirm', Space: 'confirm', NumpadEnter: 'confirm',
    KeyX: 'cancel', Backspace: 'cancel', Escape: 'menu', KeyM: 'menu'
  };
  var DIRS = ['up', 'down', 'left', 'right'];

  function press(name) { queue.push(name); }
  I.press = press;
  I.setHeld = function (name, on) {
    if (on && !held[name]) { held[name] = true; press(name); repeatT[name] = 0; }
    else if (!on && held[name]) { held[name] = false; }
  };
  I.releaseAll = function () { held = {}; };

  window.addEventListener('keydown', function (e) {
    var a = KEYMAP[e.code] || KEYMAP[e.key];
    if (!a) return;
    lastDevice = 'keyboard';
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') && a !== 'menu') return;
    e.preventDefault();
    V.audio && V.audio.unlock();
    if (DIRS.indexOf(a) >= 0) { if (!held[a]) { held[a] = true; repeatT[a] = 0; press(a); } return; }
    if (e.repeat) return;
    // Esc 同時代表 cancel（選單內返回）與 menu（地圖上開選單）
    if (a === 'menu') { press('cancel'); press('menu'); return; }
    press(a);
  });
  window.addEventListener('keyup', function (e) {
    var a = KEYMAP[e.code] || KEYMAP[e.key];
    if (a && DIRS.indexOf(a) >= 0) held[a] = false;
  });
  window.addEventListener('blur', function () { held = {}; });

  I.update = function (dt) {
    frame = {};
    for (var i = 0; i < queue.length; i++) frame[queue[i]] = true;
    queue = [];
    // 選單用的方向自動連發
    DIRS.forEach(function (d) {
      if (!held[d]) { repeatT[d] = 0; return; }
      repeatT[d] += dt;
      if (repeatT[d] > 0.32) { frame['nav_' + d] = true; repeatT[d] = 0.24; }
    });
  };
  I.pressed = function (name) { return !!frame[name]; };
  I.consume = function (name) { var v = !!frame[name]; frame[name] = false; return v; };
  I.held = function (name) { return !!held[name]; };
  // 選單導覽：按下或連發
  I.nav = function (d) { return !!(frame[d] || frame['nav_' + d]); };
  I.heldDir = function () {
    // 最後按下優先：簡化為固定優先序
    for (var i = 0; i < DIRS.length; i++) if (held[DIRS[i]]) return DIRS[i];
    return null;
  };
  I.clearFrame = function () { frame = {}; queue = []; };
  I.device = function () { return lastDevice; };

  // ======================= 觸控虛擬鍵 =======================
  I.isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
  I.buildTouch = function (rootEl) {
    var pad = document.createElement('div');
    pad.className = 'touchpad';
    pad.innerHTML =
      '<div class="tp-dpad" aria-label="方向鍵"><span class="tp-d up"></span><span class="tp-d left"></span>' +
      '<span class="tp-d right"></span><span class="tp-d down"></span><span class="tp-hub"></span></div>' +
      '<div class="tp-ab"><button class="tp-btn tp-b" data-act="cancel" aria-label="B 取消">B</button>' +
      '<button class="tp-btn tp-a" data-act="confirm" aria-label="A 確認">A</button></div>';
    rootEl.appendChild(pad);
    var menuBtn = document.createElement('button');
    menuBtn.className = 'tp-menu'; menuBtn.setAttribute('aria-label', '選單'); menuBtn.textContent = '≡';
    rootEl.appendChild(menuBtn);

    var dpad = pad.querySelector('.tp-dpad'), cur = null, pid = null;
    function setDir(d) {
      if (d === cur) return;
      if (cur) I.setHeld(cur, false);
      cur = d;
      if (d) I.setHeld(d, true);
      dpad.setAttribute('data-dir', d || '');
    }
    function dirFrom(e) {
      var r = dpad.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      if (Math.abs(dx) < r.width * 0.12 && Math.abs(dy) < r.height * 0.12) return cur;
      return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    }
    dpad.addEventListener('pointerdown', function (e) {
      e.preventDefault(); lastDevice = 'touch'; V.audio && V.audio.unlock();
      pid = e.pointerId; try { dpad.setPointerCapture(pid); } catch (er) { /* 忽略 */ }
      setDir(dirFrom(e));
    });
    dpad.addEventListener('pointermove', function (e) { if (e.pointerId === pid) setDir(dirFrom(e)); });
    function end(e) { if (e.pointerId === pid) { pid = null; setDir(null); } }
    dpad.addEventListener('pointerup', end); dpad.addEventListener('pointercancel', end);
    dpad.addEventListener('lostpointercapture', end);
    Array.prototype.forEach.call(pad.querySelectorAll('.tp-btn'), function (b) {
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault(); lastDevice = 'touch'; V.audio && V.audio.unlock();
        b.classList.add('down'); press(b.getAttribute('data-act'));
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { b.addEventListener(ev, function () { b.classList.remove('down'); }); });
    });
    menuBtn.addEventListener('pointerdown', function (e) { e.preventDefault(); lastDevice = 'touch'; V.audio && V.audio.unlock(); press('menu'); });
    // 防止長按選字與捲動
    pad.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    return pad;
  };
})();

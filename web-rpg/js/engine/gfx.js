/*
 * 程式繪製的像素畫：圖塊、物件、物品圖示、紙紋材質。
 * 所有圖像在啟動時（或載入地圖時）畫到離屏 canvas，不依賴二進位圖檔。
 */
(function () {
  'use strict';
  var V = window.VELLORA, U = V.util;
  var G = V.gfx = {};
  var TS = G.TS = 16;

  G.canvas = function (w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
    return c;
  };

  // ---- 基本像素筆 ----
  function P(ctx, x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
  function Rr(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  G.px = P; G.rect = Rr;
  function disc(ctx, cx, cy, r, c) {
    ctx.fillStyle = c;
    for (var y = -r; y <= r; y++) for (var x = -r; x <= r; x++)
      if (x * x + y * y <= r * r + r * 0.6) ctx.fillRect(cx + x, cy + y, 1, 1);
  }
  G.disc = disc;
  function speckle(ctx, ox, oy, seed, n, colors, w, h) {
    var rnd = U.rng(seed);
    for (var i = 0; i < n; i++) P(ctx, ox + Math.floor(rnd() * (w || TS)), oy + Math.floor(rnd() * (h || TS)), colors[Math.floor(rnd() * colors.length)]);
  }

  // ---- 色彩 ----
  var C = G.C = {
    soil: '#5b3a2c', soilD: '#45291f', soilL: '#6e4734', seep: '#2B7D79', glow: '#73D6D0',
    path: '#8a6244', pathL: '#9e7452', pathD: '#704e37',
    moss: '#24486a', mossL: '#3a6a90', mossD: '#17304a',
    sh: '#2d847f', shL: '#3f9c94', shD: '#236d6a', foam: '#a7ddd3',
    deep: '#163b57', deepL: '#1f4c6b', deepD: '#102c44',
    bone: '#D8CCB3', boneD: '#b3a688', boneL: '#ebe1cc',
    plat: '#a88a68', platL: '#c0a17c', platD: '#8a6d53',
    rock: '#5a4f4c', rockL: '#7b6d66', rockD: '#3a3231',
    cop: '#98613C', copD: '#6e4229', copL: '#b67c50',
    ind: '#172A46', indL: '#26446b', indM: '#1e3657', indH: '#3c6590',
    crk: '#6b5a4e', crkD: '#3f332c', crkL: '#816e60',
    sul: '#A64232', sulY: '#c9a24a',
    cav: '#2a2632', cavL: '#363042', cavD: '#1d1a24', wallTop: '#120f17', wallF: '#28202f',
    flr: '#755236', flrD: '#5f4129', flrL: '#8a6443',
    iwall: '#4a3832', iwallD: '#33261f', trim: '#c9bc9f',
    ember: '#292B2C', ink: '#14121a'
  };

  // ======================= 圖塊靜態繪製 =======================
  // nb(dx,dy) 回傳鄰格 ground 字元；ob(dx,dy) 回傳鄰格 object 字元
  var groundDraw = {};
  function isWaterCh(ch) { return ch === '~' || ch === 'W' || ch === 's'; }
  function soilBase(ctx, ox, oy, seed) {
    Rr(ctx, ox, oy, TS, TS, C.soil);
    var rnd = U.rng(seed);
    for (var i = 0; i < 9; i++) {
      var x = ox + Math.floor(rnd() * 15), y = oy + Math.floor(rnd() * 15);
      P(ctx, x, y, C.soilD); if (rnd() < 0.5) P(ctx, x + 1, y, C.soilD);
      P(ctx, x, y - 1 < oy ? y : y - 1, C.soilL);
    }
    if (rnd() < 0.22) { var sx = ox + 2 + Math.floor(rnd() * 11), sy = oy + 2 + Math.floor(rnd() * 11); P(ctx, sx, sy, C.seep); P(ctx, sx, sy + 1, C.seep); if (rnd() < 0.4) P(ctx, sx + 1, sy + 1, C.glow); }
  }
  groundDraw['.'] = function (ctx, ox, oy, s) { soilBase(ctx, ox, oy, s); };
  groundDraw[','] = function (ctx, ox, oy, s, nb) {
    Rr(ctx, ox, oy, TS, TS, C.path);
    speckle(ctx, ox, oy, s, 14, [C.pathL, C.pathD, C.pathL]);
    var pathy = function (c) { return c === ',' || c === '=' || c === 'D' || c === '>'; };
    var rnd = U.rng(s + 7);
    // 邊緣與活土交融
    [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]].forEach(function (d) {
      var c = nb(d[1], d[2]);
      if (pathy(c) || c === null) return;
      var col = c === '"' || c === '.' || c === 'x' || c === ';' ? (c === ';' ? C.moss : (c === 'x' ? C.crk : C.soil)) : C.pathD;
      for (var i = 0; i < TS; i++) {
        var depth = 1 + Math.floor(rnd() * 2.4);
        for (var k = 0; k < depth; k++) {
          if (d[0] === 'up') P(ctx, ox + i, oy + k, col);
          if (d[0] === 'down') P(ctx, ox + i, oy + TS - 1 - k, col);
          if (d[0] === 'left') P(ctx, ox + k, oy + i, col);
          if (d[0] === 'right') P(ctx, ox + TS - 1 - k, oy + i, col);
        }
      }
    });
  };
  groundDraw[';'] = function (ctx, ox, oy, s, nb) {
    soilBase(ctx, ox, oy, s);
    var rnd = U.rng(s);
    // 靛苔：一叢一叢的圓塊，邊緣不鋪滿，讓活土從縫裡露出來（與相鄰苔地相接處鋪滿）
    var full = function (dx, dy) { return nb && nb(dx, dy) === ';'; };
    for (var yy = 0; yy < TS; yy++) for (var xx = 0; xx < TS; xx++) {
      var e = Math.min(full(-1, 0) ? 9 : xx, full(1, 0) ? 9 : TS - 1 - xx, full(0, -1) ? 9 : yy, full(0, 1) ? 9 : TS - 1 - yy);
      if (e >= 3 || (e >= 1 && rnd() < 0.45 + e * 0.15)) P(ctx, ox + xx, oy + yy, C.moss);
    }
    for (var i = 0; i < 10; i++) {
      var x = ox + Math.floor(rnd() * 15), y = oy + 1 + Math.floor(rnd() * 14);
      P(ctx, x, y, C.mossL); P(ctx, x, y - 1, C.mossD);
    }
    if (rnd() < 0.3) P(ctx, ox + Math.floor(rnd() * 16), oy + Math.floor(rnd() * 16), C.glow);
  };
  function waterEdges(ctx, ox, oy, nb, s, deep) {
    var rnd = U.rng(s + 3);
    var land = function (c) { return c !== null && !isWaterCh(c) && c !== '='; };
    var shore = C.foam;
    var dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    dirs.forEach(function (d, di) {
      var c = nb(d[0], d[1]);
      if (deep && c === '~') {
        // 深淺交界：淺色帶
        for (var i = 0; i < TS; i++) {
          var dep = 2 + Math.floor(rnd() * 2);
          for (var k = 0; k < dep; k++) {
            var x = di === 2 ? k : di === 3 ? TS - 1 - k : i, y = di === 0 ? k : di === 1 ? TS - 1 - k : i;
            P(ctx, ox + x, oy + y, k === dep - 1 ? C.deepL : C.shD);
          }
        }
        return;
      }
      if (!land(c)) return;
      for (var j = 0; j < TS; j++) {
        var dd = 1 + (rnd() < 0.4 ? 1 : 0);
        for (var q = 0; q < dd + 1; q++) {
          var xx = di === 2 ? q : di === 3 ? TS - 1 - q : j, yy = di === 0 ? q : di === 1 ? TS - 1 - q : j;
          P(ctx, ox + xx, oy + yy, q < dd ? (di === 0 ? C.soilD : C.platD) : shore);
        }
      }
    });
  }
  groundDraw['~'] = function (ctx, ox, oy, s, nb) {
    Rr(ctx, ox, oy, TS, TS, C.sh);
    var rnd = U.rng(s);
    for (var i = 0; i < 5; i++) { var x = ox + Math.floor(rnd() * 13), y = oy + Math.floor(rnd() * 15); Rr(ctx, x, y, 3, 1, C.shL); }
    for (var j = 0; j < 4; j++) P(ctx, ox + Math.floor(rnd() * 16), oy + Math.floor(rnd() * 16), C.shD);
    waterEdges(ctx, ox, oy, nb, s, false);
  };
  groundDraw['W'] = function (ctx, ox, oy, s, nb) {
    Rr(ctx, ox, oy, TS, TS, C.deep);
    var rnd = U.rng(s);
    for (var i = 0; i < 4; i++) { var x = ox + Math.floor(rnd() * 12), y = oy + Math.floor(rnd() * 15); Rr(ctx, x, y, 4, 1, C.deepL); }
    for (var j = 0; j < 5; j++) P(ctx, ox + Math.floor(rnd() * 16), oy + Math.floor(rnd() * 16), C.deepD);
    waterEdges(ctx, ox, oy, nb, s, true);
  };
  groundDraw['s'] = function (ctx, ox, oy, s, nb) {
    // 溫泉池階：骨白礦物邊緣＋暖青水
    Rr(ctx, ox, oy, TS, TS, '#3e9f96');
    var rnd = U.rng(s);
    for (var i = 0; i < 4; i++) Rr(ctx, ox + Math.floor(rnd() * 12), oy + Math.floor(rnd() * 13), 3, 1, '#5fbcb0');
    var up = nb(0, -1), dn = nb(0, 1), lf = nb(-1, 0), rt = nb(1, 0);
    var rim = function (c) { return c !== 's'; };
    if (rim(dn)) { Rr(ctx, ox, oy + 13, TS, 3, C.bone); Rr(ctx, ox, oy + 12, TS, 1, C.boneL); for (var k = 0; k < TS; k += 3) P(ctx, ox + k, oy + 15, C.boneD); }
    if (rim(up)) { Rr(ctx, ox, oy, TS, 2, C.boneD); Rr(ctx, ox, oy + 2, TS, 1, '#2e8279'); }
    if (rim(lf)) { Rr(ctx, ox, oy, 2, TS, C.bone); }
    if (rim(rt)) { Rr(ctx, ox + 14, oy, 2, TS, C.boneD); }
    // 鈣華小階紋
    if (U.hash2(s, 2) < 0.5) { Rr(ctx, ox + 3, oy + 7, 10, 1, '#7fcfc2'); }
  };
  groundDraw['^'] = function (ctx, ox, oy, s, nb) {
    Rr(ctx, ox, oy, TS, TS, C.plat);
    var rnd = U.rng(s);
    for (var i = 0; i < 10; i++) P(ctx, ox + Math.floor(rnd() * 16), oy + Math.floor(rnd() * 16), rnd() < 0.5 ? C.platL : C.platD);
    // 裂紋
    var cx = ox + 2 + Math.floor(rnd() * 10), cy = oy + 3 + Math.floor(rnd() * 8);
    for (var k = 0; k < 5; k++) { P(ctx, cx + k, cy + (k % 2), C.platD); }
    if (rnd() < 0.25) { var qx = ox + 3 + Math.floor(rnd() * 9), qy = oy + 3 + Math.floor(rnd() * 9); P(ctx, qx, qy, '#5fb3a9'); P(ctx, qx + 1, qy - 1, '#9ee0d6'); P(ctx, qx + 1, qy, '#5fb3a9'); }
    // 台地邊緣（下方不是台地時畫崖面）
    var dn = nb(0, 1);
    if (dn !== null && dn !== '^' && dn !== 'R' && dn !== '>') {
      Rr(ctx, ox, oy + 12, TS, 4, C.platD); Rr(ctx, ox, oy + 12, TS, 1, C.platL);
      for (var j = 0; j < TS; j += 4) Rr(ctx, ox + j, oy + 13, 1, 3, '#6d5642');
    }
  };
  groundDraw['R'] = function (ctx, ox, oy, s, nb) {
    var base = nb(0, 1) === '^' || nb(0, -1) === '^' ? C.plat : C.soil;
    Rr(ctx, ox, oy, TS, TS, base);
    var rnd = U.rng(s);
    // 塊狀岩
    Rr(ctx, ox + 1, oy + 3, 14, 12, C.rockD);
    Rr(ctx, ox + 2, oy + 2, 12, 12, C.rock);
    Rr(ctx, ox + 3, oy + 2, 9, 3, C.rockL);
    Rr(ctx, ox + 2, oy + 13, 12, 1, C.rockD);
    for (var i = 0; i < 5; i++) P(ctx, ox + 3 + Math.floor(rnd() * 10), oy + 5 + Math.floor(rnd() * 7), C.rockD);
    if (rnd() < 0.5) { P(ctx, ox + 5 + Math.floor(rnd() * 6), oy + 9, '#5fb3a9'); }
    // 與相鄰岩相連
    if (nb(1, 0) === 'R') Rr(ctx, ox + 13, oy + 3, 3, 11, C.rock);
    if (nb(-1, 0) === 'R') Rr(ctx, ox, oy + 3, 3, 11, C.rock);
    if (nb(0, 1) === 'R') Rr(ctx, ox + 2, oy + 12, 12, 4, C.rock);
    if (nb(0, -1) === 'R') Rr(ctx, ox + 2, oy, 12, 3, C.rock);
  };
  groundDraw['='] = function (ctx, ox, oy, s, nb) {
    var horiz = nb(-1, 0) === '=' || nb(1, 0) === '=' || (!isWaterCh(nb(-1, 0)) && nb(-1, 0) !== null && isWaterCh(nb(0, -1)));
    // 底下的水
    Rr(ctx, ox, oy, TS, TS, C.deepD);
    var rnd = U.rng(s);
    var strands = [C.cop, C.copD, C.copL, C.cop];
    if (horiz) {
      Rr(ctx, ox, oy + 2, TS, 12, C.copD);
      for (var y = 3; y < 13; y += 2) {
        var col = strands[(y + (s * 7 | 0)) % 4];
        for (var x = 0; x < TS; x++) P(ctx, ox + x, oy + y + ((x + y) % 5 === 0 ? 1 : 0), col);
      }
      Rr(ctx, ox, oy + 2, TS, 1, C.copL); Rr(ctx, ox, oy + 13, TS, 1, '#4a2b1b');
      for (var i = 0; i < 3; i++) P(ctx, ox + Math.floor(rnd() * 16), oy + 4 + Math.floor(rnd() * 8), '#4aa9a0');
    } else {
      Rr(ctx, ox + 2, oy, 12, TS, C.copD);
      for (var xx = 3; xx < 13; xx += 2) {
        var col2 = strands[(xx + (s * 7 | 0)) % 4];
        for (var yy = 0; yy < TS; yy++) P(ctx, ox + xx + ((xx + yy) % 5 === 0 ? 1 : 0), oy + yy, col2);
      }
      Rr(ctx, ox + 2, oy, 1, TS, C.copL); Rr(ctx, ox + 13, oy, 1, TS, '#4a2b1b');
      for (var j = 0; j < 3; j++) P(ctx, ox + 4 + Math.floor(rnd() * 8), oy + Math.floor(rnd() * 16), '#4aa9a0');
    }
  };
  groundDraw['"'] = function (ctx, ox, oy, s) {
    soilBase(ctx, ox, oy, s);
    var rnd = U.rng(s + 11);
    for (var i = 0; i < 12; i++) {
      var x = ox + Math.floor(rnd() * 15), h = 4 + Math.floor(rnd() * 6), y0 = oy + 6 + Math.floor(rnd() * 10);
      var col = [C.indL, C.indM, C.indH][Math.floor(rnd() * 3)];
      for (var k = 0; k < h; k++) P(ctx, x + (k > h - 3 && rnd() < 0.5 ? 1 : 0), Math.max(oy, y0 - k), col);
      if (rnd() < 0.12) P(ctx, x, Math.max(oy, y0 - h), C.glow);
    }
  };
  groundDraw['x'] = function (ctx, ox, oy, s) {
    Rr(ctx, ox, oy, TS, TS, C.crk);
    var rnd = U.rng(s);
    for (var i = 0; i < 8; i++) P(ctx, ox + Math.floor(rnd() * 16), oy + Math.floor(rnd() * 16), C.crkL);
    // 龜裂網
    var x = ox + Math.floor(rnd() * 6), y = oy + Math.floor(rnd() * 16);
    for (var k = 0; k < 18; k++) {
      P(ctx, x, y, C.crkD);
      x += rnd() < 0.6 ? 1 : 0; y += rnd() < 0.5 ? (rnd() < 0.5 ? 1 : -1) : 0;
      if (x >= ox + TS) break; if (y < oy) y = oy; if (y >= oy + TS) y = oy + TS - 1;
    }
    var x2 = ox + Math.floor(rnd() * 16), y2 = oy;
    for (var j = 0; j < 14; j++) { P(ctx, x2, y2, C.crkD); y2++; x2 += rnd() < 0.3 ? (rnd() < 0.5 ? 1 : -1) : 0; if (x2 < ox) x2 = ox; if (x2 >= ox + TS) x2 = ox + TS - 1; }
  };
  groundDraw['!'] = function (ctx, ox, oy, s) {
    groundDraw['x'](ctx, ox, oy, s);
    disc(ctx, ox + 8, oy + 9, 5, '#3a2a22');
    disc(ctx, ox + 8, oy + 9, 3, '#5b2c22');
    disc(ctx, ox + 8, oy + 9, 1, C.sul);
    P(ctx, ox + 4, oy + 5, C.sulY); P(ctx, ox + 12, oy + 6, C.sulY); P(ctx, ox + 11, oy + 13, C.sulY); P(ctx, ox + 5, oy + 12, '#b08a3c');
  };
  groundDraw['_'] = function (ctx, ox, oy, s) {
    Rr(ctx, ox, oy, TS, TS, C.cav);
    var rnd = U.rng(s);
    for (var i = 0; i < 9; i++) P(ctx, ox + Math.floor(rnd() * 16), oy + Math.floor(rnd() * 16), rnd() < 0.5 ? C.cavL : C.cavD);
    if (rnd() < 0.4) { // 苔脈
      var x = ox + Math.floor(rnd() * 16), y = oy + Math.floor(rnd() * 16);
      for (var k = 0; k < 6; k++) { P(ctx, x, y, '#1f4f55'); x += rnd() < 0.5 ? 1 : -1; y += 1; if (y >= oy + TS) break; if (x < ox || x >= ox + TS) break; }
    }
    if (rnd() < 0.15) P(ctx, ox + Math.floor(rnd() * 16), oy + Math.floor(rnd() * 16), C.glow);
  };
  groundDraw['#'] = function (ctx, ox, oy, s, nb) {
    Rr(ctx, ox, oy, TS, TS, C.wallTop);
    var rnd = U.rng(s);
    for (var i = 0; i < 6; i++) P(ctx, ox + Math.floor(rnd() * 16), oy + Math.floor(rnd() * 16), '#1c1822');
    var dn = nb(0, 1);
    if (dn !== null && dn !== '#' && dn !== '0') {
      // 牆面（朝向玩家）
      Rr(ctx, ox, oy + 4, TS, 12, C.wallF);
      Rr(ctx, ox, oy + 4, TS, 1, '#3a2f42');
      for (var k = 0; k < 3; k++) { // 導管根
        var rx = ox + 2 + Math.floor(rnd() * 12);
        for (var y = oy + 5; y < oy + 16; y++) { P(ctx, rx, y, C.copD); if (rnd() < 0.3) rx += rnd() < 0.5 ? 1 : -1; rx = U.clamp(rx, ox, ox + 15); }
      }
      if (rnd() < 0.5) { var gx = ox + 3 + Math.floor(rnd() * 10); P(ctx, gx, oy + 9, C.glow); P(ctx, gx, oy + 10, '#3f9c94'); }
      Rr(ctx, ox, oy + 15, TS, 1, '#120f17');
    }
    // 側邊鄰接地面時的邊
    if (nb(-1, 0) === '_') Rr(ctx, ox, oy, 1, TS, '#2f2738');
    if (nb(1, 0) === '_') Rr(ctx, ox + 15, oy, 1, TS, '#2f2738');
  };
  groundDraw[':'] = function (ctx, ox, oy, s) {
    Rr(ctx, ox, oy, TS, TS, C.flr);
    for (var y = 0; y < TS; y += 4) { Rr(ctx, ox, oy + y, TS, 1, C.flrD); }
    var rnd = U.rng(s);
    for (var i = 0; i < 6; i++) P(ctx, ox + Math.floor(rnd() * 16), oy + 1 + Math.floor(rnd() * 15), C.flrL);
    var off = (Math.floor(s * 997) % 2) * 8;
    for (var yy = 0; yy < TS; yy += 4) P(ctx, ox + ((off + yy * 2) % 16), oy + yy + 1, C.flrD);
  };
  groundDraw['|'] = function (ctx, ox, oy, s, nb) {
    var dn = nb(0, 1);
    if (dn === ':' || dn === 'D' || dn === '>') {
      Rr(ctx, ox, oy, TS, TS, C.iwall);
      for (var x = 1; x < TS; x += 4) Rr(ctx, ox + x, oy + 2, 1, 12, C.iwallD);
      Rr(ctx, ox, oy, TS, 2, '#2a1f1a');
      Rr(ctx, ox, oy + 12, TS, 2, C.trim); Rr(ctx, ox, oy + 14, TS, 2, '#7d6e55');
      if (U.hash2(s, 9) < 0.25) { disc(ctx, ox + 8, oy + 6, 3, '#2B7D79'); disc(ctx, ox + 8, oy + 6, 2, '#73D6D0'); Rr(ctx, ox + 8, oy + 3, 1, 7, '#2B7D79'); Rr(ctx, ox + 5, oy + 6, 7, 1, '#2B7D79'); }
    } else {
      Rr(ctx, ox, oy, TS, TS, '#2a1f1a');
      Rr(ctx, ox + 1, oy + 1, 14, 14, '#33261f');
    }
  };
  groundDraw['H'] = function (ctx, ox, oy, s, nb) {
    var dn = nb(0, 1), up = nb(0, -1);
    var rnd = U.rng(s);
    if (dn === 'H') {
      // 屋頂：活體葉蓋
      Rr(ctx, ox, oy, TS, TS, '#1e3657');
      for (var i = 0; i < 20; i++) { var x = ox + Math.floor(rnd() * 16), y = oy + Math.floor(rnd() * 16); P(ctx, x, y, rnd() < 0.5 ? '#2a4a72' : '#142540'); }
      for (var r = 2; r < TS; r += 5) for (var k = 0; k < TS; k++) if ((k + r) % 3) P(ctx, ox + k, oy + r, '#26446b');
      if (up !== 'H') { Rr(ctx, ox, oy, TS, 2, '#3c6590'); P(ctx, ox + 4, oy, C.glow); }
      if (nb(-1, 0) !== 'H') Rr(ctx, ox, oy, 1, TS, '#0f1b2e');
      if (nb(1, 0) !== 'H') Rr(ctx, ox + 15, oy, 1, TS, '#0f1b2e');
      if (nb(0, 2) !== 'H') { Rr(ctx, ox, oy + 13, TS, 3, '#0f1b2e'); for (var e = 0; e < TS; e += 2) P(ctx, ox + e, oy + 15, '#3c6590'); }
    } else {
      // 牆面：骨白膜壁＋管路銅肋
      Rr(ctx, ox, oy, TS, TS, '#cbbd9e');
      for (var j = 0; j < 8; j++) P(ctx, ox + Math.floor(rnd() * 16), oy + Math.floor(rnd() * 16), '#b5a687');
      Rr(ctx, ox, oy, TS, 1, '#8f8065');
      if (nb(-1, 0) !== 'H' && nb(-1, 0) !== 'D') Rr(ctx, ox, oy, 2, TS, C.cop);
      if (nb(1, 0) !== 'H' && nb(1, 0) !== 'D') Rr(ctx, ox + 14, oy, 2, TS, C.copD);
      Rr(ctx, ox, oy + 14, TS, 2, '#6d5a44');
      if (U.hash2(s, 5) < 0.45 && nb(-1, 0) === 'H' && nb(1, 0) === 'H') { // 圓窗
        disc(ctx, ox + 8, oy + 7, 3, C.copD); disc(ctx, ox + 8, oy + 7, 2, '#e8a35c'); P(ctx, ox + 7, oy + 6, '#ffd59a');
      }
    }
  };
  groundDraw['D'] = function (ctx, ox, oy, s, nb) {
    var outside = nb(-1, 0) === 'H' || nb(1, 0) === 'H';
    if (outside) {
      Rr(ctx, ox, oy, TS, TS, '#cbbd9e');
      Rr(ctx, ox + 2, oy + 2, 12, 14, C.copD);
      Rr(ctx, ox + 3, oy + 3, 10, 13, '#24161a');
      Rr(ctx, ox + 4, oy + 4, 8, 12, '#2B7D79');
      for (var y = 5; y < 16; y += 2) Rr(ctx, ox + 4, oy + y, 8, 1, '#236d6a');
      Rr(ctx, ox + 3, oy + 2, 10, 1, C.copL);
    } else {
      Rr(ctx, ox, oy, TS, TS, C.flr);
      Rr(ctx, ox + 2, oy, 12, TS, '#3b2a22');
      Rr(ctx, ox + 3, oy + 2, 10, 12, C.path);
      Rr(ctx, ox + 3, oy + 14, 10, 2, C.trim);
    }
  };
  groundDraw['>'] = function (ctx, ox, oy, s, nb) {
    var cave = nb(0, -1) === '_' || nb(0, 1) === '_' || nb(-1, 0) === '#' || nb(1, 0) === '#';
    Rr(ctx, ox, oy, TS, TS, cave ? '#1d1a24' : C.platD);
    for (var y = 0; y < TS; y += 4) {
      Rr(ctx, ox + 1, oy + y, 14, 3, cave ? '#3a3346' : C.plat);
      Rr(ctx, ox + 1, oy + y, 14, 1, cave ? '#4d4560' : C.platL);
    }
  };
  groundDraw['0'] = function (ctx, ox, oy) { Rr(ctx, ox, oy, TS, TS, '#0b0a0e'); };

  // ---- 物件層 ----
  var objDraw = {};
  objDraw['b'] = function (ctx, ox, oy, s) {
    Rr(ctx, ox + 2, oy + 13, 12, 2, 'rgba(10,8,16,0.45)');
    disc(ctx, ox + 8, oy + 8, 6, '#0f1d33');
    disc(ctx, ox + 8, oy + 7, 6, C.ind);
    disc(ctx, ox + 6, oy + 6, 3, C.indM);
    disc(ctx, ox + 10, oy + 8, 3, C.indM);
    var rnd = U.rng(s);
    for (var i = 0; i < 8; i++) P(ctx, ox + 3 + Math.floor(rnd() * 10), oy + 2 + Math.floor(rnd() * 10), rnd() < 0.5 ? C.indH : C.indL);
    P(ctx, ox + 5, oy + 4, C.glow); P(ctx, ox + 11, oy + 6, '#4fb3ab'); if (rnd() < 0.5) P(ctx, ox + 8, oy + 10, C.glow);
  };
  objDraw['t'] = function (ctx, ox, oy, s) {
    var rnd = U.rng(s);
    Rr(ctx, ox + 3, oy + 14, 10, 2, 'rgba(10,8,16,0.4)');
    for (var i = 0; i < 3; i++) {
      var x = ox + 3 + i * 4 + Math.floor(rnd() * 2), top = oy + 1 + Math.floor(rnd() * 5);
      Rr(ctx, x, top + 2, 2, oy + 15 - top - 2, i % 2 ? C.cop : C.copD);
      P(ctx, x, top + 2, C.copL);
      Rr(ctx, x - 1, top, 4, 2, C.copL); Rr(ctx, x, top, 2, 1, '#2a1a12');
      for (var k = top + 5; k < oy + 14; k += 3) P(ctx, x + 1, k, C.indH);
    }
  };
  objDraw['f'] = function (ctx, ox, oy, s) {
    var rnd = U.rng(s);
    for (var i = 0; i < 3; i++) {
      var x = ox + 3 + Math.floor(rnd() * 10), y = oy + 5 + Math.floor(rnd() * 8);
      Rr(ctx, x, y + 1, 1, 3, C.indH);
      P(ctx, x, y, C.glow); P(ctx, x - 1, y, '#3f9c94'); P(ctx, x + 1, y, '#3f9c94'); P(ctx, x, y - 1, '#b8f0ea');
    }
  };
  objDraw['Y'] = function (ctx, ox, oy) {
    // 樹幹與管根（樹冠畫在上層）
    Rr(ctx, ox + 1, oy + 13, 14, 3, 'rgba(10,8,16,0.45)');
    Rr(ctx, ox + 6, oy, 4, 13, C.copD); Rr(ctx, ox + 7, oy, 1, 13, C.cop);
    Rr(ctx, ox + 3, oy + 11, 3, 2, C.copD); Rr(ctx, ox + 1, oy + 12, 3, 2, C.cop);
    Rr(ctx, ox + 10, oy + 11, 3, 2, C.copD); Rr(ctx, ox + 12, oy + 12, 3, 2, C.cop);
    P(ctx, ox + 2, oy + 12, C.glow); P(ctx, ox + 13, oy + 13, '#4fb3ab'); P(ctx, ox + 8, oy + 6, '#4fb3ab');
  };
  function canopy(ctx, ox, oy, s) { // 32x24，左上角 ox,oy
    var rnd = U.rng(s);
    disc(ctx, ox + 16, oy + 13, 11, '#0c1729');
    disc(ctx, ox + 16, oy + 12, 11, C.ind);
    disc(ctx, ox + 10, oy + 10, 6, C.indM); disc(ctx, ox + 21, oy + 11, 6, C.indM);
    disc(ctx, ox + 15, oy + 6, 5, C.indL);
    for (var i = 0; i < 26; i++) P(ctx, ox + 6 + Math.floor(rnd() * 20), oy + 3 + Math.floor(rnd() * 18), rnd() < 0.5 ? C.indH : '#0f1d33');
    for (var j = 0; j < 4; j++) P(ctx, ox + 7 + Math.floor(rnd() * 18), oy + 4 + Math.floor(rnd() * 16), C.glow);
    // 垂絲
    for (var k = 0; k < 3; k++) { var hx = ox + 9 + Math.floor(rnd() * 14); Rr(ctx, hx, oy + 20, 1, 2 + Math.floor(rnd() * 3), C.indL); }
  }
  objDraw['r'] = function (ctx, ox, oy, s) {
    Rr(ctx, ox + 2, oy + 13, 12, 2, 'rgba(10,8,16,0.45)');
    disc(ctx, ox + 8, oy + 9, 5, C.rockD); disc(ctx, ox + 8, oy + 8, 5, C.rock); disc(ctx, ox + 7, oy + 6, 2, C.rockL);
    Rr(ctx, ox + 10, oy + 4, 2, 5, '#5fb3a9'); P(ctx, ox + 10, oy + 3, '#bff1ea'); Rr(ctx, ox + 12, oy + 6, 1, 3, '#3f9c94');
  };
  objDraw['n'] = function (ctx, ox, oy, s, nb, ob) {
    var L = ob(-1, 0) === 'n', Rt = ob(1, 0) === 'n', Up = ob(0, -1) === 'n', Dn = ob(0, 1) === 'n';
    Rr(ctx, ox + 6, oy + 4, 4, 11, C.copD); Rr(ctx, ox + 7, oy + 3, 2, 1, C.copL);
    if (L || (!Up && !Dn)) { Rr(ctx, ox, oy + 7, 8, 2, C.cop); Rr(ctx, ox, oy + 11, 8, 2, C.copD); }
    if (Rt || (!Up && !Dn)) { Rr(ctx, ox + 8, oy + 7, 8, 2, C.cop); Rr(ctx, ox + 8, oy + 11, 8, 2, C.copD); }
    if (Up) Rr(ctx, ox + 7, oy, 2, 4, C.cop);
    if (Dn) Rr(ctx, ox + 7, oy + 14, 2, 2, C.cop);
    P(ctx, ox + 7, oy + 8, C.glow);
  };
  objDraw['P'] = function (ctx, ox, oy) {
    Rr(ctx, ox + 3, oy + 13, 10, 3, 'rgba(0,0,0,0.5)');
    Rr(ctx, ox + 4, oy, 8, 15, C.copD); Rr(ctx, ox + 5, oy, 3, 15, C.cop); Rr(ctx, ox + 5, oy, 1, 15, C.copL);
    Rr(ctx, ox + 3, oy + 4, 10, 2, '#4a2b1b'); Rr(ctx, ox + 3, oy + 10, 10, 2, '#4a2b1b');
  };
  objDraw['k'] = function (ctx, ox, oy) {
    Rr(ctx, ox + 1, oy, 14, 15, '#4a2f1f'); Rr(ctx, ox + 2, oy + 1, 12, 13, '#5f3e29');
    for (var y = 4; y < 14; y += 5) Rr(ctx, ox + 2, oy + y, 12, 1, '#3a2418');
    var cols = ['#D8CCB3', '#2B7D79', '#98613C', '#c58a52', '#73D6D0'];
    for (var i = 0; i < 5; i++) { Rr(ctx, ox + 3 + i * 2, oy + 2, 1, 2, cols[i]); Rr(ctx, ox + 3 + ((i * 3) % 10), oy + 7, 2, 2, cols[(i + 2) % 5]); }
    Rr(ctx, ox + 4, oy + 11, 3, 3, '#b3a688'); Rr(ctx, ox + 9, oy + 11, 3, 3, '#2B7D79');
    Rr(ctx, ox + 1, oy + 15, 14, 1, 'rgba(0,0,0,0.4)');
  };
  objDraw['c'] = function (ctx, ox, oy) {
    Rr(ctx, ox + 1, oy + 13, 14, 2, 'rgba(0,0,0,0.35)');
    Rr(ctx, ox + 1, oy + 4, 14, 7, '#6e4a33'); Rr(ctx, ox + 1, oy + 4, 14, 1, '#8a6443');
    Rr(ctx, ox + 2, oy + 11, 2, 3, '#4a2f1f'); Rr(ctx, ox + 12, oy + 11, 2, 3, '#4a2f1f');
    Rr(ctx, ox + 4, oy + 5, 5, 4, C.bone); Rr(ctx, ox + 5, oy + 6, 3, 1, '#4d4560'); Rr(ctx, ox + 11, oy + 3, 2, 3, '#2B7D79'); P(ctx, ox + 11, oy + 2, C.glow);
  };
  objDraw['p'] = function (ctx, ox, oy) {
    Rr(ctx, ox + 1, oy + 13, 14, 2, 'rgba(0,0,0,0.35)');
    disc(ctx, ox + 5, oy + 10, 4, '#8a5a3a'); disc(ctx, ox + 5, oy + 9, 3, '#a8704a'); Rr(ctx, ox + 3, oy + 4, 4, 2, '#6e4229');
    disc(ctx, ox + 11, oy + 11, 3, '#2B7D79'); disc(ctx, ox + 11, oy + 10, 2, '#3f9c94'); Rr(ctx, ox + 10, oy + 6, 2, 2, '#1f5e5b');
  };
  objDraw['h'] = function (ctx, ox, oy) {
    Rr(ctx, ox + 1, oy + 2, 14, 13, '#3a2a22'); Rr(ctx, ox + 2, oy + 3, 12, 11, '#5a3f31');
    Rr(ctx, ox + 4, oy + 7, 8, 6, '#1a0f0c'); Rr(ctx, ox + 1, oy + 2, 14, 1, C.bone);
  };
  objDraw['m'] = function (ctx, ox, oy, s, nb, ob) {
    Rr(ctx, ox, oy + 1, TS, 14, '#2c5470');
    for (var y = 3; y < 14; y += 3) Rr(ctx, ox, oy + y, TS, 1, '#244a62');
    if (ob(-1, 0) !== 'm') Rr(ctx, ox, oy + 1, 1, 14, '#c9bc9f');
    if (ob(1, 0) !== 'm') Rr(ctx, ox + 15, oy + 1, 1, 14, '#c9bc9f');
    for (var x = 2; x < TS; x += 4) P(ctx, ox + x, oy + 8, '#73D6D0');
  };
  // ---- 上層 ----
  var ovDraw = {};
  ovDraw['o'] = function (ctx, ox, oy, s) {
    var rnd = U.rng(s);
    Rr(ctx, ox, oy, TS, TS, C.ind);
    for (var i = 0; i < 16; i++) P(ctx, ox + Math.floor(rnd() * 16), oy + Math.floor(rnd() * 16), rnd() < 0.5 ? C.indM : '#0f1d33');
    if (rnd() < 0.3) P(ctx, ox + Math.floor(rnd() * 16), oy + Math.floor(rnd() * 16), C.glow);
  };
  ovDraw['a'] = function (ctx, ox, oy, s) {
    var rnd = U.rng(s);
    for (var i = 0; i < 4; i++) {
      var x = ox + Math.floor(rnd() * 15), len = 4 + Math.floor(rnd() * 10);
      Rr(ctx, x, oy, 1, len, i % 2 ? C.copD : '#4a2b1b');
      if (rnd() < 0.5) P(ctx, x, oy + len, C.glow);
    }
  };

  // 在地圖預繪 canvas 上繪出整張地圖的靜態部分
  G.renderMapLayers = function (pm) {
    var w = pm.w, h = pm.h;
    var base = G.canvas(w * TS, h * TS), over = G.canvas(w * TS, h * TS);
    var bc = base.getContext('2d'), oc = over.getContext('2d');
    var anims = [], lights = [];
    function gAt(x, y) { if (x < 0 || y < 0 || x >= w || y >= h) return null; return pm.ground[y * w + x]; }
    function oAt(x, y) { if (x < 0 || y < 0 || x >= w || y >= h) return null; return pm.objects[y * w + x]; }
    var x, y;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var ch = pm.ground[y * w + x], seed = Math.floor(U.hash2(x, y, 1) * 1e9);
      var fn = groundDraw[ch] || groundDraw['0'];
      (function (xx, yy) { fn(bc, xx * TS, yy * TS, seed, function (dx, dy) { return gAt(xx + dx, yy + dy); }); })(x, y);
      var t = V.TILES[ch]; if (t && t.anim) anims.push({ x: x, y: y, ch: ch, s: U.hash2(x, y, 4) });
    }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var och = pm.objects[y * w + x]; if (!och) continue;
      var seed2 = Math.floor(U.hash2(x, y, 2) * 1e9);
      (function (xx, yy) {
        objDraw[och](bc, xx * TS, yy * TS, seed2, function (dx, dy) { return gAt(xx + dx, yy + dy); }, function (dx, dy) { return oAt(xx + dx, yy + dy); });
      })(x, y);
      var ot = V.TILES[och];
      if (ot.anim) anims.push({ x: x, y: y, ch: och, s: U.hash2(x, y, 5) });
      if (ot.light) lights.push({ x: x * TS + 8, y: y * TS + 8, r: och === 'h' ? 52 : 30, ch: och });
      if (och === 'Y') canopy(oc, x * TS - 8, y * TS - 22, seed2);
    }
    // 高草前景葉片（遮住腳）
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      if (pm.ground[y * w + x] === '"') {
        var rnd = U.rng(Math.floor(U.hash2(x, y, 3) * 1e9));
        for (var i = 0; i < 9; i++) {
          var bx = x * TS + Math.floor(rnd() * 15), bh = 3 + Math.floor(rnd() * 4);
          var col = [C.indL, C.indM, C.indH][Math.floor(rnd() * 3)];
          Rr(oc, bx, y * TS + 16 - bh, 1, bh, col);
        }
      }
      var ov = pm.overlay[y * w + x];
      if (ov) ovDraw[ov](oc, x * TS, y * TS, Math.floor(U.hash2(x, y, 6) * 1e9));
    }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var gch = pm.ground[y * w + x];
      if (gch === 's') lights.push({ x: x * TS + 8, y: y * TS + 8, r: 22, ch: 's' });
      if (gch === '!') lights.push({ x: x * TS + 8, y: y * TS + 9, r: 18, ch: '!', color: 'sul' });
    }
    return { base: base, over: over, anims: anims, lights: lights };
  };

  // 動畫圖塊：每幀在畫面上額外繪製（不重畫整格）
  G.drawAnim = function (ctx, a, sx, sy, t) {
    var ph = a.s * 10, k;
    switch (a.ch) {
      case '~': case 'W': {
        var col = a.ch === '~' ? 'rgba(190,240,232,0.55)' : 'rgba(120,180,210,0.45)';
        for (k = 0; k < 2; k++) {
          var cyc = (t * 0.35 + ph + k * 0.5) % 1;
          var xx = sx + ((a.s * 37 + k * 7) % 11), yy = sy + 3 + ((a.s * 53 + k * 5) % 10);
          ctx.globalAlpha = Math.sin(cyc * Math.PI);
          Rr(ctx, xx + Math.floor(cyc * 3), yy, 3, 1, col);
        }
        ctx.globalAlpha = 1; break;
      }
      case 's': {
        for (k = 0; k < 3; k++) {
          var c2 = (t * 0.4 + ph + k / 3) % 1;
          ctx.globalAlpha = 0.35 * Math.sin(c2 * Math.PI);
          Rr(ctx, sx + 3 + k * 4 + Math.round(Math.sin(t * 2 + k) * 1.5), sy + 10 - c2 * 14, 2, 2, '#e9f3ee');
        }
        ctx.globalAlpha = 1; break;
      }
      case '!': {
        var pulse = 0.5 + 0.5 * Math.sin(t * 3 + ph);
        ctx.globalAlpha = 0.4 + 0.5 * pulse; Rr(ctx, sx + 7, sy + 8, 3, 3, '#e0623f'); ctx.globalAlpha = 1;
        var c3 = (t * 0.6 + ph) % 1;
        ctx.globalAlpha = 0.45 * (1 - c3); Rr(ctx, sx + 6 + Math.round(Math.sin(t * 3) * 2), sy + 6 - c3 * 14, 4, 3, '#d9cf9b'); ctx.globalAlpha = 1;
        break;
      }
      case 't': {
        var g = 0.3 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.2 + ph));
        ctx.globalAlpha = g; Rr(ctx, sx + 3, sy + 2, 2, 1, C.glow); Rr(ctx, sx + 11, sy + 3, 2, 1, C.glow); ctx.globalAlpha = 1; break;
      }
      case 'f': {
        var g2 = 0.18 + 0.2 * (0.5 + 0.5 * Math.sin(t * 1.7 + ph));
        ctx.globalAlpha = g2 * 0.7; ctx.fillStyle = C.glow; ctx.beginPath(); ctx.arc(sx + 8, sy + 9, 5, 0, 6.283); ctx.fill();
        ctx.globalAlpha = g2; ctx.beginPath(); ctx.arc(sx + 8, sy + 9, 2.5, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; break;
      }
      case 'P': {
        var g3 = 0.4 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.3 + ph));
        ctx.globalAlpha = g3; Rr(ctx, sx + 5, sy + 7, 6, 2, C.glow); Rr(ctx, sx + 6, sy + 1, 1, 2, C.glow); ctx.globalAlpha = 1; break;
      }
      case 'h': {
        var f = Math.sin(t * 9 + ph) * 0.5 + 0.5;
        Rr(ctx, sx + 5, sy + 9, 6, 4, '#a64232'); Rr(ctx, sx + 6, sy + 8 - Math.round(f * 2), 4, 4, '#e07a3f'); Rr(ctx, sx + 7, sy + 9 - Math.round(f * 2), 2, 2, '#ffd59a');
        break;
      }
    }
  };

  // ======================= 光暈貼圖（洞穴／藍昏）=======================
  G.lightSprite = (function () {
    var cache = {};
    return function (r, color) {
      var key = r + (color || '');
      if (cache[key]) return cache[key];
      var c = G.canvas(r * 2, r * 2), x = c.getContext('2d');
      var gr = x.createRadialGradient(r, r, 0, r, r, r);
      gr.addColorStop(0, color || 'rgba(0,0,0,1)'); gr.addColorStop(0.55, color ? color.replace(/[\d.]+\)$/, '0.4)') : 'rgba(0,0,0,0.75)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gr; x.fillRect(0, 0, r * 2, r * 2);
      return (cache[key] = c);
    };
  })();
  G.mistBlob = (function () {
    var c = null;
    return function () {
      if (c) return c;
      c = G.canvas(96, 48); var x = c.getContext('2d');
      var gr = x.createRadialGradient(48, 24, 2, 48, 24, 46);
      gr.addColorStop(0, 'rgba(232,222,205,0.30)'); gr.addColorStop(1, 'rgba(232,222,205,0)');
      x.setTransform(1, 0, 0, 0.5, 0, 12); x.fillStyle = gr; x.fillRect(0, 0, 96, 96);
      return c;
    };
  })();

  // ======================= 物品圖示 =======================
  var iconCache = {};
  G.icon = function (spec) {
    spec = spec || {};
    var key = JSON.stringify(spec);
    if (iconCache[key]) return iconCache[key];
    var c = G.canvas(16, 16), x = c.getContext('2d');
    var col = spec.color || C.glow, dk = spec.dark || '#1b1420';
    switch (spec.shape || 'vial') {
      case 'vial':
        Rr(x, 6, 1, 4, 2, C.copD); Rr(x, 6, 3, 4, 3, C.boneL);
        disc(x, 8, 10, 5, dk); disc(x, 8, 10, 4, C.boneL); disc(x, 8, 11, 3, col); P(x, 6, 9, '#ffffff'); break;
      case 'crystal':
        x.fillStyle = dk; x.fillRect(4, 3, 8, 11);
        Rr(x, 5, 4, 3, 9, col); Rr(x, 8, 2, 3, 11, col); Rr(x, 6, 5, 1, 6, '#ffffff'); Rr(x, 9, 3, 1, 3, '#e8fffb'); Rr(x, 3, 13, 10, 1, dk); break;
      case 'leaf':
        for (var i = 0; i < 10; i++) { var w = Math.round(Math.sin(i / 9 * Math.PI) * 4); Rr(x, 8 - w, 3 + i, w * 2 + 1, 1, col); }
        Rr(x, 8, 2, 1, 13, dk); P(x, 6, 6, dk); P(x, 10, 8, dk); P(x, 6, 10, dk); break;
      case 'pouch':
        disc(x, 8, 10, 5, dk); disc(x, 8, 10, 4, col); Rr(x, 6, 3, 4, 3, col); Rr(x, 5, 5, 6, 1, dk); P(x, 7, 8, '#ffffff'); break;
      case 'drop':
        for (var j = 0; j < 11; j++) { var ww = j < 4 ? Math.floor(j / 2) : Math.round(Math.sqrt(Math.max(0, 16 - (j - 7) * (j - 7))) ); Rr(x, 8 - ww, 3 + j, ww * 2 + 1, 1, col); }
        P(x, 7, 9, '#ffffff'); break;
      case 'page':
        Rr(x, 3, 2, 10, 12, dk); Rr(x, 4, 3, 8, 10, C.bone); Rr(x, 5, 5, 6, 1, C.copD); Rr(x, 5, 7, 5, 1, C.copD); Rr(x, 5, 9, 6, 1, C.teal || '#2B7D79'); break;
      case 'key':
        disc(x, 5, 6, 3, col); disc(x, 5, 6, 1, dk); Rr(x, 7, 6, 7, 2, col); Rr(x, 11, 8, 1, 3, col); Rr(x, 13, 8, 1, 2, col); break;
      case 'ticket':
        Rr(x, 2, 4, 12, 8, dk); Rr(x, 3, 5, 10, 6, col); Rr(x, 5, 7, 6, 1, dk); P(x, 3, 5, dk); P(x, 12, 10, dk); break;
      case 'shell':
        disc(x, 8, 9, 5, dk); disc(x, 8, 9, 4, col); for (var r = 0; r < 4; r++) Rr(x, 5 + r * 2, 6, 1, 6, dk); break;
      case 'gloves':
        Rr(x, 4, 4, 8, 8, dk); Rr(x, 5, 5, 6, 7, col); Rr(x, 5, 2, 1, 4, col); Rr(x, 7, 2, 1, 3, col); Rr(x, 9, 2, 1, 4, col); Rr(x, 4, 12, 8, 2, C.copD); break;
    }
    var url = c.toDataURL();
    iconCache[key] = url;
    return url;
  };

  // 紙紋（犢皮）材質，供 CSS 使用
  G.makeGrain = function () {
    var c = G.canvas(160, 160), x = c.getContext('2d');
    var img = x.createImageData(160, 160), d = img.data, rnd = U.rng(42);
    for (var i = 0; i < d.length; i += 4) {
      var v = rnd();
      var a = v < 0.06 ? 34 : (v < 0.25 ? 14 : 0);
      d[i] = 90; d[i + 1] = 60; d[i + 2] = 30; d[i + 3] = a;
    }
    x.putImageData(img, 0, 0);
    // 纖維
    x.strokeStyle = 'rgba(120,80,40,0.08)';
    for (var k = 0; k < 40; k++) { x.beginPath(); var sx = rnd() * 160, sy = rnd() * 160; x.moveTo(sx, sy); x.lineTo(sx + rnd() * 30 - 15, sy + rnd() * 6 - 3); x.stroke(); }
    return c.toDataURL();
  };
})();

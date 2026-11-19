/*
 * 角色與遭遇對象的像素畫。
 * 角色：以字元模板＋色板槽位繪製（16×24，四向 × 四影格），右向由左向鏡射。
 * 遭遇對象：以正規化座標的形狀場逐像素繪製，可在任意尺寸產生（地圖 16–24px、遭遇畫面 48px），
 *           再自動加外框，維持一致的像素畫風格。
 */
(function () {
  'use strict';
  var V = window.VELLORA, U = V.util, G = V.gfx;
  var S = V.sprites = {};
  var FW = S.FW = 16, FH = S.FH = 24;

  var HEAD = {
    down: [
      '................',
      '................',
      '.....OOOOOO.....',
      '....OHHHHHHO....',
      '...OHHHHHHGHO...',
      '...OHHHHHHHHO...',
      '...OHHSSSSHHO...',
      '...OHSESSESHO...',
      '...OhSSSSSShO...',
      '....OSSssSSO....',
      '.....OOGSOO.....'
    ],
    up: [
      '................',
      '................',
      '.....OOOOOO.....',
      '....OHHHHHHO....',
      '...OHHHHHHHHO...',
      '...OHHHHHHHHO...',
      '...OHHHHHHHHO...',
      '...OHHHHHHHHO...',
      '...OhHHHHHHhO...',
      '....OhhhhhhO....',
      '.....OOSSOO.....'
    ],
    left: [
      '................',
      '................',
      '......OOOOO.....',
      '.....OHHHHHO....',
      '....OHHHHHHHO...',
      '....OHHHHHHHO...',
      '....OSSHHHHHO...',
      '...OSESSHHHHO...',
      '...OSSSSHHHO....',
      '....OSssShhO....',
      '.....OOSGOO.....'
    ]
  };
  var BODY = {
    down: [
      '....OCCAACCO....',
      '...OCCCAACCCO...',
      '..OCOCCCCCCOCO..',
      '..OSOCCCCCCOSO..',
      '..OGOCCCCCCOGO..',
      '...OOCCccCCOO...',
      '....OCCccCCO....',
      '....OccccccO....'
    ],
    up: [
      '....OCCCCACO....',
      '...OCCCCAACCO...',
      '..OCOCCAACCOCO..',
      '..OSOCAACCCOSO..',
      '..OSOACCCCCOSO..',
      '...OOCCccCCOO...',
      '....OCCccCCO....',
      '....OccccccO....'
    ],
    left: [
      '.....OCCCCO.....',
      '....OCCCCAAO....',
      '....OCCSCAAO....',
      '....OCCSCCCO....',
      '....OCCGCCCO....',
      '....OCCCCccO....',
      '.....OCCccO.....',
      '.....OccccO.....'
    ]
  };
  var LEGS = {
    down: {
      stand: ['....OccOOccO....', '....OBBOOBBO....', '....OBBOOBBO....', '.....OO..OO.....', '................'],
      a: ['....OccOOccO....', '....OBBOOBBO....', '.....OOOOBBO....', '.........OO.....', '................'],
      b: ['....OccOOccO....', '....OBBOOBBO....', '....OBBOOOO.....', '.....OO.........', '................']
    },
    left: {
      stand: ['.....OccccO.....', '.....OBBBBO.....', '.....OBBBBO.....', '.....OOOOOO.....', '................'],
      a: ['.....OccccO.....', '....OBBOOBBO....', '...OBBO..OBBO...', '...OOO....OOO...', '................'],
      b: ['.....OccccO.....', '.....OBBBO......', '......OBBBO.....', '......OOOO......', '................']
    }
  };
  LEGS.up = LEGS.down;

  var STYLE_ROWS = {
    bun: { down: ['.......OO.......', '......OHHO......'], up: ['.......OO.......', '......OHHO......'], left: ['........OO......', '.......OHHO.....'] },
    tall: { down: ['......OOOO......', '.....OHHHHO.....'], up: ['......OOOO......', '.....OHHHHO.....'], left: ['.......OOOO.....', '......OHHHHO....'] }
  };

  function hex2rgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function shade(h, k) {
    var c = hex2rgb(h);
    return '#' + c.map(function (v) { var x = Math.round(U.clamp(v * k, 0, 255)); return (x < 16 ? '0' : '') + x.toString(16); }).join('');
  }
  S.shade = shade;

  // spec: { hair, skin, cloth, accent, boots, glow, style:'bob'|'bun'|'tall'|'hood', hood, naiad }
  function palette(spec) {
    var hair = spec.style === 'hood' ? (spec.hood || spec.cloth || '#2B7D79') : (spec.hair || '#1e2440');
    var skin = spec.skin || '#d9a77f', cloth = spec.cloth || '#D8CCB3';
    return {
      O: spec.outline || '#1b1420', H: hair, h: shade(hair, 0.7), S: skin, s: shade(skin, 0.82), E: '#1b1420',
      C: cloth, c: shade(cloth, 0.72), A: spec.accent || '#98613C', B: spec.boots || '#4a2f1f',
      G: spec.glow === false ? skin : (spec.glow || '#73D6D0')
    };
  }

  function drawRows(ctx, rows, pal, ox, oy, mirror) {
    for (var y = 0; y < rows.length; y++) {
      var r = rows[y];
      for (var x = 0; x < 16; x++) {
        var ch = r.charAt(x);
        if (ch === '.' || !pal[ch]) continue;
        ctx.fillStyle = pal[ch];
        ctx.fillRect(ox + (mirror ? 15 - x : x), oy + y, 1, 1);
      }
    }
  }

  // 產生角色精靈表：4 方向（down,left,right,up）× 4 影格（站、步A、站、步B）
  var sheetCache = {};
  S.character = function (spec) {
    spec = spec || {};
    var key = JSON.stringify(spec);
    if (sheetCache[key]) return sheetCache[key];
    var c = G.canvas(FW * 4, FH * 4), ctx = c.getContext('2d');
    var pal = palette(spec);
    var dirs = ['down', 'left', 'right', 'up'];
    dirs.forEach(function (dir, di) {
      var base = dir === 'right' ? 'left' : dir, mirror = dir === 'right';
      ['stand', 'a', 'stand', 'b'].forEach(function (leg, fi) {
        var bob = (fi === 1 || fi === 3) ? 1 : 0;
        var rows = HEAD[base].slice();
        var sr = STYLE_ROWS[spec.style];
        if (sr) { rows[0] = sr[base][0]; rows[1] = sr[base][1]; }
        rows = rows.concat(BODY[base]).concat(LEGS[base][leg]);
        var ox = fi * FW, oy = di * FH;
        drawRows(ctx, rows.slice(0, 19), pal, ox, oy + bob, mirror);
        drawRows(ctx, rows.slice(19), pal, ox, oy + 19, mirror);
        if (spec.naiad) { // 潾者：半透明珍珠皮膚與藻脈
          ctx.globalCompositeOperation = 'source-atop';
          ctx.fillStyle = 'rgba(160,230,220,0.25)'; ctx.fillRect(ox, oy, FW, FH);
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = 'rgba(115,214,208,0.9)';
          ctx.fillRect(ox + 7, oy + 12 + bob, 1, 4); ctx.fillRect(ox + 9, oy + 13 + bob, 1, 3); ctx.fillRect(ox + 5, oy + 5 + bob, 1, 2);
        }
      });
    });
    return (sheetCache[key] = c);
  };
  S.dirIndex = { down: 0, left: 1, right: 2, up: 3 };

  // ======================= 遭遇對象 =======================
  // spec: { shape:'beast'|'swarm'|'plant'|'mote', body, dark, glow, accent, wild:0..1 }
  function inEll(u, v, cx, cy, rx, ry) { var a = (u - cx) / rx, b = (v - cy) / ry; return a * a + b * b <= 1; }
  var SHAPES = {
    beast: function (u, v, f, p) {
      var bob = f ? 0.02 : 0;
      v -= bob;
      // 背上的共生植物
      for (var i = 0; i < 4; i++) {
        var sx = 0.36 + i * 0.1, top = 0.2 + (i % 2) * 0.06 + (f && i % 2 ? 0.02 : 0);
        if (Math.abs(u - sx) < 0.025 && v > top && v < 0.42) return p.plant;
        if (inEll(u, v, sx, top, 0.05, 0.04)) return (i % 2 ? p.glow : p.accent);
      }
      if (inEll(u, v, 0.55, 0.47, 0.28, 0.14)) return v < 0.42 ? p.dark : p.body; // 拱背
      if (inEll(u, v, 0.53, 0.6, 0.33, 0.16)) return v > 0.68 ? p.dark : p.body;
      if (inEll(u, v, 0.2, 0.55, 0.12, 0.11)) { // 頭
        if (inEll(u, v, 0.15, 0.53, 0.025, 0.025)) return p.eye;
        return p.body;
      }
      if (inEll(u, v, 0.1, 0.6, 0.05, 0.035)) return p.dark;
      var legs = f ? [0.3, 0.45, 0.62, 0.78] : [0.33, 0.43, 0.65, 0.75];
      for (var k = 0; k < 4; k++) if (Math.abs(u - legs[k]) < 0.035 && v > 0.66 && v < 0.88) return k % 2 ? p.dark : p.body;
      // 管紋
      if (Math.abs(v - (0.56 + Math.sin(u * 18) * 0.02)) < 0.012 && inEll(u, v, 0.53, 0.6, 0.31, 0.15)) return p.vein;
      return null;
    },
    swarm: function (u, v, f, p) {
      var t = f ? 0.6 : 0;
      for (var i = 0; i < 7; i++) {
        var a = i / 7 * Math.PI * 2 + t, r = 0.2 + (i % 3) * 0.06;
        var cx = 0.5 + Math.cos(a) * r, cy = 0.56 + Math.sin(a) * r * 0.7;
        // 每條汲蟲由三節組成
        for (var s = 0; s < 3; s++) {
          var ax = cx + Math.cos(a + 1.6 + s * 0.4) * s * 0.06, ay = cy + Math.sin(a + 1.6 + s * 0.4) * s * 0.05;
          if (inEll(u, v, ax, ay, 0.06, 0.05)) return s === 0 ? (i % 2 ? p.glow : p.accent) : (s === 1 ? p.body : p.dark);
        }
      }
      if (inEll(u, v, 0.5, 0.58, 0.16, 0.13)) return inEll(u, v, 0.5, 0.58, 0.07, 0.06) ? p.vein : p.dark;
      return null;
    },
    plant: function (u, v, f, p) {
      var sway = f ? 0.02 : -0.01;
      if (inEll(u, v, 0.5, 0.88, 0.3, 0.07)) return p.dark;
      if (Math.abs(u - (0.5 + sway * (1 - v) * 2)) < 0.04 && v > 0.36 && v < 0.88) return p.plant;
      for (var i = 0; i < 2; i++) {
        var lx = i ? 0.68 : 0.32;
        if (inEll(u, v, lx + sway, 0.64, 0.16, 0.06)) return p.body;
      }
      var cx = 0.5 + sway * 1.5, cy = 0.3;
      if (inEll(u, v, cx, cy, 0.18, 0.15)) return inEll(u, v, cx, cy + 0.02, 0.09, 0.07) ? p.glow : p.accent;
      for (var k = 0; k < 5; k++) {
        var a = -Math.PI / 2 + (k - 2) * 0.5;
        var tx = cx + Math.cos(a) * 0.24, ty = cy + Math.sin(a) * 0.22;
        if (inEll(u, v, tx, ty, 0.035, 0.05)) return p.vein;
      }
      return null;
    },
    mote: function (u, v, f, p) {
      var r = f ? 0.26 : 0.23;
      if (inEll(u, v, 0.5, 0.55, r, r)) return inEll(u, v, 0.45, 0.5, r * 0.4, r * 0.4) ? p.glow : p.body;
      if (inEll(u, v, 0.5, 0.55, r + 0.08, r + 0.08) && ((u * 40 | 0) + (v * 40 | 0)) % 3 === 0) return p.vein;
      return null;
    }
  };

  var creatureCache = {};
  S.creature = function (spec, size, frame) {
    spec = spec || {};
    var key = JSON.stringify(spec) + '|' + size + '|' + frame;
    if (creatureCache[key]) return creatureCache[key];
    var n = size, c = G.canvas(n, n), ctx = c.getContext('2d');
    var p = {
      body: spec.body || '#5a6f8a', dark: spec.dark || shade(spec.body || '#5a6f8a', 0.65),
      glow: spec.glow || '#73D6D0', accent: spec.accent || '#98613C', plant: spec.plant || '#26446b',
      eye: spec.eye || '#f3e6c8', vein: spec.vein || (spec.wild ? '#A64232' : '#73D6D0')
    };
    var fn = SHAPES[spec.shape] || SHAPES.mote;
    var grid = new Array(n * n);
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      grid[y * n + x] = fn((x + 0.5) / n, (y + 0.5) / n, frame, p);
    }
    var ol = spec.outline || '#1b1420';
    for (var yy = 0; yy < n; yy++) for (var xx = 0; xx < n; xx++) {
      var col = grid[yy * n + xx];
      if (col) { ctx.fillStyle = col; ctx.fillRect(xx, yy, 1, 1); continue; }
      var near = (xx > 0 && grid[yy * n + xx - 1]) || (xx < n - 1 && grid[yy * n + xx + 1]) ||
        (yy > 0 && grid[(yy - 1) * n + xx]) || (yy < n - 1 && grid[(yy + 1) * n + xx]);
      if (near) { ctx.fillStyle = ol; ctx.fillRect(xx, yy, 1, 1); }
    }
    return (creatureCache[key] = c);
  };

  // ======================= 互動物件 =======================
  // kind: altar 味診台、gauge 水位尺、filter 孢子濾幕、shrine 種源龕、bed 床、gather 採集點、
  //       observe 觀察點、chest 寶匣、sign 告示
  var objCache = {};
  S.object = function (kind, frame, opened) {
    var key = kind + frame + (opened ? 'o' : '');
    if (objCache[key]) return objCache[key];
    var c = G.canvas(16, 24), x = c.getContext('2d'), P = G.px, R = G.rect, C = G.C;
    var sh = 'rgba(10,8,16,0.45)';
    switch (kind) {
      case 'altar':
        R(x, 1, 20, 14, 3, sh);
        R(x, 1, 11, 14, 10, C.copD); R(x, 2, 12, 12, 8, C.cop); R(x, 1, 10, 14, 2, C.bone);
        R(x, 3, 6, 3, 4, C.boneL); R(x, 3, 8, 3, 2, '#c58a52');
        R(x, 7, 5, 2, 5, C.boneL); R(x, 7, 7, 2, 3, '#8fc9a3');
        R(x, 10, 6, 3, 4, C.boneL); R(x, 10, 8, 3, 2, frame ? '#73D6D0' : '#3f9c94');
        R(x, 4, 15, 8, 2, C.copD); P(x, 8, 14, C.glow);
        break;
      case 'gauge':
        R(x, 6, 21, 5, 2, sh);
        R(x, 7, 2, 3, 20, C.bone); R(x, 7, 2, 1, 20, C.boneL);
        for (var i = 4; i < 21; i += 3) R(x, 10, i, 2, 1, C.copD);
        R(x, 7, 15, 3, 7, '#2d847f'); R(x, 7, 15, 3, 1, frame ? '#a7ddd3' : '#73D6D0');
        R(x, 6, 2, 5, 1, C.copD);
        break;
      case 'filter':
        R(x, 1, 21, 14, 2, sh);
        R(x, 1, 3, 2, 19, C.copD); R(x, 13, 3, 2, 19, C.copD); R(x, 1, 3, 14, 2, C.cop);
        x.globalAlpha = 0.75; R(x, 3, 5, 10, 14, '#c9bc9f'); x.globalAlpha = 1;
        for (var j = 0; j < 7; j++) { P(x, 4 + (j * 5) % 9, 6 + (j * 3) % 12, frame ? '#73D6D0' : '#3f9c94'); }
        for (var y = 6; y < 19; y += 3) R(x, 3, y, 10, 1, 'rgba(120,100,70,0.5)');
        break;
      case 'shrine':
        R(x, 1, 21, 14, 3, sh);
        R(x, 2, 14, 12, 8, '#5a4f4c'); R(x, 2, 14, 12, 1, '#7b6d66');
        R(x, 3, 4, 10, 11, C.copD); R(x, 4, 5, 8, 9, '#1a2a30');
        G.disc(x, 8, 9, 3, frame ? '#73D6D0' : '#4fb3ab'); G.disc(x, 8, 9, 1, '#e6fffb');
        R(x, 3, 3, 10, 2, C.cop); P(x, 8, 2, C.glow);
        for (var k = 0; k < 4; k++) P(x, 3 + k * 3, 18, C.glow);
        break;
      case 'bed':
        R(x, 0, 20, 16, 3, sh);
        R(x, 0, 8, 16, 13, '#5f3e29'); R(x, 1, 9, 14, 11, '#2c5470');
        R(x, 1, 9, 14, 4, C.bone); R(x, 2, 10, 5, 2, C.boneL);
        for (var r = 14; r < 20; r += 2) R(x, 1, r, 14, 1, '#244a62');
        break;
      case 'gather':
        if (opened) { R(x, 4, 19, 8, 2, sh); R(x, 5, 17, 6, 3, '#3a3231'); break; }
        R(x, 3, 19, 10, 2, sh);
        R(x, 4, 14, 8, 6, '#5a4f4c'); R(x, 5, 13, 6, 2, '#7b6d66');
        R(x, 6, 9, 2, 5, '#5fb3a9'); R(x, 9, 10, 2, 4, '#3f9c94'); P(x, 6, 8, '#e6fffb'); P(x, 9, 9, '#bff1ea');
        if (frame) { P(x, 4, 8, '#73D6D0'); P(x, 12, 11, '#73D6D0'); }
        break;
      case 'observe':
        if (opened) break;
        var a = frame ? 1 : 0.55;
        x.globalAlpha = a;
        R(x, 7, 10, 2, 2, '#e6fffb'); R(x, 6, 11, 4, 1, '#73D6D0'); R(x, 8, 8, 1, 6, '#73D6D0'); R(x, 5, 11, 1, 1, '#73D6D0'); R(x, 10, 11, 1, 1, '#73D6D0');
        x.globalAlpha = 1;
        break;
      case 'chest':
        R(x, 1, 20, 14, 3, sh);
        R(x, 2, 12, 12, 9, C.copD); R(x, 3, 13, 10, 7, C.cop);
        if (opened) { R(x, 2, 8, 12, 4, '#4a2b1b'); R(x, 3, 12, 10, 2, '#1b1420'); }
        else { R(x, 2, 10, 12, 4, '#7a4a2e'); R(x, 2, 10, 12, 1, C.copL); R(x, 7, 13, 2, 3, C.bone); P(x, 8, 14, frame ? '#73D6D0' : '#1b1420'); }
        break;
      case 'sign':
        R(x, 6, 21, 5, 2, sh);
        R(x, 7, 13, 2, 9, C.copD);
        R(x, 1, 5, 14, 9, C.copD); R(x, 2, 6, 12, 7, C.bone);
        R(x, 3, 8, 9, 1, '#4d4560'); R(x, 3, 10, 7, 1, '#4d4560');
        break;
      default:
        R(x, 5, 10, 6, 6, '#73D6D0');
    }
    return (objCache[key] = c);
  };
})();

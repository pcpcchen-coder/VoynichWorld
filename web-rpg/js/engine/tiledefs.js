/*
 * 圖塊代碼表（單一字元）。地圖以字元陣列手寫，每個字元對應一種圖塊。
 * 本檔是 ENGINE.md「圖塊代碼表」的唯一來源；驗證器也讀這份表。
 *   layer: ground＝地面層；object＝物件層；overlay＝上層遮蔽
 *   walk:  可否行走
 *   anim:  有動畫（每幀額外繪製）
 */
(function (root) {
  'use strict';
  var V = root.VELLORA;
  V.TILES = {
    // ---------- 地面層 ----------
    '.': { id: 'soil', name: '活土地面', layer: 'ground', walk: true },
    ',': { id: 'path', name: '活土小徑', layer: 'ground', walk: true },
    ';': { id: 'moss', name: '靛苔地', layer: 'ground', walk: true },
    '~': { id: 'shallow', name: '淺池水', layer: 'ground', walk: true, anim: true, water: true, sfx: 'splash' },
    'W': { id: 'deep', name: '深池水', layer: 'ground', walk: false, anim: true, water: true },
    's': { id: 'spring', name: '溫泉池階', layer: 'ground', walk: true, anim: true, water: true },
    '^': { id: 'plateau', name: '礦物台地', layer: 'ground', walk: true },
    'R': { id: 'rock', name: '岩', layer: 'ground', walk: false },
    '=': { id: 'bridge', name: '脈橋（根橋）', layer: 'ground', walk: true },
    '"': { id: 'tallgrass', name: '高草', layer: 'ground', walk: true },
    'x': { id: 'cracked', name: '乾裂活土（脈枯）', layer: 'ground', walk: true },
    '!': { id: 'vent', name: '硫氣孔', layer: 'ground', walk: true, anim: true, hazard: 4 },
    '_': { id: 'cavefloor', name: '導管洞地面', layer: 'ground', walk: true },
    '#': { id: 'cavewall', name: '導管洞壁', layer: 'ground', walk: false },
    ':': { id: 'floor', name: '屋內地板', layer: 'ground', walk: true },
    '|': { id: 'wall', name: '屋內牆', layer: 'ground', walk: false },
    'H': { id: 'housewall', name: '屋牆／屋頂（外觀；下方仍是 H 的格畫成屋頂，最下一列畫成牆面）', layer: 'ground', walk: false },
    'D': { id: 'door', name: '門', layer: 'ground', walk: true },
    '>': { id: 'stairs', name: '階梯', layer: 'ground', walk: true },
    '0': { id: 'void', name: '虛空（地圖外）', layer: 'ground', walk: false },
    // ---------- 物件層（' ' 或 '.' 代表空）----------
    'b': { id: 'bush', name: '靛藍灌叢', layer: 'object', walk: false },
    't': { id: 'bellgrass', name: '鐘管草', layer: 'object', walk: false, anim: true },
    'f': { id: 'flower', name: '發光花', layer: 'object', walk: true, anim: true, light: true },
    'Y': { id: 'tree', name: '管根樹（樹冠自動畫在上層）', layer: 'object', walk: false },
    'r': { id: 'boulder', name: '礦石塊', layer: 'object', walk: false },
    'n': { id: 'fence', name: '根籬', layer: 'object', walk: false },
    'P': { id: 'pipe', name: '導管根柱', layer: 'object', walk: false, anim: true, light: true },
    'k': { id: 'shelf', name: '櫃架（家具）', layer: 'object', walk: false },
    'c': { id: 'table', name: '桌（家具）', layer: 'object', walk: false },
    'p': { id: 'jars', name: '陶罐（家具）', layer: 'object', walk: false },
    'h': { id: 'hearth', name: '爐（家具）', layer: 'object', walk: false, anim: true, light: true },
    'm': { id: 'mat', name: '菌絲氈墊（家具）', layer: 'object', walk: true },
    // ---------- 上層遮蔽（' ' 或 '.' 代表空）----------
    'o': { id: 'canopy', name: '葉蓋（上層遮蔽）', layer: 'overlay' },
    'a': { id: 'roots', name: '垂根（上層遮蔽）', layer: 'overlay' }
  };
  V.EMPTY_CHARS = { ' ': true, '.': true };
})(typeof window !== 'undefined' ? window : this);

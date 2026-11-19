/*
 * 3D 場景配置：資料檔只有平面格狀地圖，高度、景深、天空與光線在這裡設計。
 * 每張地圖一筆；沒有配置的地圖（例如後續章節新增的地圖）依 tone 套用預設值，照樣能走。
 *
 *   kind:     'outdoor'（預設）｜'cave'｜'indoor'
 *   rows:     [[y0, y1, h0, h1], …]  第 y0 列到第 y1 列的基準高度由 h0 線性變到 h1（其餘列為 0）
 *   chasm:    true＝深水格是峽谷（水面在很深的下方），用在脈橋
 *   cliff:    岩格隆起的高度（預設 2.4）
 *   margin:   地圖外延伸的地形寬度（格）
 *   sun:      { az: 方位角（度，0＝北、90＝東）, el: 仰角（度） }
 *   yaw:      進入地圖時的預設鏡頭方位（弧度；0＝從南往北看，與 2D 版的上方一致）
 *   pitch／dist：預設俯角與距離
 *   steam:    [[x, y, 數量], …] 溫泉蒸氣
 */
(function () {
  'use strict';
  var V = window.VELLORA;
  var L = V.layouts3d = {};

  L.maps = {
    'map.miststep.station': {
      kind: 'outdoor', margin: 14, cliff: 2.6, sun: { az: 105, el: 30 },
      steam: [[16, 14, 10], [14, 12, 6], [19, 15, 6]]
    },
    // 熱柱上方的階梯溫泉池：三層池台，最上層是泉源
    'map.miststep.terrace': {
      kind: 'outdoor', margin: 14, cliff: 2.2, sun: { az: 100, el: 28 },
      rows: [[0, 7, 4.2, 4.2], [8, 9, 4.2, 2.1], [10, 16, 2.1, 2.1], [17, 18, 2.1, 0], [19, 31, 0, 0]],
      steam: [[19, 4, 14], [16, 3, 6], [22, 3, 6], [19, 13, 10], [16, 12, 5], [22, 14, 5], [19, 21, 8], [16, 20, 5], [22, 22, 5]]
    },
    'map.miststep.soilflat': { kind: 'outdoor', margin: 14, cliff: 2.2, sun: { az: 110, el: 32 } },
    // 脈橋：活體根橋跨過深谷；橋腹下方是導管洞
    'map.miststep.bridge': { kind: 'outdoor', margin: 10, cliff: 2.8, chasm: true, sun: { az: 100, el: 28 } },
    'map.miststep.conduit_upper': { kind: 'cave', margin: 3, cliff: 2.3, pitch: 0.98, dist: 8.5 },
    'map.miststep.conduit_lower': { kind: 'cave', margin: 3, cliff: 2.3, pitch: 0.98, dist: 8.5 },
    'map.miststep.sheds': { kind: 'indoor', margin: 0, pitch: 1.02, dist: 8.2 }
  };

  L.get = function (mapId, tone) {
    var c = L.maps[mapId];
    if (c) return c;
    if (tone === 'cave') return { kind: 'cave', margin: 3, cliff: 2.3, pitch: 0.98, dist: 8.5 };
    if (tone === 'indoor') return { kind: 'indoor', margin: 0, pitch: 1.02, dist: 8.2 };
    return { kind: 'outdoor', margin: 12, cliff: 2.4 };
  };
  // 基準高度（連續座標，單位：格）
  L.baseHeight = function (cfg, y) {
    var rows = cfg.rows; if (!rows) return 0;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (y >= r[0] && y < r[1] + 1) {
        if (r[1] + 1 === r[0]) return r[2];
        var t = (y - r[0]) / (r[1] + 1 - r[0]);
        return r[2] + (r[3] - r[2]) * Math.max(0, Math.min(1, t));
      }
    }
    if (y < rows[0][0]) return rows[0][2];
    return rows[rows.length - 1][3];
  };
})();

/*
 * 正式資料清單：序章〈味變〉。依載入順序列出（後寫的同 id 覆蓋先寫的）。
 * 清單為空時，index.html 會自動改載入 js/data-demo/ 的測試房；?demo=1 可強制開測試房。
 * 資料格式見 docs/ENGINE.md；寫完後請執行 node tools/validate-data.js。
 */
(function (root) {
  root.VELLORA = root.VELLORA || {};
  root.VELLORA.dataManifest = root.VELLORA.dataManifest || {};
  root.VELLORA.dataManifest.official = [
    'js/data/meta.js',
    'js/data/items.js',
    'js/data/encounters.js',
    'js/data/folios.js',
    'js/data/maps-tiles.js',
    'js/data/maps-station.js',
    'js/data/maps-wild.js',
    'js/data/maps-conduit.js',
    'js/data/story-main-1.js',
    'js/data/story-main-2.js',
    'js/data/story-main-3.js',
    'js/data/story-side.js',
    'js/data/story-residents.js'
  ];
})(typeof window !== 'undefined' ? window : this);

/* 測試房資料清單（?demo=1 或正式清單為空時載入）。 */
(function (root) {
  root.VELLORA = root.VELLORA || {};
  root.VELLORA.dataManifest = root.VELLORA.dataManifest || {};
  root.VELLORA.dataManifest.demo = [
    'js/data-demo/meta.js',
    'js/data-demo/items.js',
    'js/data-demo/encounters.js',
    'js/data-demo/maps.js',
    'js/data-demo/story.js'
  ];
})(typeof window !== 'undefined' ? window : this);

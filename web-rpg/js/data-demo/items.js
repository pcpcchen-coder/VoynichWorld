/*
 * 測試房：物品、調劑配方、以物易物。
 * cat：sample 樣本／medicine 處置藥／consumable 消耗品／key 重要物品
 */
(function (V) {
  'use strict';
  var D = V.data;

  D.items = {
    'item.sugar_ticket': { name: '池糖籤', cat: 'key', icon: { shape: 'ticket', color: '#D8CCB3' }, desc: '池站配給的憑證，以物易物時計價用。' },
    'key.gloves': { name: '封掌套', cat: 'key', icon: { shape: 'gloves', color: '#2B7D79' }, desc: '防護時戴上：體力傷害與感官灌入減半。' },
    'con.rinse': { name: '味覺沖洗液', cat: 'consumable', icon: { shape: 'vial', color: '#9fe3dc' }, desc: '漱一口，舌根清爽。感官負荷 −12，清除味覺殘留。',
      use: { load: -12, clearResidue: true } },
    'con.cake': { name: '苔餅', cat: 'consumable', icon: { shape: 'pouch', color: '#98613C' }, desc: '烤過的靛苔餅。體力 +10。', use: { stamina: 10 } },
    'smp.ash_moss': { name: '灰苔', cat: 'sample', icon: { shape: 'leaf', color: '#8a8f86' }, desc: '池邊石縫的灰色苔。燒過可以中和鹹味。' },
    'smp.mite': { name: '縫葉嘴膜', cat: 'sample', icon: { shape: 'shell', color: '#73D6D0' }, desc: '五嘴縫葉穩定後脫下的一片嘴膜。' },
    'med.ash': { name: '燼灰', cat: 'medicine', treats: '鹹', icon: { shape: 'pouch', color: '#c58a52' }, desc: '中和「鹹」的處置藥。' },
    'med.indigo': { name: '靛乳', cat: 'medicine', treats: '焦', icon: { shape: 'drop', color: '#5b7bd6' }, desc: '疏通「焦」的處置藥。' }
  };

  D.recipes = {
    'rcp.ash': { name: '燼灰', inputs: { 'smp.ash_moss': 1 }, output: 'med.ash', count: 2, flags: ['flag.demo.brewed'],
      desc: '把灰苔放在味診台的溫石上烘乾、碾碎。' }
  };

  D.shops = {
    'shop.elder': { name: '老聆的雜物籃',
      stock: [{ item: 'con.cake', price: 1 }, { item: 'med.indigo', price: 1 }],
      buys: [{ item: 'smp.ash_moss', price: 1 }] }
  };
})(window.VELLORA);

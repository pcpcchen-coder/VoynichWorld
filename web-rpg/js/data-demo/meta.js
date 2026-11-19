/*
 * 測試房：基本設定、起始狀態、等級表、手技、區域、教學、詞彙。
 * 用途：覆蓋引擎每一項功能，供 tests/smoke.js 自動走完；也是 docs/ENGINE.md 的活範例。
 * 這裡的內容不是正式劇情。
 */
(function (V) {
  'use strict';
  var D = V.data;

  D.meta = {
    id: 'vellora-demo',
    title: '薇蘿：葉帖紀行',
    chapter: '測試房',
    currency: 'item.sugar_ticket',
    titleImage: 'assets/title.jpg',
    // battleRules: { tasteHighLoad: 4 },   // 需要時可覆寫遭遇數值（見 ENGINE.md）
    endings: {
      default: {
        kicker: '測試房・完',
        title: '一張葉帖的重量',
        image: 'assets/ending.jpg',
        text: [
          '池水的味道還沒完全回來，但五嘴縫葉的呼吸已經跟上了水聲。',
          '珂潾把第一張葉帖收進帖匣。帖匣很輕。她知道之後會越來越重。'
        ],
        note: '這是引擎測試房的結尾。正式的序章〈味變〉劇本在 docs/script/ch00-prologue.md，後續章節在 docs/script/。',
        allowContinue: true
      }
    }
  };

  D.start = {
    map: 'demo.village', at: 'S', dir: 'down',
    name: '珂潾',
    sprite: { hair: '#1e2440', cloth: '#D8CCB3', accent: '#2B7D79', style: 'bob' },
    items: { 'item.sugar_ticket': 2, 'key.gloves': 1, 'con.rinse': 1 },
    flags: {},
    cutscene: 'cs.demo.intro'
  };

  // 成長表（序章 §4.1）。load＝感官負荷上限（點數）；learn＝升到該級時學會的手技
  D.levels = [
    { level: 1, exp: 0, stamina: 30, load: 40 },
    { level: 2, exp: 30, stamina: 36, load: 46, learn: 'skill.double_read' },
    { level: 3, exp: 80, stamina: 42, load: 52, learn: 'skill.steady_palm' },
    { level: 4, exp: 150, stamina: 50, load: 58, learn: 'skill.backwash' },
    { level: 5, exp: 240, stamina: 58, load: 64, learn: 'skill.triple_read' }
  ];

  // 手技：unlock＝解鎖遭遇指令（tasteLow 低稀釋、clear 清淤、rinse 回沖、isolate 隔離）；passive＝被動數值
  D.skills = {
    'skill.double_read': { name: '一口兩讀', desc: '解鎖低稀釋嚐味：一次讀 2 個味符（負荷 +10，可能留下味覺殘留）。', unlock: 'tasteLow', passive: { tasteLow: 2 } },
    'skill.steady_palm': { name: '穩掌', desc: '防護的回合，感官負荷額外 −6。', passive: { guardLoad: 6 } },
    'skill.backwash': { name: '回沖', desc: '每場遭遇 1 次：不耗物品，佔一回合，感官負荷 −15。', unlock: 'rinse' },
    'skill.triple_read': { name: '三讀', desc: '低稀釋嚐味改為一次讀 3 個味符。', passive: { tasteLow: 3 } },
    'skill.clear': { name: '清淤', desc: '最前面是「腥」時徒手清除汲蟲淤堵（體力 −4）；不是腥就是誤治。' }
  };
  D.skills['skill.clear'].unlock = 'clear';

  // 區域：連通度起始值與脈況階段（taste_shift 味變 → mist_recede 霧退 → slow_flow 流慢 → sealed 封脈 → withered 乾化）
  D.zones = {
    miststep: { name: '初泉環・霧階', start: 62, vein: 'taste_shift' }
  };

  // 教學（選單「教學」可重看看過的）
  D.tutorials = {
    'T-00': { title: '操作', pages: [
      { title: '移動與調查', text: '方向鍵／WASD 移動，Z／Enter／空白 調查與確認，X／Esc 取消或打開選單。\n手機：左下方向鍵移動，A 確認、B 取消，右上 ≡ 開選單。對話框可以直接點。' },
      { title: '頭上的「！」', text: '人物或物件頭上出現「！」，代表那裡有新的事情。' }] },
    'T-01': { title: '首次嚐味', pages: [
      { title: '味序', text: '每個對象身上都有一串依到達順序排列的味道，叫「味序」。先到的在左邊。' },
      { title: '嚐味・高稀釋', text: '高稀釋一次只讀出一個還沒讀過的味符，感官負荷 +4。\n這一次只需要讀，不需要治。' }] },
    'T-02': { title: '處置', pages: [
      { title: '只治最前面的', text: '「處置」只作用在排在最前面的味符。對症的藥會讓它消失、對象失衡下降。' },
      { title: '誤治', text: '藥不對症就是誤治：對象失衡上升，那一回合牠的反應會更猛。\n甜是健康的糖流，不要處置；回合結束它會自己流走。' },
      { title: '感官負荷', text: '負荷到上限的 70% 以上，讀值可能是假的（文字會晃）；滿了就不能嚐。防護、沖洗液與休息可以降低負荷。' }] },
    'T-03': { title: '調劑', pages: [
      { title: '味診台', text: '在味診台把採來的材料調成處置藥。藥不夠時，先回味診台。' }] },
    'T-04': { title: '葉帖', pages: [
      { title: '看・採・嚐・畫', text: '一張葉帖要先「觀察」、再「取樣」、再「診斷」，三項齊備後到選單「葉帖」繪製。' }] }
  };

  D.glossary = {
    'g.sequence': { term: '味序', text: '對象身上依到達順序排列的味道。先到的，是它想讓妳知道的；後到的，是它藏不住的。' },
    'g.ticket': { term: '池糖籤', text: '池站配給的憑證。薇蘿沒有通用貨幣，以物易物時用池糖籤與樣本計價。' }
  };
})(window.VELLORA);

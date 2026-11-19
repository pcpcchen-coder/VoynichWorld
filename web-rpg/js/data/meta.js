/*
 * 序章〈味變〉：基本設定、起始狀態、成長表、手技、區域、教學、詞彙、角色外觀、章末畫面。
 * 內容來源：docs/script/ch00-prologue.md（§0、§4、§6、§12、§13）。
 */
(function (V) {
  'use strict';
  var D = V.data;

  D.meta = {
    id: 'vellora-ch00',
    title: '薇蘿：葉帖紀行',
    chapter: '序章〈味變〉',
    currency: 'item.currency.sugar_tally',
    titleImage: 'assets/title.jpg',
    // §4.2 的數值即引擎預設；以下為序章專用的擴充設定（見 ENGINE.md §19）
    battleRules: {
      isolateAutoRead: 10,                         // 隔離前若味序未讀全，自動補嚐（負荷 +10）
      mistreatFlag: 'stat.prologue.mistreat_count', // 本章累計誤治次數（F-174 筆記用）
      noisyTutorial: 'T-11'                        // 負荷第一次超過 70%
    },
    ventDamage: 3,            // §5.1 圖例：硫氣孔踩上體力 −3
    autoDrawFolios: true,     // §11：三項條件達成時自動播放繪製演出
    gatherRespawn: true,      // §10.5：採集點在種源龕或床休息後重生
    bankReward: { item: 'item.currency.sugar_tally', per: 1 },   // 診斷樣本入庫每件換 1 支池糖籤
    // 擴充：目前目標（HUD 一行＋任務日誌）。由上而下取第一個條件成立的項目；只寫地點與方向，不新增劇情。
    objectives: (function () {
      var Q = 'quest:quest.main.p0_taste_shift', P = 'flag.prologue.';
      return [
        { cond: [Q + '@s1', '!' + P + 'tasted_first_pool'], text: '往西走到池岸的取樣點（池邊的取樣罐），面向它按確認取樣' },
        { cond: [Q + '@s1'], text: '繞到初階池西岸，把讀值告訴蒲嬤' },
        { cond: [Q + '@s2', '!' + P + 'observed_station_bellpipe'], text: '巡檢：池站北側、池子上方的鐘管草叢（老聆在旁邊）' },
        { cond: [Q + '@s2', '!' + P + 'round_gauge'], text: '巡檢：池子西岸的水位尺，先跟汐伯說話' },
        { cond: [Q + '@s2', '!' + P + 'round_filter'], text: '巡檢：池站東北角的孢子濾幕，先跟紗說話' },
        { cond: [Q + '@s2', '!' + P + 'round_shrine'], text: '巡檢：池站南邊的種源龕，先跟樅爺說話' },
        { cond: [Q + '@s2', '!' + P + 'suture_stabilized'], text: '去池子東北的嫁接棚，看那株在鬧的縫葉' },
        { cond: [Q + '@s2', '!' + P + 'first_compound_done'], text: '池子東岸的味診台：四味各調一份' },
        { cond: [Q + '@s2'], text: '回池守棚找蒲嬤（池站西北角的門）' },
        { cond: [Q + '@s3', '!' + P + 'terrace_seen'], text: '從池站正北的北口上階梯泉' },
        { cond: [Q + '@s3', '!' + P + 'tasted_spring_source'], text: '階梯泉：一路往北上到三階泉源取樣（途中處理擋路的滲口）' },
        { cond: [Q + '@s3'], text: '回池站：從階梯泉南端下去' },
        { cond: [Q + '@s4'], text: '池站：查看水位尺旁的池面' },
        { cond: [Q + '@s5', '!' + P + 'bridge_open'], text: '從池站東口進活土原，往東穿過去，到橋頭找篙' },
        { cond: [Q + '@s5'], text: '活土原東端上脈橋，在橋上找下橋腹的路' },
        { cond: [Q + '@s6', '!' + P + 'embolus_cleared', '!' + P + 'embolus_isolated'], text: '橋腹上層：聽根管的音，往最低的那一支走（中間往南）' },
        { cond: [Q + '@s6', P + 'embolus_cleared', '!' + P + 'valve_upper_open'], text: '按栓塞後方的上層活瓣，讓淹水的階梯退水' },
        { cond: [Q + '@s6', P + 'embolus_isolated', '!' + P + 'k_cut'], text: '中支管夾死了：去上層東支的空管，割開痂膜' },
        { cond: [Q + '@s6', '!' + P + 'lower_seen'], text: '往南下到橋腹下層' },
        { cond: [Q + '@s6', '!' + P + 'slowarch_recognized'], text: '下層：用活瓣甲、乙讓兩座水池輪流變淺，往東通道走' },
        { cond: [Q + '@s6'], text: '東通道盡頭往南，進舊接口前廳' },
        { cond: [Q + '@s7', '!' + P + 'got_auri_leaf'], text: '前廳西牆的裂縫後面：查看龕室的壁龕' },
        { cond: [Q + '@s7', '!' + P + 'puma_confessed'], text: '回池站，進池守棚（西北角的門）找蒲嬤' },
        { cond: [Q + '@s7'], text: '從池站正北的北口出發（出發前可以和大家說說話）' }
      ];
    })(),
    sideQuestClose: { flag: 'flag.prologue.puma_confessed', label: '沒來得及' },   // §8：進入 P3 後未完成的支線自動關閉，日誌標記「沒來得及」
    medCap: 9,                // §10.2：每種處置藥持有上限 9
    endings: {
      default: {
        kicker: '序章〈味變〉・完',
        title: '霧階，這個長晨',
        image: 'assets/ending.jpg',
        hideDims: true,
        text: [
          '初階池：七刻，緩漲。比該漲的慢。',
          '〔若 flag.prologue.embolus_cleared〕橋腹中支管：通了。汲蟲的亮點還沒回來。',
          '〔若 flag.prologue.embolus_isolated〕橋腹中支管：夾閉。站裡不再漂來死蟲，那條管也不再有水。',
          '〔若 flag.prologue.slowarch_stabilized〕慢拱：安靜。左中肢先落地。',
          '〔若 flag.prologue.slowarch_isolated〕慢拱：隔離。會喝糖液。還在頂牆。',
          '〔若 flag.prologue.seal_reopened〕舊接口：留了一條細流。每個長晨有人下去嚐。',
          '〔若 flag.prologue.seal_reinforced〕舊接口：補牢。橋腹東側立了霧階自己的樁和灰繩。',
          '〔若 flag.prologue.seal_kept〕舊接口：原樣。圖一式兩份，一份留站。',
          '〔若 flag.prologue.report_full〕送記脈院的那一份：寫了全部。第一個名字是蒲。',
          '〔若 flag.prologue.report_partial〕送記脈院的那一份：寫了水和管子，沒有寫手。',
          '〔若 flag.prologue.report_shared〕這一旬沒有送。味診台前排了四十幾個人，一人一口。',
          '〔若 flag.prologue.filter_cut〕濾幕中幅：有一塊補丁，還沒長合。',
          '〔若 flag.prologue.filter_repaired〕濾幕中幅：完整。',
          '葉帖：6 張（另有一張不是我畫的）。',
          '霧階的連通度：{conn:miststep}（進場 62）。',
          '霧階脈況：流慢。'
        ],
        after: [
          '三階以上，水一階一階地不再回答。',
          '珂潾在那裡遇見一個急著把種子種下去的老同窗，也第一次看見一條別人已經畫好的線。',
          '線的這一邊，她說還能救。線的那一邊，有人已經在數風向。',
          '第一章〈階梯泉〉——往上，看水從哪一階開始不回答。'
        ],
        note: '本作的當地角色、地名、植物暫名與葉帖配對皆為遊戲虛構，不是對《伏尼契手稿》的翻譯或解讀。第一章起的劇本收錄於 docs/script/（尚未實作為可玩內容）。',
        allowContinue: true
      }
    }
  };

  D.start = {
    map: 'map.miststep.station', x: 24, y: 18, dir: 'left',
    name: '珂潾',
    sprite: { hair: '#1e2440', cloth: '#D8CCB3', accent: '#2B7D79', style: 'bob' },
    items: {},
    flags: {},
    respawn: { map: 'map.miststep.station', x: 17, y: 24 },
    cutscene: 'cs.p0.m0_01'
  };

  // §4.1 成長表
  D.levels = [
    { level: 1, exp: 0, stamina: 30, load: 40 },
    { level: 2, exp: 30, stamina: 36, load: 46, learn: 'skill.double_read', tutorial: 'T-09' },
    { level: 3, exp: 80, stamina: 42, load: 52, learn: 'skill.steady_palm' },
    { level: 4, exp: 150, stamina: 50, load: 58, learn: 'skill.backwash' },
    { level: 5, exp: 240, stamina: 58, load: 64, learn: 'skill.triple_read' }
  ];

  D.skills = {
    'skill.double_read': { name: '一口兩讀', desc: '解鎖低稀釋嚐味（一次讀 2 個味符）。', unlock: 'tasteLow', passive: { tasteLow: 2 } },
    'skill.steady_palm': { name: '穩掌', desc: '防護的回合額外讓感官負荷 −6。', passive: { guardLoad: 6 } },
    'skill.backwash': { name: '回沖', desc: '每場遭遇 1 次，不耗物品，耗一回合，感官負荷 −15。', unlock: 'rinse' },
    'skill.triple_read': { name: '三讀', desc: '低稀釋嚐味改為一次讀 3 個味符。', passive: { tasteLow: 3 } },
    'skill.desilt': { name: '清淤', desc: '最前面是「腥」時消除它，對象失衡 −10；不是腥則誤治。體力 −4。', unlock: 'clear' }
  };

  D.zones = {
    miststep: { name: '初泉環・霧階', start: 62, vein: 'taste_shift' }
  };

  function tut(title, html) { return { title: title, pages: [{ title: title, html: '<p>' + html + '</p>' }] }; }
  D.tutorials = {
    'T-00': { title: '操作', pages: [
      { title: '移動與調查', text: '方向鍵／WASD 移動，Z／Enter／空白 調查與確認，X／Esc 取消或打開選單。\n手機：左下方向鍵移動，A 確認、B 取消，右上 ≡ 開選單。對話框可以直接點。' },
      { title: '頭上的「！」', text: '人物或物件頭上出現「！」，代表那裡有新的事情。任務目標可在選單「任務」查看。' }] },
    'T-01': tut('嚐味', '織脈者不直接嚐。先取樣，兌淨水，再點在舌尖。選「嚐味」→「高稀釋」：一次只讀到一個味道，對感官的負擔最小。味道會照<b>到達的順序</b>一個一個出現——順序本身就是訊息。請連續嚐三次，把這一口水讀完。'),
    'T-02': tut('處置', '藥只對<b>排在最前面</b>的那個味道有效。鹹用燼灰，苦用縫苦，焦用靛乳，澀用池糖液。還沒嚐就下藥也可以，但下錯了，對象會更不穩，還會反過來傷到妳。先嚐，再治。'),
    'T-03': tut('調劑', '樣本要在味診台調成藥才能用。同一樣東西，兌得淡是訊號，兌得剛好是藥，兌得濃是毒。每一味的「剛好」不一樣——請替縫苦選一個劑量。'),
    'T-03b': tut('調劑清單', '之後在味診台可以直接選配方。材料不夠的配方會變暗。淨池水在站裡的淨水槽取之不盡。出門前，四味各帶幾份。'),
    'T-04': tut('葉帖', '一張對摺的犢皮就是一則完整的記錄。看過（觀察）、採過（取樣）、嚐過（診斷），三樣齊了，珂潾就會把它畫下來。葉帖不裝訂，只用繩帶束著——這一疊，就是妳這趟路的進度。'),
    'T-05': tut('甜不用治', '甜是健康的糖流，不是病。甜排到最前面的時候，<b>什麼藥都不要下</b>：嚐味、防護、用物品都可以，過一回合它自己會流走。對甜下藥會傷到還好好的那一部分。'),
    'T-06': tut('觀察', '發亮的小圈是觀察點。停下來看，珂潾會報出她看到的東西。有些答案不在味道裡，在聲音、光和水位裡。'),
    'T-07': tut('種源龕', '把手放在種源龕上：記下進度，體力與感官負荷回復，採集點重新長出來。診斷樣本可以放進龕裡入庫，每件換一支池糖籤。體力歸零時，妳會回到最後碰過的那座龕，沒入庫的診斷樣本會掉一半。'),
    'T-08': tut('隔離／切除', '封脈夾可以立刻結束一場遭遇：夾住，收口，那一段就從網裡斷開。很快，也很乾淨。代價是拿不到樣本，這一帶的連通會變差——而且夾下去的，不會自己長回來。它是工具，不是失敗。什麼時候用，由妳決定。'),
    'T-09': tut('低稀釋', '現在可以選「低稀釋」：一口讀兩個味道，省回合，但感官負擔大得多，還可能留下<b>味覺殘留</b>——下一口的第一個味道會被上一口蓋住。防護一回合，或用味覺沖洗液，可以把殘留洗掉。'),
    'T-10': tut('清淤', '腥沒有藥。腥排在最前面時，選「清淤」：封好掌套，順著水流的方向把堵住的東西撥出來。每次耗 4 點體力。'),
    'T-11': tut('感官負荷', '妳嚐得太多、太濃了。負荷超過七成，讀到的味道<b>可能是假的</b>——文字會微微晃動。超過十成，這一回合就嚐不出任何東西。用味覺沖洗液，或防護一回合讓舌頭休息。嚐不準的時候下藥，比不下藥更危險。'),
    'T-12': tut('活土承重', '活土是活的，不能重壓。站裡的路都墊著浮基，把重量攤開。乾裂的地方，骨白發亮的是空殼，會塌；還長著草的，底下還在喝水，可以踩——一次一個人，不要並肩。')
  };

  D.glossary = {};

  // §6 角色表（外觀為製作設定）
  D.actors = {
    'npc.pu_ma': { name: '蒲嬤', sprite: { hair: '#cfc8b8', skin: '#c9a27f', cloth: '#5a4636', accent: '#2B7D79', style: 'bun' } },
    'npc.xi_bo': { name: '汐伯', sprite: { hair: '#6b6258', skin: '#c49a76', cloth: '#3e5a5a', accent: '#D8CCB3', style: 'tall' } },
    'npc.xie_yi': { name: '楔姨', sprite: { hair: '#3a2418', skin: '#d4ad86', cloth: '#7a5a2e', accent: '#8fc9a3', style: 'bun' } },
    'npc.lao_ling': { name: '老聆', sprite: { hair: '#d8d2c4', skin: '#c49a76', cloth: '#4a4060', accent: '#98613C', style: 'hood', hood: '#5d5270' } },
    'npc.sha': { name: '紗', sprite: { hair: '#2a2030', skin: '#e2bf98', cloth: '#9a8f7c', accent: '#73D6D0', style: 'bob' } },
    'npc.suo': { name: '梭', sprite: { hair: '#2e2620', skin: '#b98a63', cloth: '#5c6b3a', accent: '#c58a52', style: 'hood', hood: '#6a5a3a' } },
    'npc.yaya': { name: '芽芽', sprite: { hair: '#3a2418', skin: '#e8c6a0', cloth: '#D66A32', accent: '#73D6D0', style: 'bob' } },
    'npc.li': { name: '礫', sprite: { hair: '#3a2418', skin: '#e2bf98', cloth: '#2B7D79', accent: '#c9bc9f', style: 'tall' } },
    'npc.cong_ye': { name: '樅爺', sprite: { hair: '#efeae0', skin: '#c49a76', cloth: '#5a4f4c', accent: '#73D6D0', style: 'hood', hood: '#4a403c' } },
    'npc.chun_shen': { name: '蓴嬸', sprite: { hair: '#4a3020', skin: '#d4ad86', cloth: '#8a3e2a', accent: '#D8CCB3', style: 'bun' } },
    'npc.gao': { name: '篙', sprite: { hair: '#1e1a18', skin: '#b98a63', cloth: '#3a4a3a', accent: '#98613C', style: 'tall' } },
    'npc.xu': { name: '絮', sprite: { hair: '#2a2030', skin: '#e2bf98', cloth: '#6a7a8a', accent: '#D8CCB3', style: 'bob' } },
    'npc.luo': { name: '絡', sprite: { hair: '#2e2620', skin: '#c49a76', cloth: '#4d4560', accent: '#c9bc9f', style: 'tall' } }
  };
})(window.VELLORA);

/*
 * 序章〈味變〉：居民對話入口（§8.6）。每位居民一個 dlg.p0.npc.*：
 * 先檢查可接取／可回報的任務對白（主線、支線），再依 P3 → P2 → P1 顯示日常對白。
 */
(function (V) {
  'use strict';
  var D = V.data, G = D.dialogues;
  var Q = 'quest.main.p0_taste_shift';
  var P1 = '!flag.prologue.drawmites_dying', P3 = 'flag.prologue.puma_confessed', NOT_P3 = '!flag.prologue.puma_confessed';
  var S2 = 'quest:' + Q + '@s2';

  // 小工具：branch 清單＋每個節點都是「播一段後結束」或「播一段對話 id」
  function npc(branches, nodes) {
    var n = { hub: { branch: branches.map(function (b) { return { cond: b[0], next: b[1] }; }), next: null } };
    Object.keys(nodes).forEach(function (k) {
      var v = nodes[k];
      n[k] = typeof v === 'string' ? { text: [], actions: [['dialogue', v]], next: null } : { text: v, next: null };
    });
    return { start: 'hub', nodes: n };
  }

  // ---- 蒲嬤（池守棚內）----
  G['dlg.p0.npc.pu_ma'] = npc([
    [['flag.prologue.got_auri_leaf', NOT_P3], 'confess'],
    [P3, 'p3'],
    [[S2, 'flag.prologue.observed_station_bellpipe', 'flag.prologue.round_gauge', 'flag.prologue.round_filter', 'flag.prologue.round_shrine', 'flag.prologue.suture_stabilized', 'flag.prologue.first_compound_done'], 'clamp'],
    [true, 'p1']
  ], {
    confess: 'dlg.p0.m0_17',
    clamp: 'dlg.p0.m0_07_puma',
    p1: ['蒲嬤：巡完再來。尺、幕、龕、台，四樣。', '蒲嬤：妳小時候最討厭巡檢，說每天都一樣。每天都一樣，是池守求之不得的事。'],
    p3: ['蒲嬤：我叫絮把灰罐洗了，放回架上。空的。空的也要放在看得見的地方。', '蒲嬤：妳往上走，嚐到什麼都寫。寫了叫人帶回來，我嚐不到，我可以用聽的。',
      '〔若 flag.prologue.report_shared〕蒲嬤：明天長晨，味診台。我會站在那裡。妳不在也一樣，我自己說。']
  });

  // ---- 汐伯 ----
  G['dlg.p0.npc.xi_bo'] = npc([
    [['quest:quest.side.p0_tide_marks=active', 'flag.prologue.tide_read_terrace', 'flag.prologue.tide_read_soilflat'], 'report'],
    [[S2, '!flag.prologue.talked_xibo'], 'intro'],
    [['flag.prologue.round_gauge', '!quest:quest.side.p0_tide_marks', NOT_P3], 'offer'],
    [P3, 'p3'], ['flag.prologue.drawmites_dying', 'p2'], [true, 'p1']
  ], {
    report: 'dlg.p0.s0_1_report', intro: 'dlg.p0.m0_05_xibo', offer: 'dlg.p0.s0_1_offer',
    p1: ['汐伯：七刻一分。妳再問一次，還是七刻一分。', '汐伯：稜月滿的日子不要洗頭，會掉頭髮。這曆上沒寫，是我師傅說的。'],
    p2: ['汐伯：該漲不漲。該退——我看它等一下也不會退。', '汐伯：尺沒壞。我換過一把對過了。是水不照曆走。四十年，第一次是水不照曆走。'],
    p3: ['汐伯：我把三個月前那一夜的曆翻出來了。靜潮，墨月最瘦。我寫的是「無事」。', '汐伯：我要在旁邊補兩個字。曆是不能塗改的，只能補。']
  });

  // ---- 楔姨（五嘴也用這段）----
  G['dlg.p0.npc.xie_yi'] = npc([
    [[S2, '!flag.prologue.suture_stabilized', 'flag.prologue.m0_06_started'], 'retry'],
    [[S2, '!flag.prologue.suture_stabilized'], 'm0_06'],
    [P3, 'p3'], ['flag.prologue.drawmites_dying', 'p2'], ['flag.prologue.suture_stabilized', 'p1b'], [true, 'p1a']
  ], {
    retry: 'dlg.p0.m0_06_retry', m0_06: 'dlg.p0.m0_06',
    p1a: ['楔姨：五嘴在鬧，妳來不來？不來我要拿繩子把它綁開了。'],
    p1b: ['楔姨：五嘴今天五片葉朝同一個方向。難得。我不敢誇它，一誇它又鬧。', '楔姨：缺縫葉就自己去那邊割，刺的那圈。一次兩片，割多了我會知道。'],
    p2: ['楔姨：五嘴的縫又亮了一點。不是鬧，是它也聽到了。植物聽得比人早。', '楔姨：我把還沒接穩的枝都搬進棚了。接口最怕這種時候，水一慢，癒合膠就乾不透。'],
    p3: ['楔姨：蒲那個人，夾子用得比我的刀還準。準的人最危險，因為她自己看不出哪裡不對。', '楔姨：妳往上走，看到沒見過的縫法，畫下來寄給我。畫胖一點沒關係。']
  });

  // ---- 老聆 ----
  G['dlg.p0.npc.lao_ling'] = npc([
    [[S2, '!flag.prologue.m0_04_seen'], 'm0_04'],
    [[P3, 'flag.prologue.embolus_isolated'], 'p3b'], [P3, 'p3a'], ['flag.prologue.drawmites_dying', 'p2'], [true, 'p1']
  ], {
    m0_04: 'dlg.p0.m0_04',
    p1: ['老聆：（很大聲）三個音！高的管短，低的管長！水漲吹長的，水退吹短的！', '老聆：妳不用點頭，我看不到，我在聽地。'],
    p2: ['老聆：一個音。四十年我沒聽過它們只剩一個音。', '老聆：它們不是在叫，丫頭。它們是停不下來。這兩件事不一樣。'],
    p3a: ['老聆：換氣了！妳聽，一長一短！底音還低，可是它換氣了！', '老聆：（忽然小聲）橋底下那個刮牆的聲音，我也聽了三個月。我以為是我右邊那隻耳朵在作怪。'],
    p3b: ['老聆：橋那一路不響了。不是好了，是那條管沒水可以吹了。少一個音，我的曆要重寫。', '老聆：（忽然小聲）橋底下那個刮牆的聲音，我也聽了三個月。我以為是我右邊那隻耳朵在作怪。']
  });

  // ---- 紗 ----
  G['dlg.p0.npc.sha'] = npc([
    [[S2, '!flag.prologue.talked_sha'], 'intro'],
    [['flag.prologue.round_filter', '!quest:quest.side.p0_filter_spots', NOT_P3], 'offer'],
    [P3, 'p3'], [['flag.prologue.drawmites_dying', 'flag.prologue.filter_cut'], 'p2b'], ['flag.prologue.drawmites_dying', 'p2a'], [true, 'p1']
  ], {
    intro: 'dlg.p0.m0_05_sha', offer: 'dlg.p0.s0_2_offer',
    p1: ['紗：記脈院是不是有教人怎麼把一句話講成三句？「霧。邊界。兩個棚寬。」', '紗：我學得像不像？'],
    p2a: ['紗：霧退到幕上了。幕外面現在是清的——清的不是好事，清的表示沒東西飄過來。', '紗：我話很多的時候就是在怕。妳知道的。'],
    p2b: ['紗：洞補了，還沒長合。偏偏挑今天霧退。也好，進來的東西少一點。', '紗：蓴嬸不跟我講話了。她說她的湯有我的味道。'],
    p3: ['紗：所以妳又要走了。上次走是四年，這次呢？', '紗：不用回答。妳會說「資料不夠」。', '紗：下橋腹輪班的名單我排了，我排第一個。舌頭不好就兩個人一組，我跟絮一組，她怕，我話多，剛好。']
  });

  // ---- 梭（首項：換東西）----
  G['dlg.p0.npc.suo'] = {
    start: 'hub',
    nodes: {
      hub: {
        text: ['〔旁白〕梭的貨攤。多格種源匣背在他身上，從不離身。'],
        choices: [
          { text: '換東西', actions: [['shop', 'shop.p0.suo']], next: null },
          { text: '半透膜片', cond: 'quest:quest.side.p0_barter_gloves@s1', actions: [['dialogue', 'dlg.p0.s0_5_suo_patch']], next: null },
          { text: '封罐的池況湯', cond: ['quest:quest.side.p0_barter_gloves@s3', 'item:item.quest.sealed_soup'], actions: [['dialogue', 'dlg.p0.s0_5_suo_soup']], next: null },
          { text: '聊聊', next: 'talk' },
          { text: '離開', next: null }
        ]
      },
      talk: { branch: [{ cond: P3, next: 'p3' }, { cond: 'flag.prologue.drawmites_dying', next: 'p2' }], next: 'p1' },
      p1: { text: ['梭：霧階的霧比外環的甜。我每次來都多待一天，跟自己說是匣子要透氣。', '梭：這只匣不能給人提，不是信不過。裡面每一格都是一整套，倒一下，一套就少一樣。'], next: null },
      p2: { text: ['梭：我走過六個池站。蟲浮起來的，這是第三個。', '梭：前兩個，我走的時候，還沒有人肯說是什麼。妳們站至少有一個人在問。'], next: null },
      p3: { text: ['梭：我往靛丘走，會經過記脈院的外站。有信要帶嗎？', '梭：帶信不收籤。收一句話：下次我來，告訴我橋底下那一段後來怎麼了。'], next: null }
    }
  };

  // ---- 芽芽 ----
  G['dlg.p0.npc.yaya'] = npc([
    [['!quest:quest.side.p0_soft_ground', NOT_P3], 'offer'],
    [[P3, 'flag.prologue.slowarch_isolated'], 'p3b'], [P3, 'p3a'], ['flag.prologue.drawmites_dying', 'p2'], [true, 'p1']
  ], {
    offer: 'dlg.p0.s0_4_offer',
    p1: ['芽芽：這個是霧罩。裡面有三隻燈蛾。牠們以前住在慢慢背上。', '芽芽：慢慢跟別的拱背獸走了。蒲嬤說的。可是牠沒有跟我說再見，牠每次都會等我放完燈蛾才走。'],
    p2: ['芽芽：燈蛾今天一直撞罩子。往東邊撞。', '芽芽：牠們是不是知道慢慢在哪裡？'],
    p3a: ['芽芽：篙哥說等牠再好一點，要帶我去看。他說要站右邊。'],
    p3b: ['芽芽：我調了糖水。哥哥說我調太甜。慢慢喜歡甜的。']
  });

  // ---- 礫 ----
  G['dlg.p0.npc.li'] = npc([[P3, 'p3'], ['flag.prologue.drawmites_dying', 'p2'], [true, 'p1']], {
    p1: ['礫：珂潾姐，妳考我。這顆是哪裡的結晶？——等一下，不要說，我嚐。', '礫：……鹹。就鹹。這樣算嚐出來了嗎？', '珂潾：算嚐出一個字。一句話通常不只一個字。'],
    p2: ['礫：池子上面那些蟲，我撿了一隻想嚐，汐伯把我的手打掉了。', '礫：他說死的東西不能直接嚐，要兌水、要沖手。妳早上也有兌水嗎？', '珂潾：每一次。'],
    p3: ['礫：我寫了第一張。寫乾裂的那一塊。我寫「結晶變大，土變脆，同時發生」。', '礫：我沒有寫因為。我很想寫。']
  });

  // ---- 樅爺 ----
  G['dlg.p0.npc.cong_ye'] = npc([
    [['quest:quest.side.p0_shrine_slot=active', 'item:item.med.pool_sugar'], 'fill'],
    [[S2, '!flag.prologue.talked_congye'], 'intro'],
    [['flag.prologue.round_shrine', '!quest:quest.side.p0_shrine_slot', NOT_P3], 'offer'],
    [P3, 'p3'], ['flag.prologue.drawmites_dying', 'p2'], [true, 'p1']
  ], {
    fill: 'dlg.p0.s0_3_fill', intro: 'dlg.p0.m0_05_congye', offer: 'dlg.p0.s0_3_offer',
    p1: ['樅爺：龕裡現在是一百一十二只。上個霧季一百一十四。少的兩只不是丟了，是乾了。', '樅爺：妳叫什麼來著。……算了，妳的莢在第三層第五格。'],
    p2: ['樅爺：我把最下面兩層往上搬了。水要是不對，先壞的是底下。', '樅爺：人可以跑。莢不會跑，要有人替它跑。'],
    p3: ['樅爺：蒲來過了，站在龕前面站了很久，沒說話。我也沒說。有些話是放在龕裡的，不用拿出來。', '樅爺：妳帶著那個三點印的東西吧。那個人借的格子，我一直沒再借給別人。']
  });

  // ---- 蓴嬸（首項：一碗池況湯）----
  var SOUP_TAIL = ['〔若 flag.prologue.filter_cut〕〔旁白〕湯面浮著一層細孢，蓴嬸撈過了，沒撈乾淨。（只回復一半體力）', '〔若 !flag.prologue.filter_cut〕〔旁白〕（體力回滿）'];
  var SOUP_HEAL = [['if', 'flag.prologue.filter_cut', [['heal', '50%', 0]], [['heal', '100%', 0]]]];
  G['dlg.p0.soup'] = {
    start: 'hub',
    nodes: {
      hub: { branch: [{ cond: P3, next: 'p3' }, { cond: 'flag.prologue.drawmites_dying', next: 'p2' }], next: 'p1' },
      p1: { text: ['〔旁白〕池況湯。今天偏鹹，底下有一點涼的回味。喝完身上是暖的。'].concat(SOUP_TAIL), actions: SOUP_HEAL, next: null },
      p2: { text: ['〔旁白〕池況湯。鹹，有一點腥氣，蓴嬸多放了兩片菌毯壓著。'].concat(SOUP_TAIL), actions: SOUP_HEAL, next: null },
      p3: { text: ['〔旁白〕池況湯。鹹，苦，尾巴一點焦。今天蓴嬸沒有圓它。'].concat(SOUP_TAIL), actions: SOUP_HEAL, next: null }
    }
  };
  G['dlg.p0.npc.chun_shen'] = {
    start: 'hub',
    nodes: {
      hub: {
        text: ['蓴嬸：喝湯？'],
        choices: [
          { text: '一碗池況湯（1 支池糖籤）', cond: 'item:item.currency.sugar_tally', actions: [['take', 'item.currency.sugar_tally', 1], ['dialogue', 'dlg.p0.soup']], next: null },
          { text: '封一罐湯', cond: 'quest:quest.side.p0_barter_gloves@s2', actions: [['dialogue', 'dlg.p0.s0_5_chun']], next: null },
          { text: '聊聊', next: 'talk' },
          { text: '離開', next: null }
        ]
      },
      talk: { branch: [{ cond: P3, next: 'p3' }, { cond: ['flag.prologue.filter_cut', NOT_P3], next: 'cut' }, { cond: 'flag.prologue.drawmites_dying', next: 'p2' }], next: 'p1' },
      p1: { text: ['蓴嬸：今天的湯鹹。不是我手重，是水。我煮了三十年，鹽放多少我手知道。', '蓴嬸：湯就是站的嘴。水說什麼，我就煮什麼。妳們用舌頭嚐，我讓不會嚐的人用喝的。'], next: null },
      cut: { text: ['蓴嬸：咳——風直接灌進來，一鍋湯半鍋孢。妳們割幕之前不能先說一聲嗎！', '蓴嬸：我知道是規矩。規矩沒說下風第一家是誰。',
        '〔若 flag.prologue.filter_cut_whole〕蓴嬸：今天連碗都要重洗。'], next: null },
      p2: { text: ['蓴嬸：腥。我今天的湯是腥的。我本來想加糖囊蓋掉，想了想沒有蓋。', '蓴嬸：蓋掉了，大家就以為沒事。'], next: null },
      p3: { text: ['蓴嬸：我跟蒲同一年進站的。她扛事情從來不叫人。', '蓴嬸：今天這鍋我照實煮。苦就苦。全站一起苦一頓，比她一個人苦三個月好。'], next: null }
    }
  };

  // ---- 篙（活土原東口）----
  G['dlg.p0.npc.gao'] = npc([
    [['quest:' + Q + '@s5', '!flag.prologue.bridge_open'], 'm0_11'],
    [[P3, 'flag.prologue.slowarch_isolated'], 'p3b'], [P3, 'p3a'],
    ['flag.prologue.bridge_open', 'p2'], [true, 'p1']
  ], {
    m0_11: 'dlg.p0.m0_11_gao',
    p1: ['篙：（看了一眼橋）橋今天不過人。霧季，橋面滑。', '篙：……草我會修。這陣子忙。'],
    p2: ['篙：小徑。不要走草裡。', '篙：我在這裡。妳上來的時候，我在這裡。'],
    p3a: ['篙：我下去看過了。牠趴著。我站右邊，牠讓我摸了背。', '篙：橋心那六塊板子，我今天拆。釘的時候我沒問為什麼。拆的時候我知道為什麼。'],
    p3b: ['篙：我下去看過了。隔著欄。牠有喝糖液。', '篙：我每天下去。這件事不用排班。']
  });

  // ---- 絮 ----
  G['dlg.p0.npc.xu'] = npc([[P3, 'p3'], ['flag.prologue.got_auri_leaf', 'quiet'], ['flag.prologue.drawmites_dying', 'p2'], [true, 'p1']], {
    quiet: ['〔旁白〕絮站在牆邊，眼睛是紅的。'],
    p1: ['絮：珂潾姐好。蒲嬤在裡面。我、我在洗手。', '絮：橋那邊……沒什麼好看的。真的。霧季土軟。'],
    p2: ['絮：我去跟篙哥傳話了。我傳完就後悔了。', '絮：我不知道哪一邊是對的。蒲嬤說池守的事不出池守的口。可是蟲都死了。'],
    p3: ['絮：我按夾子的那隻手，洗了三個月。', '絮：蒲嬤說以後下橋腹嚐水，我排第一班。她說：「妳按過，妳就要會嚐。」']
  });

  // ---- 絡 ----
  G['dlg.p0.npc.luo'] = npc([
    [['quest:quest.side.p0_barter_gloves@s4', 'item:item.quest.membrane_patch'], 'finish'],
    [['!quest:quest.side.p0_barter_gloves', NOT_P3], 'offer'],
    [P3, 'p3'], ['flag.prologue.drawmites_dying', 'p2'], [true, 'p1']
  ], {
    finish: 'dlg.p0.s0_5_luo', offer: 'dlg.p0.s0_5_offer',
    p1: ['絡：掌套一季要送來看一次。妳們年輕人都等到漏了才來。', '絡：握手的事，妳在外面沒亂來吧。記脈院的人到處跑，我聽說外環有人見面就握。'],
    p2: ['絡：今天來補掌套的人多了一倍。大家嘴上不說，手知道要包緊。', '絡：包緊是對的。可是包緊了就嚐不到。所以站裡總要有一兩個人，肯在這種時候把掌套打開。'],
    p3: ['絡：蒲的掌套是我補的，三十年。她右手那只，上個霧季起就不太摘了。我以為是天冷。', '絡：一個人不摘掌套，不一定是防外面。']
  });
  // 記脈棚繪圖桌（§5.3「互動可翻看已完成的葉帖」；§11「之後可在記脈棚繪圖桌重讀」）
  G['dlg.p0.draw_table'] = {
    lines: ['〔旁白〕繪圖桌。墨、骨筆，畫好的葉帖夾在晾葉架上，一張一張翻得開。'],
    actions: [['menu', 'folios']]
  };
  void P1;
})(window.VELLORA);

/*
 * 序章〈味變〉：葉帖 6 張（§11）。劇本 id folio.f004 … 對應引擎 id F-004 …（選單以此排序與顯示）。
 * 條件鍵沿用劇本：旗標 folio.f004.c1（觀察）／c2（取樣）／c3（診斷）。
 * meta.autoDrawFolios：三項齊備時自動播放 before 行 → 繪製 → after 行（§7 各場次的繪製演出）。
 * 葉帖名稱與筆記是珂潾在遊戲裡寫下的東西，不是對該頁手稿內容的描述或解讀。
 */
(function (V) {
  'use strict';
  var D = V.data;
  var RW = { exp: 20, lu: 1 };

  D.folios['F-004'] = {
    name: '霧階鐘管草·低鳴株', cat: '植物', image: 'assets/folios/page-004.jpg',
    conditions: { observe: 'folio.f004.c1', sample: 'folio.f004.c2', diagnose: 'folio.f004.c3' },
    hints: { observe: '池站鐘管草觀察點。', sample: '取得鐘管草汁（採集或遭遇獎勵；巡檢藥料不算）。', diagnose: '讀出低鳴鐘管草的完整味序。' },
    note: ['七株一群，根管五支，音高三個；水漲時最粗的一支先響。',
      '斷拍的那一叢只剩單音，比長晨低一片指甲——單位是老聆的，我沿用。',
      '味序：焦、澀、焦。它不是在叫，是收不到「可以停了」。'],
    before: ['珂潾：根管畫五支。水位線畫兩條：早上的，現在的。音高記在旁邊——用聆叔的單位。'],
    reward: RW
  };

  D.folios['F-005'] = {
    name: '池糖囊·二階叢', cat: '植物', image: 'assets/folios/page-005.jpg',
    conditions: { observe: 'folio.f005.c1', sample: 'folio.f005.c2', diagnose: 'folio.f005.c3' },
    hints: { observe: '階梯泉二階觀察點。', sample: '在二階採集點採池糖囊。', diagnose: '讀出乾癟池糖囊的完整味序。' },
    note: ['葉托上的囊不是它自己的，是住在它身上的儲水共生體；健康的囊按下去會回彈，糖流同向。',
      '病株味序：澀、甜、澀。',
      '三顆裡有一顆不需要我。我在那一顆旁邊沒有寫字。'],
    before: ['〔旁白〕珂潾在池階邊坐下，把一張空白葉帖攤在膝上。', '珂潾：囊畫三顆。兩顆畫癟的，一顆畫飽的。飽的那顆旁邊不寫字。'],
    reward: RW
  };

  D.folios['F-006'] = {
    name: '縫葉·五嘴', cat: '植物', image: 'assets/folios/page-006.jpg',
    conditions: { observe: 'folio.f006.c1', sample: 'folio.f006.c2', diagnose: 'folio.f006.c3' },
    hints: { observe: '嫁接棚前觀察五嘴。', sample: '楔姨割下的刺緣葉。', diagnose: '讀出五嘴的完整味序。' },
    note: ['一副主莖，五種葉，五道癒合縫；縫發亮，表示裡面在搶糖。',
      '味序：苦、澀。先讓防禦葉安靜，再給薄葉水——順序反了，糖會被搶走。',
      '刺緣葉防的東西不在現場。來源待查。'],
    before: ['〔旁白〕珂潾退到棚邊的晾架旁，解開腰間那束葉帖的繩帶，抽出最上面一張空白的。', { tutorial: 'T-04' },
      '〔旁白〕對摺的犢皮攤平，左右兩半壓在掌下。她蘸了池水調開的靛藍，先畫主莖，再畫五道縫，最後才畫葉。',
      '珂潾：先畫接口。葉子最後。葉子誰都會畫。'],
    after: ['楔姨：（探頭看）妳把它畫胖了。', '珂潾：縫的地方要畫粗，不然以後的人看不出那是縫。', '楔姨：以後的人。妳們記脈院的人講話，老是有個以後的人。'],
    reward: RW
  };

  D.folios['F-007'] = {
    name: '慢拱的背園·還在的部分', cat: '植物', image: 'assets/folios/page-007.jpg',
    nameAlt: [{ cond: 'flag.prologue.slowarch_isolated', name: '慢拱的背園·夾下來的一半' }],
    conditions: { observe: 'folio.f007.c1', sample: 'folio.f007.c2', diagnose: 'folio.f007.c3' },
    hints: { observe: '下層修剪痕觀察點。', sample: '背園新芽（穩定）或背園殘葉（隔離）。', diagnose: '讀出慢拱的完整味序。' },
    note: [
      '〔若 flag.prologue.slowarch_stabilized〕亞成體拱背獸，左中肢跛，斷網約三個月。背園：矮鐘管草枯七成，主莖轉紅，光合板裂兩片。',
      '〔若 flag.prologue.slowarch_stabilized〕味序六符，中途回返一次苦；最後一味是甜——最裡面一叢池糖囊是飽的，三個月沒有被取食。',
      '〔若 flag.prologue.slowarch_stabilized〕牠安靜下來時，左中肢先落地。',
      '〔若 flag.prologue.slowarch_stabilized〕枯株根部有一點青。我畫得很小，旁邊留白。',
      '〔若 flag.prologue.slowarch_isolated〕亞成體拱背獸，左中肢跛，斷網約三個月。病紅的一半背園已夾除，畫在左頁；仍在牠身上的畫在右頁，中縫是下夾的位置。',
      '〔若 flag.prologue.slowarch_isolated〕牠被圈在前廳北支管，會喝糖液，仍在頂牆。',
      '〔若 flag.prologue.slowarch_isolated〕最後一味是甜。我讀到了，仍然下了夾；理由寫在背面。',
      '〔若 flag.prologue.slowarch_sweet_hurt〕補記：我對那叢健康的糖囊下過藥，裂了一顆。這一行是我的，不是牠的。'
    ],
    before: ['〔旁白〕珂潾退到前廳入口，背靠著壁，把一張葉帖攤在膝上。手在抖，她等了十個數，等手不抖了才下筆。',
      '〔若 flag.prologue.slowarch_stabilized〕珂潾：背園畫全。枯的畫枯的，紅的畫紅的。最裡面那一叢，畫飽的。那一點青，畫小一點，旁邊留白。',
      '〔若 flag.prologue.slowarch_isolated〕珂潾：背園畫兩半。夾下來的那一半畫在左頁，還在牠身上的畫在右頁。中縫就是我下夾的地方。'],
    reward: RW
  };

  D.folios['F-161'] = {
    name: '霧階：水怎麼走', cat: '宇宙摺頁（地理）', image: 'assets/folios/page-161.jpg',
    labels: { observe: '觀察點一', sample: '觀察點二', diagnose: '觀察點三' },
    conditions: { observe: 'folio.f161.c1', sample: 'folio.f161.c2', diagnose: 'folio.f161.c3' },
    hints: { observe: '池站水位尺。', sample: '三階泉源望台。', diagnose: '脈橋橋心。' },
    note: ['泉源、三階、初階池、脈橋：水由北向南，再向東。',
      '鹹自泉源一路可測；苦與焦在站與橋之間加入。',
      '水線越過了這張紙的中縫，因為水不管紙從哪裡摺。',
      '〔若 flag.prologue.side_tide_done〕三把水位尺讀數相差不到兩分。高低差是水在走的證據；今天沒有證據。'],
    before: ['〔旁白〕珂潾在橋心蹲下，把一張葉帖整張攤平，左半畫階梯泉，右半畫站和橋，一條水線越過中縫。',
      '珂潾：三把尺、三個觀察點。這一張畫的不是東西，是「水怎麼走」。'],
    reward: RW
  };

  D.folios['F-174'] = {
    name: '四味·霧階配方', cat: '藥劑', image: 'assets/folios/page-174.jpg',
    labels: { observe: '取樣', sample: '調劑', diagnose: '對症使用' },
    conditions: {
      observe: 'folio.f174.c1',
      sample: 'folio.f174.c2',
      diagnose: { any: ['folio.f174.c3', ['flag.prologue.treated_emberash', 'flag.prologue.treated_suran', 'flag.prologue.treated_indolk', 'flag.prologue.treated_pool_sugar']] }
    },
    hints: { observe: '礦泉結晶、鐘管草汁、縫葉刺緣葉、池糖囊四種都持有過。', sample: '四種處置藥各調出過一次。', diagnose: '四種處置藥各對症使用過一次。' },
    note: ['燼灰對鹹，縫苦對苦，靛乳對焦，池糖液對澀；腥用手清，甜不處置。',
      '同一樣東西，淡是訊號，中是藥，濃是毒——縫苦的「藥」，落在別的藥的「淡」那一格。',
      '〔若 stat.prologue.mistreat_count=0〕每一份都先嚐再下。今天我每一次都做到了。',
      '〔若 stat.prologue.mistreat_count>=1〕每一份都要先嚐再下。今天我有 {flag:stat.prologue.mistreat_count} 次沒有做到。'],
    before: ['〔旁白〕珂潾就地蹲下，把一張葉帖攤在膝上，左半畫四只小瓶，右半畫一隻攤開的手。',
      '珂潾：四味，各對過一次了。可以寫了。', '珂潾：手也要畫。腥是用手清的，甜是把手收回來。這兩樣沒有瓶子。'],
    reward: RW
  };
})(window.VELLORA);

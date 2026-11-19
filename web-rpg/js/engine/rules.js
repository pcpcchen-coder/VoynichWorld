/*
 * 規則語法：條件字串、動作陣列、對白行解析。
 * 純邏輯、不碰 DOM；遊戲執行期與 tools/validate-data.js 共用同一份定義，
 * 確保文件、驗證器與程式三者一致。
 */
(function (root) {
  'use strict';
  var V = root.VELLORA;
  var R = V.rules = {};

  // ======================= 條件 =======================
  // 原子：[!]種類[:參數][運算子 值]
  //   flag:名稱            旗標為真
  //   flag:名稱=值 / >=N   比較（數字或字串）
  //   item:物品id          持有 ≥1；item:id>=3
  //   quest:任務id         已接（進行中或完成）；quest:id=done|active|none
  //   quest:任務id@階段id  目前正位於此階段
  //   quest:任務id>=階段id 已到達或超過此階段（完成也算）
  //   level>=N             等級
  //   dim:bo>=N            四向度（bo 播／fen 焚／rong 融／lu 錄；亦可寫 axis.sow 等劇本代號）
  //   conn:區域id>=N       連通度（亦可寫 conn:world.connectivity.區域id>=N）
  //   vein:區域id=slow_flow 脈況階段（可用 >= 比較先後：taste_shift<mist_recede<slow_flow<sealed<withered）
  //   seen:tut:T-01        看過某教學（或其他 seen 記錄）
  //   folio:F-004          已繪製；folio:F-004=ready 條件齊備可繪製
  //   stamina>=N / load>=N 目前體力／感官負荷（百分比）
  // 組合：陣列＝全部成立；{ any:[...] }＝任一成立；{ not: 條件 }
  var ATOM = /^(!)?\s*([a-z]+)(?::([^<>=!@\s]+))?\s*(?:(>=|<=|==|!=|=|>|<|@)\s*(.+))?$/;
  R.COND_KINDS = {
    flag: { arg: true }, item: { arg: true, ref: 'item' }, quest: { arg: true, ref: 'quest' },
    level: { arg: false }, dim: { arg: true, ref: 'dim' }, conn: { arg: true, ref: 'zone' },
    folio: { arg: true, ref: 'folio' }, stamina: { arg: false }, load: { arg: false },
    vein: { arg: true, ref: 'zone' }, seen: { arg: true }
  };
  R.VEIN_STAGES = ['taste_shift', 'mist_recede', 'slow_flow', 'sealed', 'withered'];
  R.VEIN_NAMES = { taste_shift: '味變', mist_recede: '霧退', slow_flow: '流慢', sealed: '封脈', withered: '乾化／野化' };
  var DIM_ALIAS = { bo: 'bo', fen: 'fen', rong: 'rong', lu: 'lu', sow: 'bo', burn: 'fen', merge: 'rong', record: 'lu',
    '播': 'bo', '焚': 'fen', '融': 'rong', '錄': 'lu' };
  R.dimKey = function (k) { k = String(k).replace(/^axis\./, ''); return DIM_ALIAS[k] || k; };
  R.isDim = function (k) { return !!DIM_ALIAS[String(k).replace(/^axis\./, '')]; };
  R.zoneKey = function (z) { return String(z).replace(/^world\.(connectivity|veinstate)\./, ''); };
  // 葉帖條件等欄位：不含 ':'、運算子的字串視為旗標名稱
  R.isFlagRef = function (c) { return typeof c === 'string' && !/[:<>=!@]/.test(c); };

  var cache = {};
  // 劇本記號簡寫（含「.」的裸名稱）：flag.xxx → 旗標；world.connectivity.區域 → conn；
  // world.veinstate.區域 → vein；axis.sow 等 → dim。例：'!flag.prologue.puma_confessed'、'world.connectivity.miststep>=60'
  var BARE = /^(!)?\s*([A-Za-z_][\w\-]*\.[\w.\-]+)\s*(?:(>=|<=|==|!=|=|>|<)\s*(.+))?$/;
  function bareAtom(str) {
    var m = BARE.exec(str); if (!m) return null;
    var name = m[2], kind = 'flag', arg = name;
    if (/^world\.connectivity\./.test(name)) { kind = 'conn'; arg = R.zoneKey(name); }
    else if (/^world\.veinstate\./.test(name)) { kind = 'vein'; arg = R.zoneKey(name); }
    else if (/^axis\./.test(name)) { kind = 'dim'; arg = name; }
    return ATOM.exec((m[1] || '') + kind + ':' + arg + (m[3] ? m[3] + m[4] : ''));
  }
  R.parseAtom = function (str) {
    if (cache[str]) return cache[str];
    var m = ATOM.exec(String(str).trim());
    if (!m || !R.COND_KINDS[m[2]]) m = bareAtom(String(str).trim()) || m;
    if (!m) throw new Error('無法解析條件「' + str + '」');
    var kind = m[2];
    var def = R.COND_KINDS[kind];
    if (!def) throw new Error('未知的條件種類「' + kind + '」（於「' + str + '」）');
    if (def.arg && !m[3]) throw new Error('條件「' + str + '」缺少參數（應為 ' + kind + ':xxx）');
    if (!def.arg && m[3]) throw new Error('條件「' + str + '」不需要參數');
    if (!def.arg && !m[4]) throw new Error('條件「' + str + '」需要比較運算子，例如 ' + kind + '>=3');
    var atom = { neg: !!m[1], kind: kind, arg: m[3] || null, op: m[4] || null, val: m[5] != null ? m[5].trim() : null };
    if (atom.op === '==') atom.op = '=';
    if (kind === 'quest' && atom.op === '=' && ['done', 'active', 'none'].indexOf(atom.val) < 0)
      throw new Error('條件「' + str + '」：quest:=後只能是 done、active 或 none');
    if (kind === 'folio' && atom.op && !(atom.op === '=' && atom.val === 'ready'))
      throw new Error('條件「' + str + '」：folio 只支援 folio:ID 或 folio:ID=ready');
    if (kind !== 'quest' && atom.op === '@') throw new Error('條件「' + str + '」：@ 只用於 quest');
    cache[str] = atom;
    return atom;
  };

  // 走訪條件樹，回傳所有原子（驗證器使用）
  R.condAtoms = function (cond, out) {
    out = out || [];
    if (cond == null || cond === true) return out;
    if (typeof cond === 'string') { out.push(R.parseAtom(cond)); return out; }
    if (Array.isArray(cond)) { cond.forEach(function (c) { R.condAtoms(c, out); }); return out; }
    if (typeof cond === 'object') {
      if (cond.any) R.condAtoms(cond.any, out);
      if (cond.all) R.condAtoms(cond.all, out);
      if (cond.not) R.condAtoms(cond.not, out);
      var keys = Object.keys(cond).filter(function (k) { return ['any', 'all', 'not'].indexOf(k) < 0; });
      if (keys.length) throw new Error('條件物件只能有 any／all／not，卻有：' + keys.join('、'));
      return out;
    }
    throw new Error('無法辨識的條件：' + JSON.stringify(cond));
  };

  function cmp(a, op, b) {
    var na = Number(a), nb = Number(b);
    var numeric = !isNaN(na) && !isNaN(nb) && a !== '' && b !== '' && a !== true && a !== false;
    if (b === 'true') b = true; if (b === 'false') b = false;
    switch (op) {
      case '=': return numeric ? na === nb : a === b || String(a) === String(b);
      case '!=': return numeric ? na !== nb : String(a) !== String(b);
      case '>=': return na >= nb;
      case '<=': return na <= nb;
      case '>': return na > nb;
      case '<': return na < nb;
    }
    return false;
  }

  // ctx：{ flag(n), item(id), questStatus(id), questStage(id)->index, questStageIndex(id, stageId),
  //        level(), dim(k), conn(z), folio(id), folioReady(id), stamina(), load() }
  R.evalAtom = function (a, ctx) {
    var r;
    switch (a.kind) {
      case 'flag': {
        var v = ctx.flag(a.arg);
        r = a.op ? cmp(v === undefined ? 0 : v, a.op, a.val) : !!v; break;
      }
      case 'item': { var c = ctx.item(a.arg); r = a.op ? cmp(c, a.op, a.val) : c > 0; break; }
      case 'quest': {
        var st = ctx.questStatus(a.arg); // none|active|done
        if (!a.op) r = st !== 'none';
        else if (a.op === '=') r = st === a.val;
        else if (a.op === '@') r = st === 'active' && ctx.questStageId(a.arg) === a.val;
        else {
          var target = ctx.questStageIndex(a.arg, a.val);
          var cur = st === 'done' ? 9999 : (st === 'none' ? -1 : ctx.questStage(a.arg));
          r = cmp(cur, a.op, target);
        }
        break;
      }
      case 'level': r = cmp(ctx.level(), a.op, a.val); break;
      case 'dim': r = a.op ? cmp(ctx.dim(a.arg), a.op, a.val) : ctx.dim(a.arg) > 0; break;
      case 'conn': r = a.op ? cmp(ctx.conn(a.arg), a.op, a.val) : ctx.conn(a.arg) > 0; break;
      case 'folio': r = a.op ? ctx.folioReady(a.arg) : ctx.folio(a.arg); break;
      case 'vein': {
        var cv = R.VEIN_STAGES.indexOf(ctx.vein(a.arg)), tv = R.VEIN_STAGES.indexOf(a.val);
        r = a.op ? (a.op === '=' ? ctx.vein(a.arg) === a.val : a.op === '!=' ? ctx.vein(a.arg) !== a.val : cmp(cv, a.op, tv)) : true;
        break;
      }
      case 'seen': r = ctx.seen(a.arg); break;
      case 'stamina': r = cmp(ctx.stamina(), a.op, a.val); break;
      case 'load': r = cmp(ctx.load(), a.op, a.val); break;
      default: r = false;
    }
    return a.neg ? !r : r;
  };

  R.evalCond = function (cond, ctx) {
    if (cond == null || cond === true) return true;
    if (cond === false) return false;
    if (typeof cond === 'string') return R.evalAtom(R.parseAtom(cond), ctx);
    if (Array.isArray(cond)) {
      for (var i = 0; i < cond.length; i++) if (!R.evalCond(cond[i], ctx)) return false;
      return true;
    }
    if (cond.any) { for (var j = 0; j < cond.any.length; j++) if (R.evalCond(cond.any[j], ctx)) return true; return false; }
    if (cond.all) return R.evalCond(cond.all, ctx);
    if (cond.not) return !R.evalCond(cond.not, ctx);
    return true;
  };

  // ======================= 動作 =======================
  // 每個動作是一個陣列：[名稱, 參數1, 參數2, ...]
  // 參數型別：ref:xxx 代表必須參照到資料表中的 id；? 結尾代表可省略。
  R.ACTIONS = {
    flag: ['string', 'any?'],            // ['flag','名稱',值]，值省略＝true
    unflag: ['string'],                  // 清除旗標
    addflag: ['string', 'number?'],      // 數值旗標加減
    give: ['ref:item', 'number?'],       // 給物品
    take: ['ref:item', 'number?'],       // 收物品
    quest: ['ref:quest', 'string?'],     // ['quest',id] 或 'start' 開任務；階段id 推進到該階段；'done' 完成
    encounter: ['ref:encounter'],        // 啟動遭遇（等待結束；結果寫入旗標 last_result）
    warp: ['ref:map', 'number', 'number', 'dir?'], // 傳送
    cutscene: ['ref:cutscene'],          // 播放過場（等待結束）
    dialogue: ['ref:dialogue'],          // 播放一段對話（等待結束）
    dim: ['ref:dim', 'number'],          // 四向度增減
    conn: ['ref:zone', 'number'],        // 連通度增減
    exp: ['number'],                     // 見識
    heal: ['number?', 'number?'],        // 回復體力（省略＝全滿），第二參數為負荷下降量（省略＝歸零）
    hurt: ['number'],                    // 扣體力（歸零會撤離）
    load: ['number'],                    // 感官負荷增減（點數，可為負）
    learn: ['ref:skill'],                // 學會手技
    shop: ['ref:shop'],                  // 開啟以物易物
    craft: ['string?'],                  // 開啟調劑介面（參數：台名稱，可省略）
    save: [],                            // 開啟存檔介面
    sfx: ['sfx'],                        // 播音效
    toast: ['string'],                   // 顯示短提示
    tone: ['tone', 'ref:map?'],          // 改變地圖色調（省略地圖＝目前地圖）
    respawn: ['ref:map', 'number', 'number'], // 設定撤離回歸點
    glossary: ['ref:glossary'],          // 解鎖詞彙
    actor: ['string', 'string'],         // ['actor', 實體id, 'show'|'hide']
    ending: ['string?'],                 // 顯示章末畫面（參數：結尾畫面 id，對應 meta.endings）
    tutorial: ['ref:tutorial', 'string?'], // 彈出教學（看過不再彈；第二參數 'force' 強制再顯示）
    vein: ['ref:zone', 'vein'],          // 設定區域脈況階段
    lines: ['lines']                     // 就地播放幾行對白（同對話的 lines 格式）
  };
  // 只能出現在過場中的指令（等待／畫面控制）
  R.CUTSCENE_CMDS = {
    say: ['string', 'string?'],          // ['say','名：文'] 或 ['say','名','文']
    move: ['string', 'path', 'number?'], // ['move', 實體id|'player', 'U2 L3', 速度(格/秒)]
    face: ['string', 'dir'],             // 轉向
    camera: ['any', 'number?', 'number?'], // ['camera', x, y, 毫秒] 或 ['camera','player'] 或 ['camera', 實體id, 毫秒]
    fade: ['string', 'number?', 'string?'], // ['fade','out'|'in', 毫秒, 顏色]
    image: ['string', 'string?', 'string?'], // 顯示全幅圖片：['image', 路徑, 旁白, 標題]
    imageclose: [],
    narrate: ['string'],                 // 黑底置中旁白
    wait: ['number'],
    shake: ['number?', 'number?'],       // 震動毫秒、強度
    banner: ['string'],                  // 地名橫幅
    if: ['cond', 'array', 'array?'],     // ['if', 條件, [指令...], [否則...]]
    lock: [], unlock: []                 // 一般不需要：過場期間自動鎖定玩家
  };
  // 行首「〔若 條件〕」：該行只在條件成立時出現。回傳 { cond, rest } 或 null
  R.lineCond = function (line) {
    if (typeof line !== 'string') return null;
    var m = /^〔若\s*([^〕]+)〕\s*([\s\S]*)$/.exec(line);
    return m ? { cond: m[1].trim(), rest: m[2] } : null;
  };
  R.SFX = ['confirm', 'cancel', 'cursor', 'blip', 'taste', 'treat', 'backfire', 'hit', 'heal',
    'item', 'save', 'folio', 'warp', 'door', 'splash', 'hiss', 'craft', 'level', 'alert', 'guard',
    'isolate', 'quest', 'error', 'rumble', 'chime', 'step'];
  R.TONES = ['none', 'dawn', 'day', 'dusk', 'cave', 'indoor', 'wither'];
  R.DIRS = ['up', 'down', 'left', 'right'];

  // 移動路徑字串："U2 L3 D1 R4"（方向＋格數），亦接受 "face:left"
  R.parsePath = function (p) {
    if (Array.isArray(p)) return p;
    var steps = [];
    String(p).trim().split(/\s+/).forEach(function (tok) {
      var m = /^([UDLR])(\d*)$/i.exec(tok);
      if (!m) throw new Error('無法解析路徑片段「' + tok + '」（格式：U2 L3 D1 R4）');
      var d = { U: 'up', D: 'down', L: 'left', R: 'right' }[m[1].toUpperCase()];
      var n = m[2] ? parseInt(m[2], 10) : 1;
      for (var i = 0; i < n; i++) steps.push(d);
    });
    return steps;
  };

  // ======================= 對白行 =======================
  // 支援：
  //   「名：文」
  //   「漣〔訊號：鹹—停頓〕（珂潾譯：上游……）」→ 訊號名牌
  //   「穹母〔眾聲〕：文」→ 眾聲名牌
  //   「名〔標註〕：文」→ 名牌附小字標註
  //   沒有冒號（或以（、「、…開頭）→ 旁白
  var RE_SIGNAL = /^([^：〔（「]{1,12})〔([^〕]*)〕（([^：）]{1,8})譯：([\s\S]*)）\s*$/;
  var RE_TAGGED = /^([^：〔（「]{1,12})〔([^〕]*)〕：([\s\S]*)$/;
  var RE_PLAIN = /^([^：〔（「\s]{1,12})：([\s\S]*)$/;
  var RE_NOTE = /^([^：〔（「\s]{1,12})（([^）]{1,10})）：([\s\S]*)$/;
  R.parseLine = function (line) {
    if (line && typeof line === 'object') return line;
    var s = String(line), m;
    if ((m = /^〔旁白〕\s*([\s\S]*)$/.exec(s))) return { speaker: null, style: 'narration', text: m[1] };
    if ((m = RE_NOTE.exec(s))) return { speaker: m[1], style: 'tagged', tag: m[2], text: m[3] };
    if ((m = RE_SIGNAL.exec(s))) {
      return { speaker: m[1], style: 'signal', signal: m[2], translator: m[3], text: m[4] };
    }
    if ((m = RE_TAGGED.exec(s))) {
      return { speaker: m[1], style: m[2] === '眾聲' ? 'chorus' : 'tagged', tag: m[2], text: m[3] };
    }
    if ((m = RE_PLAIN.exec(s))) {
      if (m[1] === '旁白') return { speaker: null, style: 'narration', text: m[2] };
      return { speaker: m[1], style: 'normal', text: m[2] };
    }
    return { speaker: null, style: 'narration', text: s };
  };

  // 文字樣板：{flag:名稱} {item:id} {conn:區域} {dim:bo} {level} {name}
  R.template = function (text, ctx) {
    return String(text).replace(/\{(flag|item|conn|dim|level)(?::([^}]+))?\}/g, function (all, k, arg) {
      try {
        if (k === 'flag') { var v = ctx.flag(arg); return v === undefined ? '' : String(v); }
        if (k === 'item') return String(ctx.item(arg));
        if (k === 'conn') return String(Math.round(ctx.conn(arg)));
        if (k === 'dim') return String(ctx.dim(arg));
        if (k === 'level') return String(ctx.level());
      } catch (e) { /* 忽略 */ }
      return all;
    });
  };
})(typeof window !== 'undefined' ? window : this);

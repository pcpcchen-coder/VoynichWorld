# 薇蘿世界角色與生態 IP 聖經

**VELLORA Character & Ecosystem IP Bible · v0.2 · 2026-07-25**

![珂潾、燼與漣面向脈枯前線](../assets/ip-bible/12-story-key-art.png)

這份文件集把 [`docs/Vellora_WorldBible_v0.1.md`](../docs/Vellora_WorldBible_v0.1.md) 的設定整理成可供概念設計、小說、遊戲、動畫、授權與後續資料化直接使用的 IP 規格。它完整覆蓋 repo 既有的虛構天體、世界機制、具名植物、動物、智慧物種、具名人物與勢力，並補上地貌、氣候、生態位、外形、性格、聲音、動態、敘事功能和不可偏移的設計界線。

## 本版交付

- 12 張原創視覺：天文、世界地圖、活土剖面、健康與脈枯環境、全植物、全動物、漣、全具名人物、三勢力、織脈者解剖、故事主視覺。
- 9 份開發文件：視覺語言、天文行星、地貌氣候、生命系統、植物、動物、人物、勢力文化、製作規格。
- 1 份機器可讀實體索引：[`data/vellora_ip_entities_v0.2.json`](../data/vellora_ip_entities_v0.2.json)。
- 1 份可重現圖像提示集：[`IMAGE_PROMPTS.md`](IMAGE_PROMPTS.md)。

## 正典層級

| 層級 | 定義 | 使用方式 |
|---|---|---|
| **A · 原始正典** | v0.1 已明寫的名稱、數值、因果與人物核心 | 不得任意改動 |
| **B · 必要推導** | 從 v0.1 科學機制直接推出、用來填補製作缺口 | 可視為 v0.2 預設 |
| **C · 製作提案** | 九池環暫名、服裝細節、個別聲音等新增設計 | 可替換，但需保持 A/B 層不矛盾 |
| **D · 留白** | 原脈真相、奧芮生死、手稿抵達地球方式 | 正典刻意不定案 |

本文件不把《伏尼契手稿》當成已被破解的文本，也不聲稱圖像中的任何設計是歷史手稿原意。所有薇蘿內容皆為虛構創作。

## 快速入口

| 我需要… | 文件 |
|---|---|
| 一眼掌握美術語言與色板 | [`00-visual-language.md`](00-visual-language.md) |
| 恆星、衛星、日長與行星樣貌 | [`01-cosmos-and-planet.md`](01-cosmos-and-planet.md) |
| 九大池環、地貌、氣候、長冬 | [`02-geography-climate-biomes.md`](02-geography-climate-biomes.md) |
| 綠脈、活土、化學語言與脈枯 | [`03-life-system.md`](03-life-system.md) |
| 所有具名植物與藥理產物 | [`04-flora.md`](04-flora.md) |
| 所有具名動物與生態關係 | [`05-fauna.md`](05-fauna.md) |
| 所有具名人物與關係、弧線 | [`06-characters.md`](06-characters.md) |
| 織脈者、三勢力、日常文化 | [`07-factions-and-culture.md`](07-factions-and-culture.md) |
| 遊戲／動畫／授權製作規格 | [`08-production-guide.md`](08-production-guide.md) |

## 完整覆蓋清單

### 星體與世界

歐柯、歐墨、薇蘿、稜、珂、墨、九大池環、綠脈、原脈、脈枯。

### 虛構植物與植物性產物

鐘管草、縫葉、燼冠；靛乳、縫苦、燼灰。另收錄構成所有薇蘿植物的真菌骨架、光合組織、固氮夥伴、海綿型儲水共生體與發光菌落等功能群。

### 虛構動物

潾者、拱背獸、燈蛾群、汲蟲、裂獸。裂獸在本版明確整理為「斷網後的野化症候群／生態型」，不是單一血統，避免把生態崩潰誤畫成憑空出現的怪物物種。

### 智慧物種、人物與勢力

織脈者；珂潾、燼、漣、奧芮、穹母；記脈院、焚脈派、融脈教。

## 圖像索引

| # | 圖像 | 用途 |
|---:|---|---|
| 01 | [`01-cosmos-orbits.png`](../assets/ip-bible/01-cosmos-orbits.png) | 歐柯系與三衛星 |
| 02 | [`02-nine-pool-rings-map.png`](../assets/ip-bible/02-nine-pool-rings-map.png) | 九大池環世界地圖 |
| 03 | [`03-chlora-living-soil-cutaway.png`](../assets/ip-bible/03-chlora-living-soil-cutaway.png) | 綠脈與活土剖面 |
| 04 | [`04-healthy-pool-ring-biome.png`](../assets/ip-bible/04-healthy-pool-ring-biome.png) | 健康池環 |
| 05 | [`05-withering-biome.png`](../assets/ip-bible/05-withering-biome.png) | 脈枯前線 |
| 06 | [`06-flora-lineup.png`](../assets/ip-bible/06-flora-lineup.png) | 三種具名植物 |
| 07 | [`07-fauna-lineup.png`](../assets/ip-bible/07-fauna-lineup.png) | 四類非潾者動物 |
| 08 | [`08-lian-naiadin-character-sheet.png`](../assets/ip-bible/08-lian-naiadin-character-sheet.png) | 漣／潾者角色板 |
| 09 | [`09-named-characters-lineup.png`](../assets/ip-bible/09-named-characters-lineup.png) | 珂潾、燼、奧芮、穹母 |
| 10 | [`10-faction-costumes.png`](../assets/ip-bible/10-faction-costumes.png) | 三勢力服裝語彙 |
| 11 | [`11-weaver-anatomy.png`](../assets/ip-bible/11-weaver-anatomy.png) | 織脈者物種特徵 |
| 12 | [`12-story-key-art.png`](../assets/ip-bible/12-story-key-art.png) | 故事主視覺 |

## 設計總句

> 薇蘿不是「長滿怪植物的異星」，而是一個把共生當作基礎建設的古老生物圈；每個角色、器官、地貌與衝突，都必須讓觀眾看見連結帶來的恩惠，也看見過度整合的代價。

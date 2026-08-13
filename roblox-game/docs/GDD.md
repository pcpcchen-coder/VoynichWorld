# Game Design Document — VOYNICH: The Living Manuscript

## 1. Vision

將伏尼契手稿轉化為一個可進入、可探索、可多人解謎、可長期研究的 Roblox 世界，而不是 3D 博物館。

遊戲核心不是「公布伏尼契答案」，而是讓玩家扮演研究者，在未知世界中建立自己的解讀。

## 2. Genre

- Mystery Exploration
- Co-op Puzzle
- Collection / Codex
- World Reconstruction
- Light Social Research

## 3. Target Experience

玩家第一次進入後 30 秒內完成「掉進手稿」的強 Hook；3 分鐘內完成第一次 Discovery；30–45 分鐘內完成 Chapter 1 並看見下一世界入口。

## 4. Opening

### The Last Page

玩家出現在黑暗古老檔案館。桌上只有一本標記 `MS 408` 的書。

互動：`OPEN MANUSCRIPT`

翻頁後 glyph 浮起、解體為粒子，地面消失，玩家墜入書中並落在巨大未知植物上。

Title Card:

**VOYNICH — The Living Manuscript**

> The manuscript was never meant to be read. It was meant to be entered.

## 5. Player Role / Rank

```text
Reader
  ↓
Observer
  ↓
Researcher
  ↓
Decoder
  ↓
Cartographer
  ↓
Master Archivist
```

升級來源：Discovery、Observation、Puzzle、Experiment、Hypothesis、Collaboration。

不以擊殺、裝備戰力作為主進度。

## 6. Core Gameplay Loop

```text
EXPLORE
  ↓
OBSERVE
  ↓
COLLECT EVIDENCE
  ↓
FORM HYPOTHESIS
  ↓
TEST
  ↓
DECODE
  ↓
RESTORE A PAGE
  ↓
UNLOCK NEW WORLD
```

## 7. World Structure

中央使用 Rosette Hub 作為世界樞紐。周圍世界由手稿六大視覺主題遊戲化：

1. Herbal Wilds — 植物探索與標本研究
2. Astral Realm — 星盤與天文機械解謎
3. Green Baths — 流體路由與協作工程
4. Rosette World — 世界地圖 / Endgame Overworld
5. Apothecary — 實驗與配方探索
6. Star Archive — glyph pattern 與假說研究

## 8. Core Differentiator

### No Canonical Answer

玩家可以建立「假說」，系統只顯示：

- Supporting Evidence
- Conflicting Evidence
- Confidence / Evidence Coverage

不顯示「正確翻譯」。

### Asymmetric Observation

部分物件可依玩家、時間、位置或研究技能呈現不同資訊，例如：

- 玩家 A 看見紅花
- 玩家 B 看見紫花
- 玩家 C 只有夜間能看見 glyph

因此完整證據需要交流與合作。

## 9. Death / Failure Language

不使用 `YOU DIED`。

改為：

**THE PAGE REJECTED YOU**

玩家角色墨水化 → glyph → 回到最近 Anchor。

## 10. Threat System

主要威脅不是傳統怪物，而是 **Ink Corruption**：

- 地板 glyph 化
- 植物 glyph 化
- 空間幾何失真
- 玩家逐步被文字侵蝕

玩家需尋找 Anchor Glyph 穩定頁面。

## 11. Multiplayer Modes

### Public Expedition
- 8–16 players
- 自由探索、採集、公共世界事件

### Research Party
- 1–4 players
- 協作 puzzle chamber / dungeon

### Scholar Mode
- 私人 Study Room
- Codex、Glyph、Hypothesis、Specimen、地圖研究

## 12. Persistent Player Fantasy

每個玩家擁有自己的 Study Room。

隨研究進度展示：

- 植物標本
- 星圖
- Rosette fragments
- Glyph board
- 實驗瓶
- 探索照片
- 稀有 Lost Folio artifacts

玩得越久，研究室越能反映個人探索歷史。

## 13. Live Ops

### Lost Folio Event

Server 期間限定事件：未知頁面短暫出現。

可能包含特殊：

- 植物
- Puzzle
- Glyph
- 地形
- Artifact

完成後取得 `Lost Fragment`，並可形成全 server / 全遊戲研究進度。

## 14. Monetization Principles

可以販售：

- 探險服裝
- Lantern 外觀
- Codex Skin
- Study Room 家具
- 背包
- 植物寵物 / companion
- Private Expedition
- Archivist cosmetic pass

禁止：

- 直接購買答案
- Puzzle skip 形成研究優勢
- Pay-to-win Evidence
- 付費提高假說正確率

## 15. Localization

首發：

- English
- Traditional Chinese

後續：Japanese / Korean / Spanish / German / French。

Voynichese 不進自動翻譯流程。

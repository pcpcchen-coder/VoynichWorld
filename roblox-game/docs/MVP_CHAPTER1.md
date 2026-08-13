# MVP — Chapter 1: The Root

## 1. Objective

用最小可玩版本驗證「探索 → 觀察 → 證據 → Codex → Puzzle → 世界解鎖」是否成立。

第一版不做六大世界，不做完整商業化，不做大型 live ops。

## 2. Scope

### Must Have

1. Opening Archive
2. Falling Into The Book
3. Rosette Hub
4. Herbal Wilds
5. 10 種可研究植物
6. Voynich Lens / Scanner
7. Codex
8. 3 類 Glyph / Botanical Puzzle
9. 1 個大型植物 Dungeon / Chamber
10. Astral Portal unlock
11. Persistent player progress
12. PC / Mobile / Tablet basic controls

## 3. First 30–45 Minute Flow

### 0–1 min — Hook
- 進入檔案館
- 開啟 MS 408
- 掉入手稿

### 1–5 min — First Discovery
- 落在 Herbal Wilds
- 拿到 Voynich Lens
- 掃描第一株植物
- Codex 自動建立第一條 entry

### 5–15 min — Learn Evidence
- 找 leaf / root / flower
- 發現同一植物不是一次掃描就完成
- 遇到第一個 glyph

### 15–25 min — First Puzzle
- Botanical Morphology / Glyph Alignment
- 打開通往 Rosette Hub 的路

### 25–35 min — Co-op / Chamber
- 進 Root Chamber
- 1–4 人完成大型 puzzle

### 35–45 min — Reward / Future Hook
- 修復第一頁
- Rosette Hub 一個圓盤亮起
- Astral Portal 出現但暫未開放或作為 Chapter 2 teaser

## 4. Ten Plant Content Template

每株至少包含：
- stable content ID
- display name placeholder
- model / mesh reference
- leaf observation
- root observation
- flower observation
- optional night observation
- associated glyph(s)
- one environmental clue
- Codex entry

避免第一版就做 100+ 種植物。

## 5. Puzzle MVP

### Puzzle A — Glyph Alignment
旋轉三層符號環，對齊提示圖案。

### Puzzle B — Root Morphology
選擇正確根系結構，重建門上的植物圖。

### Puzzle C — Observation Sequence
依玩家實際找到的植物特徵輸入順序，不可直接 brute force。

### Root Chamber
組合上述機制，至少有一個 2–4 人協作元素。

## 6. MVP Data Requirements

保存：
- chapter progress
- discovered plants
- observation slots
- discovered glyphs
- Codex state
- first chamber completion
- Astral portal unlock state

第一版可暫緩：
- full hypothesis editor
- Study Room customization
- global events
- trading
- guild / research society

## 7. UX Acceptance Criteria

- [ ] 新玩家 30 秒內進入手稿世界
- [ ] 3 分鐘內完成第一次 Discovery
- [ ] 玩家能理解 Scanner 是觀察工具，不是答案工具
- [ ] Codex 不需教學影片即可基本操作
- [ ] 至少 10 個植物 Discovery 可完成
- [ ] 至少 3 種 puzzle family 可辨識出玩法差異
- [ ] 至少 1 個 2–4 人合作 puzzle
- [ ] progress 重新登入後仍存在
- [ ] 主要流程 PC / Mobile / Tablet 可操作
- [ ] Rosette Hub 可看出還有未解鎖世界
- [ ] Chapter 1 完成時間約 30–45 分鐘
- [ ] 完成後玩家明確知道下一目標是 Astral Realm

## 8. Technical Acceptance Criteria

- [ ] server authoritative discovery reward
- [ ] stable content IDs
- [ ] save schema has version field
- [ ] StreamingEnabled compatible
- [ ] no critical dependency on frame-perfect input
- [ ] RemoteEvent has basic validation / rate limiting
- [ ] content / config separated from gameplay code
- [ ] no Roblox-specific adaptation changes written into `ip-bible/`

## 9. Out of Scope for Chapter 1

- Full Astral Realm
- Green Baths
- Apothecary
- Star Archive
- complete nine-Rosette finale
- paid progression
- full live operations
- global community hypothesis ranking
- large-scale economy

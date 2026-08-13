# VOYNICH — The Living Manuscript

Roblox 遊戲子專案。此目錄與既有 `ip-bible/` 完全隔離，**不得把 Roblox 遊戲設定回寫或覆蓋既有 IP Bible**。

## Product Positioning

- Platform: Roblox
- Genre: Mystery Exploration + Co-op Puzzle + Collection + World Reconstruction
- Player fantasy: 從 Reader 成長為 Observer / Researcher / Decoder / Cartographer / Master Archivist
- Core tagline: **Every page is a place. Every glyph is a clue.**
- Narrative rule: 遊戲不宣稱已破解伏尼契手稿；未知性本身就是核心玩法。

## Core Loop

`Explore → Observe → Collect Evidence → Form Hypothesis → Test → Decode → Restore a Page → Unlock New World`

## Design Pillars

1. Knowledge is progression — 不以打怪升級為核心。
2. Mystery over answers — 玩家蒐集證據、建立假說，系統不提供唯一翻譯答案。
3. World from manuscript — 植物、星象、浴池、Rosette、藥劑、文字直接轉為世界與玩法。
4. Co-op discovery — 部分資訊需多人合作才能取得完整證據。
5. Persistent research — Codex、Specimens、Hypotheses、Study Room 跨 session 保存。
6. IP isolation — Roblox 世界觀與既有 `ip-bible/` 分離演進。

## Folder Layout

```text
roblox-game/
├── README.md
├── AGENTS.md
└── docs/
    ├── GDD.md
    ├── WORLD_AND_LORE.md
    ├── GAMEPLAY_SYSTEMS.md
    ├── TECHNICAL_ARCHITECTURE.md
    ├── MVP_CHAPTER1.md
    └── ROADMAP.md
```

## Current Scope

第一階段只做 **Chapter 1: The Root**，以 Opening Archive、Rosette Hub、Herbal Wilds、Codex、Scanner、三類 Glyph Puzzle 與一個大型植物 Dungeon 驗證核心遊戲循環。

## Hard Boundary With Existing IP

- `ip-bible/`: 現有 Voynich IP 設定與內容資產。
- `roblox-game/`: Roblox 平台專用遊戲化設計。
- Roblox 內容若引用既有 IP，只能以「來源參照」方式使用；不得擅自改寫 `ip-bible/`。
- 若兩邊設定衝突，Roblox 版在本資料夾內自行建立 adaptation note，不修改既有 IP 原始定義。

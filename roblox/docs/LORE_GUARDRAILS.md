# Roblox Lore Guardrails

Status: v0.1

## Purpose

This document prevents gameplay convenience from silently rewriting VELLORA canon or the real-world status of the Voynich Manuscript.

## Truth layers

### Layer A — Historical/research truth
Source: research guide, page data, reliable external scholarship.

Examples:

- Beinecke MS 408 is a real manuscript.
- its script is not reliably deciphered;
- sections are conventionally grouped by their illustrations/content structure.

Roblox must not state a VELLORA explanation as proof about the historical manuscript.

### Layer B — VELLORA canon
Source: `../../docs/Vellora_WorldBible_v0.1.md` and later approved canon documents.

Examples:

- 綠脈 / The Chlora as a planetary biological network;
- chimeric morphogenesis;
- 脈枯 / The Withering;
- Korin as a field recorder;
- pool ecology and Linner;
- manuscript-like field notes as an in-world record;
- existing faction and ending framework.

### Layer C — Roblox adaptation
Source: `GDD.md` and approved game content.

This layer may compress time, spatial scale, or interactions for playability, but must not contradict Layer B without a recorded canon extension.

## Approved adaptation mappings

| Roblox element | Canon mapping | Guardrail |
|---|---|---|
| Rosette/Pool-Ring Hub | cosmological/geographical manuscript imagery + VELLORA mapped ecology | Do not claim the historical rosette is literally a portal map. |
| Personal Codex | player's reconstruction of field notes | Codex completion is gameplay progress, not real-world decipherment. |
| Taste diagnosis | Korin's chemical-signal interpretation ability | Present as VELLORA biology/sensory interpretation, not a human medical behavior. |
| Chlora routing puzzles | living transport/signal network | Avoid turning it into arbitrary magic pipes detached from ecology. |
| Glyph evidence | contextual recurring manuscript-like symbols | No canonical English translation unless the World Bible explicitly defines an in-world meaning. |
| Ecological intervention | graft/treat/isolate/cut/wait | Consequences should express systems tradeoffs rather than simple good/evil morality. |

## Required canon checks for new content

Before adding a major region, creature, faction, technology, or ending:

1. Identify its manuscript inspiration or VELLORA-system role.
2. Identify the scientific mechanism or fictional allowance.
3. Check consistency with the World Bible.
4. Decide whether it is adaptation-only or canon-expanding.
5. If canon-expanding, document the decision before implementation.

## Forbidden drift

Do not introduce without an explicit canon decision:

- conventional spellcasting/mana as the main world mechanism;
- generic medieval fantasy kingdoms unrelated to VELLORA ecology;
- aliens/visitors as a shortcut explanation for every manuscript mystery;
- a definitive real-world Voynich translation;
- a chosen-one prophecy that replaces Korin's scientific/naturalist framing;
- grind enemies whose only ecological function is to drop loot;
- resurrection mechanics framed as established VELLORA biology merely because respawn exists;
- paid access to canonical truth.

## Combat rule

Threatening creatures may exist where canon supports corrupted/broken organisms, but combat must serve ecological/narrative pressure.

A creature encounter should ideally answer at least one question:

- What failed in the Chlora?
- What did this organism used to be?
- What evidence can the player learn?
- What choice does the threat force?

If none apply, the encounter is likely generic filler.

## Tone

Target tone:

- beautiful but unstable;
- scientific curiosity rather than occult certainty;
- melancholy rather than gore;
- ecological interconnectedness rather than conquest;
- mystery with disciplined uncertainty.

## Naming

Stable code IDs use ASCII snake_case. Player-facing canon names may use Traditional Chinese and English localization.

Example:

```text
code id: chlora_node_07
zh-TW: 綠脈節點 VII
English: Chlora Node VII
```

Never store a translated display name as a persistent identity key.

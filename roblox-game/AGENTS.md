# AGENTS.md — Roblox Subproject Rules

## Scope

These rules apply to everything under `roblox-game/`.

This is an **independent Roblox adaptation subproject** inside the VoynichWorld repository.

## Critical Boundary

- DO NOT modify `../ip-bible/` as part of Roblox implementation work.
- DO NOT silently promote Roblox lore into canonical VoynichWorld IP settings.
- DO NOT treat game interpretations as historical facts.
- If Roblox gameplay needs a setting that conflicts with existing IP material, document the adaptation locally under `roblox-game/docs/`.
- Historical reference, game interpretation, and intentional mystery must remain distinguishable.

## Product Goal

Build `VOYNICH — The Living Manuscript` as a Roblox mystery exploration / co-op puzzle / collection / world reconstruction experience.

The game is not a combat-first simulator and not a 3D museum.

## Design Priorities

1. Exploration before combat.
2. Observation before reward.
3. Evidence before answers.
4. Cooperation before grind.
5. Persistent research before disposable loot.
6. Clear mobile interaction before visual complexity.

## Core Loop

`Explore → Observe → Collect Evidence → Form Hypothesis → Test → Decode → Restore a Page → Unlock New World`

New systems should state which stage(s) of this loop they improve.

## Non-Negotiable Game Rules

- Do not add canonical Voynich translations as game truth.
- Do not make paid answers, paid evidence, or pay-to-win research progression.
- Do not introduce generic sword / gun combat as the main progression loop.
- Failure language should favor manuscript metaphors (`Page Rejection`, `Ink Corruption`, `Anchor Glyph`).
- Permanent rewards must be server authoritative.

## MVP Priority

Current implementation target is only:

**Chapter 1: The Root**

Before expanding to other worlds, complete acceptance criteria in `docs/MVP_CHAPTER1.md`.

Do not prematurely build:
- full Astral Realm
- Green Baths
- Apothecary
- Star Archive
- nine-Rosette finale
- economy / trading
- full live ops

unless specifically requested.

## Code Architecture

Prefer service/controller separation:

Server services:
- PlayerDataService
- DiscoveryService
- CodexService
- HypothesisService
- PuzzleService
- ExpeditionService
- WorldEventService

Client controllers:
- InteractionController
- ScannerController
- CodexController
- PuzzleController
- StudyRoomController
- DiscoveryFXController

## Data Rules

- Every persistent content entity requires a stable ID.
- Never use localized display names as persistent keys.
- Save schema must include a version.
- Add migrations when changing persistent shape.
- Client may request actions; server decides rewards and permanent state.

ID examples:

```text
plant.herbal.001
glyph.vms.qo
location.rosette.center
puzzle.herbal.root_gate_01
artifact.folio.fragment_001
```

## AI / Agent Workflow

Before modifying code or design:

1. Read this file.
2. Read `README.md`.
3. Read the relevant document under `docs/`.
4. State the target system and acceptance criteria.
5. Make the smallest coherent change.
6. Add/update tests or validation where feasible.
7. Update the local Roblox docs when behavior changes materially.

Do not perform broad unrelated refactors during feature work.

## Definition of Done

A Roblox feature is not complete until:

- behavior matches the relevant GDD/MVP requirement
- mobile interaction is considered
- server/client authority is correct
- persistence impact is handled
- stable IDs are used
- exploit surface is considered
- IP boundary is preserved
- relevant documentation is updated

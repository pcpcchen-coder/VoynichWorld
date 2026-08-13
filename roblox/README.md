# VoynichWorld Roblox

Roblox adaptation of the VELLORA setting in this repository.

## Product statement

**VoynichWorld: VELLORA** is a cooperative mystery-exploration game where players reconstruct a field manuscript while diagnosing and intervening in a collapsing planetary biosphere.

The game is not a Voynich decipherment simulator and does not claim a real-world solution to MS 408.

## Primary player verbs

`Explore → Observe → Sample → Diagnose → Hypothesize → Intervene → Record → Unlock`

Combat, when present, is contextual survival pressure rather than the progression economy.

## First milestone

Chapter 1 / MVP focuses on:

- Archive prologue and transition into VELLORA
- one Rosette/Pool-Ring hub slice
- Herbal Wilds exploration zone
- 10 discoverable chimeric plants
- Codex reconstruction
- the signature taste/chemical-signal diagnosis mechanic
- three puzzle patterns
- one 2–4 player cooperative chamber
- one meaningful ecological intervention choice
- persistence of discoveries and Codex progress
- an Astral-region unlock teaser

See `docs/MVP.md` for acceptance criteria.

## Docs

- `docs/GDD.md` — game design source of truth
- `docs/ARCHITECTURE.md` — technical architecture
- `docs/LORE_GUARDRAILS.md` — mapping from World Bible to game
- `docs/MVP.md` — first playable milestone
- `docs/ISSUE_MAP.md` — implementation order

## Tooling

The project uses Luau and Rojo. `default.project.json` maps filesystem source into Roblox services so implementation can be code-reviewed and maintained outside Studio.

Current pinned Rojo line is documented in `rokit.toml`; update it intentionally rather than floating silently.

## Local start

```bash
cd roblox
rokit install
rojo serve
```

Then connect the Rojo Studio plugin to the local server.

## Build

```bash
cd roblox
rojo build default.project.json -o VoynichWorld.rbxlx
```

## Ownership boundaries

- Roblox code/assets: `roblox/`
- manuscript research truth: `guide/`, `guide-full/`, `data/`
- VELLORA canon: `docs/Vellora_WorldBible_v0.1.md`, `ip-bible/`

Do not fork canon inside gameplay files. Gameplay-specific interpretations belong in `docs/LORE_GUARDRAILS.md` and stable content data.

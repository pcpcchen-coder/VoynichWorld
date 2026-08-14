# MVP — Chapter 1: The Root

Status: v0.1

## Goal

Prove that VELLORA works as a Roblox game because discovery, diagnosis, Codex reconstruction, and ecological choice are fun before adding broad live-service systems.

## Player journey

```text
Archive prologue
  → enter VELLORA
  → Pool-Ring hub
  → Herbal Wilds
  → first specimen
  → Codex unlock
  → taste/chemical diagnosis tutorial
  → discover blocked Chlora node
  → co-op network chamber
  → ecological intervention choice
  → return/record
  → Astral route teaser
```

Target first-play duration: 30–45 minutes.

## In scope

### World

- 1 archive framing scene
- 1 VELLORA arrival scene
- 1 compact hub slice
- 1 Herbal Wilds exploration zone
- 1 authored network/puzzle chamber
- 1 visible Astral/Tide gate teaser

### Content

- 10 discoverable chimeric plant specimens
- 3 environmental/location discoveries
- 1 Chlora failure case
- 1 intervention decision with at least 2 valid outcomes
- 1 manuscript/Codex folio that visibly reconstructs through progress

### Mechanics

- interaction system
- observation/discovery registration
- specimen evidence state
- Codex UI/state
- chemical-signal diagnosis
- network-routing puzzle
- distributed-observation co-op puzzle behavior
- intervention choice
- durable progress save/load
- basic chapter unlock

### Multiplayer

- solo supported
- 2–4 player party supported for chamber
- shared chamber progress
- personal Codex ownership
- disconnect does not permanently block completion

### Devices/accessibility

- keyboard/mouse core path
- touch core path
- controller-compatible interaction design
- diagnosis uses redundant cues, not color or audio alone

## Out of scope

- full open world
- all six manuscript-derived regions
- 8–16 player production public servers
- PvP
- deep combat
- player trading
- crafting economy
- monetization products
- complete factions/endings
- procedural maps
- cross-server events
- external web account linking

## Content IDs

Initial naming convention:

```text
region: herbal_wilds
hub: rosette_hub
specimen: hv_001 ... hv_010
location: loc_hw_001 ...
challenge: diag_hw_001
puzzle: net_hw_001
story choice: int_hw_001
folio: folio_botany_01
chapter: chapter_01
```

IDs are stable once persisted.

## Acceptance criteria

### Onboarding

- [ ] Player can enter the manuscript/world transition without reading external instructions.
- [ ] Player reaches VELLORA and understands movement/interact controls.
- [ ] First discovery can occur within 3 minutes after entering VELLORA.

### Discovery/Codex

- [ ] At least 10 specimen definitions exist.
- [ ] A specimen can have multiple evidence layers.
- [ ] Duplicate observation cannot award duplicate durable progress.
- [ ] Codex visibly changes when evidence is recorded.
- [ ] At least one folio reconstruction milestone is tied to discoveries.

### Diagnosis

- [ ] At least one challenge uses 2+ evidence channels.
- [ ] Diagnosis result is server validated.
- [ ] Accessibility presentation can communicate the same logical evidence without relying solely on color/audio.
- [ ] Wrong diagnosis gives useful feedback/evidence without permanently bricking Chapter 1.

### Puzzle/co-op

- [ ] Network-routing puzzle has a clear ecological meaning.
- [ ] 2–4 players can contribute simultaneously or sequentially.
- [ ] Solo fallback preserves puzzle logic rather than auto-solving it.
- [ ] One disconnected player cannot make the chamber unwinnable.

### Intervention

- [ ] Player makes at least one graft/treat/isolate/cut/wait-style decision.
- [ ] At least two options are defensible with available evidence.
- [ ] Outcome is visible in the environment or Codex.
- [ ] Major choice flag persists across sessions.

### Persistence/security

- [ ] Profile has `profileVersion`.
- [ ] Persistent mutations go through PlayerDataService.
- [ ] Client cannot submit arbitrary reward amounts/profile patches.
- [ ] Rejoining restores discoveries, Codex state, and major Chapter 1 choice.

### Streaming/device

- [ ] Core client code tolerates relevant world instances streaming out/in.
- [ ] Core Chapter 1 path is testable on desktop and touch.
- [ ] Core interactions have controller-compatible bindings/prompts.

### Chapter closure

- [ ] Chapter 1 completion updates durable story state.
- [ ] Player returns to/understands the hub.
- [ ] Astral/Tide route becomes visibly interesting or unlocked as the next target.

## Definition of MVP done

MVP is done only when a new player can complete the above journey from a fresh profile, leave, rejoin, and see meaningful retained progress without developer intervention.

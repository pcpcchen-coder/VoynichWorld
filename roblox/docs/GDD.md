# Game Design Document — VoynichWorld: VELLORA

Status: v0.1 foundation

## 1. Vision

VoynichWorld: VELLORA is a cooperative mystery-exploration game built from the VELLORA canon. Players are not heroes who conquer the world; they are readers, field researchers, and ecological responders entering a dying biosphere whose surviving record will eventually resemble the Voynich Manuscript.

The emotional target is **wonder → pattern recognition → unease → responsibility**.

The progression fantasy is **understanding**, not raw power.

## 2. Design pillars

### P1 — The manuscript is the progression interface
Every major discovery should make the player's personal Codex look more complete. The collection UI is therefore not a detached menu; it is the diegetic reconstruction of a field manuscript.

### P2 — Knowledge creates capability
New actions are unlocked because the player has observed enough relationships to understand them: plant graft compatibility, chemical warning signals, tidal windows, pool routing, or glyph context.

### P3 — VELLORA is a living system
Plants, pools, creatures, weather, and Chlora nodes should feel connected. A local intervention can improve one region while creating a cost elsewhere.

### P4 — Cooperation reveals incomplete truth
A party should benefit from distributed observation. Different positions, timing windows, tools, or sensory channels reveal different evidence, so communication matters without making solo play impossible.

### P5 — Uncertainty is playable
The game should reward forming and revising hypotheses rather than merely selecting a designer-authored answer from a quiz.

## 3. Core loop

```text
Explore
  ↓
Observe / scan / listen / taste-signal
  ↓
Collect specimen or environmental evidence
  ↓
Record into Codex
  ↓
Form/update hypothesis
  ↓
Diagnose ecological state
  ↓
Choose intervention
  ↓
Observe consequences
  ↓
Unlock new routes, tools, or manuscript layers
```

A short loop should resolve in 2–5 minutes. A complete expedition loop should resolve in roughly 15–30 minutes.

## 4. Player fantasy and roles

Players begin as **Readers**. Titles represent knowledge milestones rather than classes:

- Reader
- Observer
- Field Researcher
- Decoder
- Cartographer
- Archivist

Skills are domain familiarity, not combat stats:

- Botany
- Chemical sensing / diagnosis
- Astronomy / tide reading
- Cartography
- Glyphology
- Intervention / grafting

Party specialization is encouraged through loadout/tools and accumulated knowledge, but no permanent class lock is required for MVP.

## 5. Signature mechanic — Taste / chemical-signal diagnosis

VELLORA canon gives Korin the ability to interpret chemical information through taste and touch. The Roblox adaptation turns this into a sensory puzzle rather than a text answer.

A diagnosis sample can expose a sequence of signal traits such as:

- metallic / copper-like onset
- bitter cooling transition
- sulfur/burnt tail
- sweet fermentation marker
- numb/static interference
- pulse cadence

The player compares the sensed pattern to learned Codex evidence. Early content may provide strong hints; later content uses overlapping patterns and environmental context.

Important rules:

- never reduce the mechanic to a single color = answer mapping;
- diagnosis must combine at least two evidence channels by midgame;
- client displays sensory presentation, server validates the selected diagnosis and resulting intervention;
- accessibility mode must offer non-audio/non-color-only equivalents.

## 6. Codex / personal manuscript

The Codex is the main meta-progression surface.

Each entry has layers:

1. silhouette / unknown
2. observed visual form
3. sampled components
4. habitat evidence
5. chemical-signal evidence
6. relationships to other species or Chlora nodes
7. intervention outcomes
8. optional glyph/folio association

Example state:

```text
Specimen: hv-010
Name: unknown until enough evidence is collected
Observed: leaf, flower, root interface
Missing: night behavior
Signal evidence: copper + cold-bitter + weak sulfur
Hypotheses:
- drought stress: 18%
- Chlora embolism: 71%
- toxin exposure: 42%
```

Percentages are confidence/evidence scores, not claims of scientific probability unless the specific system defines them mathematically.

## 7. World structure

### 7.1 Rosette / Pool-Ring Hub
The hub visually borrows from the manuscript's large cosmological/rosette imagery but in canon functions as a mapped ecological/geographical network rather than proof of a literal historical portal map.

Functions:

- social gathering
- expedition launch
- region progression visualization
- Codex archive access
- visible locked routes
- faction/story indicators later

### 7.2 Herbal Wilds
Primary MVP region.

Gameplay:

- find chimeric plants
- trace root interfaces
- detect active/blocked Chlora connections
- sample organs
- observe day/night or moisture-dependent behavior
- diagnose failing nodes
- perform first intervention

### 7.3 Astral/Tide region
Post-MVP teaser, later full region.

Gameplay:

- align orbital/tidal cycles
- predict pool activation windows
- coordinate ring mechanisms
- map climate anomalies

### 7.4 Pool Ecology / Green Baths
Gameplay:

- fluid-routing puzzles
- manage living pool connections
- interpret Linner messenger behavior
- coordinate valves/nodes across a chamber

### 7.5 Apothecary / Experiment region
Gameplay:

- compare plant-part chemistry
- create treatment hypotheses
- test reversible samples before live intervention
- record failure as useful evidence

### 7.6 Star Archive / response records
Gameplay:

- connect field notes, star-marked entries, and experiment records
- discover repeated contextual patterns
- build theories without presenting fictional translation as historical truth

## 8. Puzzle grammar

MVP requires three reusable puzzle families.

### A. Signal sequence
Player observes chemical/sensory traits and selects or constructs a diagnosis.

### B. Network routing
Player restores or isolates Chlora/pool pathways under resource/pressure constraints.

### C. Distributed observation
Different party positions reveal complementary evidence. Solo mode substitutes timed instruments/echo recordings rather than changing the intended logic.

Later families:

- orbital alignment
- graft compatibility graph
- glyph-context clustering
- ecological tradeoff optimization

## 9. Consequence and intervention model

Core intervention verbs:

- Graft
- Treat
- Isolate
- Cut
- Wait / observe

No option should be universally superior. A valid choice may trade:

- local survival vs network spread
- short-term relief vs long-term diversity
- preserving one lineage vs protecting a Chlora node
- knowledge gain vs ecological risk

MVP needs one choice with visibly different near-term consequences and a persisted decision flag, but it does not need full branching endings.

## 10. Narrative structure

### Prologue — The Last Page
Player encounters the manuscript framing layer and crosses into VELLORA.

### Chapter 1 — The Root
Player learns that a strange plant is not an isolated organism but an interface to a larger failing network.

MVP chapter beats:

1. Enter archive framing scene.
2. Transition into VELLORA.
3. Reach Pool-Ring hub.
4. Enter Herbal Wilds.
5. Complete first observation.
6. Unlock Codex reconstruction.
7. Learn taste/chemical diagnosis.
8. Discover evidence of Chlora failure.
9. Complete co-op/network chamber.
10. Choose first intervention.
11. Return with specimen/field record.
12. Astral route illuminates as next mystery.

## 11. Multiplayer

### Public expedition
Target later: 8–16 players in broad exploration spaces.

### Research party
1–4 players for authored puzzle chambers and chapter content.

MVP optimizes for 1–4 players.

Co-op rules:

- no hard requirement for voice chat;
- important evidence is representable through pings/UI/logs;
- party members share expedition state but retain personal Codex ownership;
- one player's disconnect must not permanently brick a chamber.

## 12. Failure model

Avoid generic "YOU DIED" as the dominant language.

Environmental failure can be framed as:

- page rejection / ink dissolution in the manuscript framing layer;
- retreat from unstable Chlora zone;
- specimen loss;
- intervention failure that still produces evidence.

Failure should usually teach or expose new information.

## 13. Progression

Progression sources:

- first observation
- evidence completion
- puzzle completion
- intervention outcome
- map discovery
- collaborative discovery
- chapter milestones

No XP should be awarded for repetitive low-information actions solely to create grind.

## 14. Monetization guardrails

Allowed directions:

- cosmetic clothing
- lantern/tool skins
- Codex skins
- study-room decoration
- emotes
- private expedition convenience where fair
- supporter/archive cosmetics

Forbidden:

- buying puzzle answers
- buying evidence completion
- skipping canon progression with Robux
- stronger diagnosis probability because of payment
- paid endings
- paid intervention advantage

## 15. Accessibility and device requirements

Core actions must work on keyboard/mouse, controller, and touch.

Never encode a required answer only by:

- color
- audio pitch
- tiny text
- fast precision cursor movement

Provide redundant presentation for sensory diagnosis.

## 16. MVP success metrics

Product validation targets rather than launch KPIs:

- player reaches first discovery within 3 minutes of entering VELLORA;
- player can explain that the Codex is their progression record after first 10 minutes;
- at least one diagnosis requires combining multiple clues;
- at least one co-op puzzle creates meaningful communication without blocking solo completion;
- the first intervention choice produces a visible consequence;
- Chapter 1 playable time target: 30–45 minutes for a first-time player;
- completion clearly points toward the Astral/Tide region.

## 17. Explicit non-goals for MVP

- open-world 16-player production scale
- complete faction ending system
- user-generated glyph translation
- trading economy
- PvP
- large combat system
- procedural generation
- full six-region implementation
- live-service monetization rollout

## 18. Canon dependency

Game design must remain compatible with `../../docs/Vellora_WorldBible_v0.1.md`. If future gameplay intentionally extends canon, record the extension in `LORE_GUARDRAILS.md` before implementation.

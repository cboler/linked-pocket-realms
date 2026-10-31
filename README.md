# Linked Pocket Realms

**Serverless P2P MUD Progressive Web Application** inspired by `.hack`'s 3-Word Chaos Gate procedural generation, classic MOO/MUD curation, and tick-based Active Time Battle (ATB) tactical combat.

## Core Architecture

1. **`.hack`-Inspired 3-Word Chaos Gate Generator (`ChaosGateService`)**:
   - Every Pocket Realm is generated from a **Server Era Letter** (`Δ`, `Θ`, `Λ`, `Σ`, `Ω`) + **3-Word Gate Address** (`[Atmosphere Prefix] + [Structural Theme] + [Biome Noun]`).
   - Deterministic `Mulberry32` PRNG baseline generation layered with a lightweight **JSON Delta Layer** (`RealmDelta`) stored in `IndexedDB` and exportable as a compact base64 cartridge.
2. **Universal Shared Legend + Extensible Custom Symbols (`LegendRegistryService`)**:
   - Standardized semantic glyphs across all realms (`Anchor Portal`, `Safe Campfire`, `Elite/Boss Chamber`, `Puzzle/Mechanism`, `Lore Terminal`, `Treasure Vault`, `Hazard/Trap`, `Merchant/Shrine`) plus automatic merging of host-registered custom symbols on portal entry.
3. **Hybrid 100ms Tick-Based ATB & Tactical Skill Queue (`MudEngineService`)**:
   - 4 equippable Class Cores (_Vanguard_, _Chronomancer_, _Hexblade_, _Artificer_), 4 Active Skill Slots, 2 Passive Traits, and elemental/status combos (`Burn`, `Chill`, `Sunder`, `Overcharge`) that interact with room atmosphere mutators.
   - **Dual-Input Parity**: Typing `cast sunder automaton` in the terminal and clicking `[Sunder Strike]` on the HUD dispatch the exact same `CommandIntent` payload.
4. **Role-Based Perspective Switching & On-Demand SVG Telemetry Drawers**:
   - **Explorer View**: Fog-of-War node map with rumor signals, Sensory Terminal with clickable inline entity badges, and `PER`/Bestiary-gated Inspector Lens.
   - **Architect / Overseer View**: God's-Eye topological SVG graph, Live P2P Visitor Radar, and visual + MOO terminal (`@dig`, `@describe`, `@craft`, `@trigger`, `@legend`) room and declarative `WHEN / IF / DO` trigger editor.
   - **Spectator / Chronicle Replay View**: Interactive timeline scrubber for recorded visitor runs and gravestone logs.
   - **On-Demand Drawers**: Interactive 7-slot Paperdoll with `Verified Drop` / `Architect Forged` provenance badges, 5-axis Attribute Radar SVG chart, Combat DPS/Mitigation stacked bars & d100 Roll Histogram, Dungeon Lethality/Traffic Heatmap, and Traveler's Career Chronicle.
5. **Serverless P2P Networking & Customs Gate Security (`TransportService` & `StorageService`)**:
   - Dual adapters: `BroadcastChannel` for instant zero-config cross-tab Anchor Room linking and `WebRTC` SDP room codes for LAN/remote P2P play.
   - Native Web Crypto API (`SubtleCrypto` ECDSA P-256) keypair generation and boss drop signing, paired with automatic **Customs Gate** stat budget clamping when visiting realms with stricter rulesets.

# Execution Plan: "Conjunction of the Spheres" Home Growth + 3-Word Wayfinder Expeditions

- **Date**: 2026-10-31
- **Status**: Completed
- **Owner**: Antigravity Assistant

## 1. Goal & Objectives

Refactor the dual gameplay loops in Linked Pocket Realms so that:

1. **The Persistent Home Dungeon**:
   - Starts as a 6-room **Primordial Sanctum** centered on the Anchor Room with dynamic `TraitProfile` calculation across active rooms.
   - Grows organically via the 3-Way **"Conjunction of the Spheres" Incursion Algorithm (`triggerConjunctionIncursion`)** upon any collision/connection (WebRTC, BroadcastChannel, Thunderpass, or `?spore=` link).
   - Conjunction rooms combine traits via a 3-part blend: 40% Local Host, 40% Remote Host, and 20% Wild Conjunction Anomaly (emergent keywords, elemental hazards, rare mob modifiers) up to a 25–30 room cap, persisting permanently in IndexedDB unless pruned.
2. **Wayfinder Expeditions (Temporary 3-Word Delves)**:
   - Repurposes the 3-word combinatorial generator as the **Wayfinder Loom** in the Anchor Room, opening an **Unstable Expedition Rift** (6 temporary rooms accessible through a purple Rift Portal).
   - Defeating the Expedition Boss awards a **Sphere Core** carrying the delve's 3-word traits.
   - Players can **Crack** the Sphere Core for high-tier loot/XP or **Graft** it at the Anchor Loom to permanently sprout 1–2 rooms onto their Home Dungeon.
   - Closing or leaving the Expedition collapses temporary rooms cleanly without cluttering IndexedDB.

## 2. Context & Background

- Previously, the player's Home Realm was generated from a single 3-word address and sprouted rooms in isolated wings based only on growth stage.
- Incursions were termed "Overgrowth" and were temporary grafts pruned only for shards.
- The user wants a richer, more meaningful meta-progression where the Home Dungeon becomes a living, evolving tapestry of collided realms, while the 3-word generator serves as an infinite expedition system yielding harvestable Sphere Cores.

## 3. Implemented Changes

### Domain Models (`src/app/core/models/domain.models.ts`)

- Added `TraitProfile` interface (histogram of atmospheres, architectures, biomes, and primary traits).
- Added `ConjunctionAnomaly` interface (emergent title prefix, elemental hazard, rare mob modifier).
- Extended `RoomNode` and `RoomDeltaOverride` with `isConjunction?: boolean`, `conjunctionAnomaly?: ConjunctionAnomaly`, `isExpedition?: boolean`, `isRiftPortal?: boolean`, `sphereCoreAddress?: ChaosGateAddress`.
- Extended `EquipmentItem` with `isSphereCore?: boolean`, `sphereCoreAddress?: ChaosGateAddress`, `sphereCoreRarity?: string`, `description?: string`.

### Procedural Generation (`src/app/core/services/chaos-gate.service.ts`)

- Implemented `generatePrimordialSanctum(era, ownerName)`: 6-room balanced starting sanctum layout.
- Implemented `computeTraitProfile(rooms: RoomNode[])`: Calculates dynamic weighted histogram and primary traits across non-expedition rooms.
- Implemented `generateConjunctionIncursion(existingRooms, localAnchor, remoteProfile, remoteOwner, conjunctionCount, remoteEcho)`:
  - Generates 2-to-4 room Conjunction Wing with 40% Local Host, 40% Remote Host, and 20% Wild Conjunction Anomaly.
  - Implements emergent mutated properties using `Mulberry32(LocalSeed ^ RemoteSeed ^ ConjunctionCount)`.
- Implemented `generateExpeditionRooms(address: ChaosGateAddress)`: Generates 6-room temporary expedition map with boss sanctum and entrance rift. Boss in `exp-5` carries guaranteed `Sphere Core` item drop.
- Implemented `graftSphereCoreRooms(existingRooms, coreAddress, coreName)`: Sprouts 1–2 permanent rooms carrying the Sphere Core's traits onto an open border of the Home Dungeon.

### Engine & State Management (`src/app/core/services/mud-engine.service.ts`)

- Initialized starting realms with the 6-room Primordial Sanctum.
- Added `traitProfile = computed(() => this.chaosGate.computeTraitProfile(this.rooms()))`.
- Added `activeExpeditionRift = signal<ChaosGateAddress | null>(null)`.
- Implemented `triggerConjunctionIncursion(remoteAddress, remoteOwner, remoteEcho, remoteProfile)`:
  - Checks 30-room maximum capacity limit.
  - Generates conjunction wing with wild anomaly traits, updates `rooms()` and `activeRealmDelta()`, persists to storage.
  - Connected to WebRTC offer/answer, BroadcastChannel, Thunderpass, and `?spore=` boot loaders.
  - Wrapped by `graftOvergrowthIncursion` for backwards compatibility.
- Implemented Wayfinder Expeditions:
  - `openExpeditionRift(era, atmosphere, theme, biome)`: Checks Anchor Room, verifies shard cost or daily charge, opens purple Rift exit (`[Up]`) to temporary expedition.
  - `enterExpeditionRift()`: Moves player into `exp-0`.
  - `collapseExpeditionRift()`: Safely relocates player if inside expedition, removes temporary expedition rooms, cleans up rift exit.
  - `crackSphereCore(coreId)`: Consumes core for +100 Resonance Shards and +150 XP.
  - `graftSphereCore(coreId)`: Spliced 1–2 rooms from the Sphere Core into the Home Dungeon and persists them.
- Added terminal commands `@rift`, `@enter rift`, `@close rift`, `@crack`, `@graft`.

### UI & Modal Components (`src/app/hud/`)

- Updated `resonance-loom-modal` (Weaver Tab):
  - Added Primordial Home Dungeon Trait Profile card (primary atmosphere, architecture, biome, room capacity / 30).
  - Added Wayfinder Loom: Unstable Expedition Delves dialer (era, atmosphere, architecture, biome selectors, quick roll button).
  - Added rift controls (`[🌀 Open Expedition Rift]`, `[🚪 Enter Rift]`, `[❌ Collapse Active Rift]`).
  - Added Harvested Sphere Cores inventory list with `[💥 Crack Core]` and `[🌱 Graft to Home]` buttons.
- Updated `node-map-graph`:
  - Visually styled Rift Portal edges (`.rift-portal-edge` glowing purple dashed line).
  - Added golden dashed anomaly ring on Conjunction rooms (`node.room.isConjunction`).
  - Added purple swirling portal badge on Rift rooms (`node.room.isRiftPortal`).

## 4. Verification

- [x] Unit tests pass: `npm test` (47/47 passing)
- [x] Static analysis passes: `npm run lint` (0 errors)
- [x] Formatting passes: `npm run format:check` (All files match prettier style)
- [x] Production build passes: `npm run build` and `npm run build:pages` (0 errors)

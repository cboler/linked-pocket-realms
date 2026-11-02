# Execution Plan: Etrian Odyssey-Style Enemy SVG Representation & Adjective Visual Mutators

- **Date**: 2026-11-01
- **Status**: Completed
- **Owner**: Antigravity Pair Programmer

## 1. Goal & Objectives

Transform the enemy visual presentation in the first-person dungeon crawler (`FirstPersonStageComponent`) from generic identical polygon shapes into rich, distinct, Etrian Odyssey-style animated SVG representations. Every enemy family and boss archetype will have a visually unique silhouette and anatomy, and their descriptive adjectives (atmospheric, elemental, anomaly prefixes, status effects, and server era ranks) will directly mutate their visual appearance (color schemes, glowing cores, particle systems, gear mechanisms, frost spikes, fire corollas, void tendrils, and armor textures).

## 2. Context & Background

- Currently, all enemies in `FirstPersonStageComponent` (`src/app/viewport/first-person-stage.html`) are rendered as an identical generic dark polygon with a red dot (or a slightly scaled maroon polygon for bosses).
- The game features 8 structural themes (Clockwork, Fungal, Monolithic, Labyrinthine, Sunken, Astral, Ossuary, Forge), each with 4 distinct monster species (32 regular enemy types), plus 8 biome boss archetypes, expedition bosses, and incursion creepers.
- Enemies possess descriptive adjectives:
  - Atmospheric / Elemental: Scorching (Fire), Crystalline (Frost), Tempestuous (Lightning), Abyssal (Void), Blighted (Bio), Aetherial (Lightning/Astral), Gilded (Physical), Silent (Void).
  - Conjunction Anomaly Prefixes: Void-Warped, Chrono-Fractured, Cataclysmic, Prismatic, Sub-Zero, Magnetic, Temporal, Eldritch.
  - Active Combat Statuses: Burn, Chill, Sunder, Overcharge, Silenced, Regen.
  - Server Era Tiers: Δ (Delta), Θ (Theta), Λ (Lambda), Σ (Sigma), Ω (Omega).
- Per `AGENTS.md` and `GEMINI.md`, we adhere to Angular Signals, mobile-first SVG scaling, standard CSS animations with `prefers-reduced-motion` compliance, and strict zero-regression quality gates.

## 3. Proposed Changes

### Core Models & Utilities

- Enhance `MonsterEntity` with an optional `adjectives?: string[]` field to support both explicit and dynamically parsed adjective tags.
- Create an enemy visual resolver utility (`src/app/viewport/enemy-visuals/enemy-visual-resolver.ts`) that maps:
  1. Base archetype identification (e.g. `scuttler`, `automaton`, `hound`, `sentinel`, `hulk`, `weaver`, `stalker`, `shambler`, `colossus`, `golem`, `obelisk`, `gargoyle`, `minotaur`, `phantom`, `spider`, `leviathan`, `siren`, `knight`, `eel`, `seraph`, `wraith`, `lich`, `choir`, `behemoth`, `drake`, `fiend`, `bosses`).
  2. Adjective extraction from monster name, explicit adjectives, active statuses, elemental affinity, and room atmosphere.
  3. Visual mutation attributes: color palette, emissive glow colors, aura filters, overlay particles (embers, frost, lightning, void smoke, spores, starlight, filigree, gears), and animation modes.

### Enemy SVG Visual Components / Sub-Templates

- Create a dedicated standalone Angular component (`src/app/viewport/enemy-sprite/enemy-sprite.ts`) with:
  - Unique vector silhouettes for each creature category:
    - **Mechanical/Clockwork**: Automaton, Scuttler, Hound, Sentinel, Greed-Engine
    - **Beasts/Arachnids/Serpents**: Trap-Spider, Spore-Weaver, Eel, Drake, Leviathan-Spawn
    - **Fungal/Botanical**: Mycelial Hulk, Cordyceps Stalker, Lichen Shambler, Incursion Creeper, Overgrowth Guardian
    - **Monoliths/Golems/Constructs**: Basalt Colossus, Runic Golem, Obelisk Warden, Shard Gargoyle, Comet Construct, Bone Construct, Molten Ingot-Fiend, Forge Core
    - **Specters/Wraiths/Astral**: Corridor Phantom, Mirror Stalker, Void Weaver, Nebula Seraph, Starlight Wraith, Brine Siren
    - **Undead/Skeletal/Marrow**: Marrow Knight, Skull Chime Choir, Crypt Lich-Thrall, Arch-Regent
    - **Boss Titans**: Grand Lord-Commander, Panopticon Astromancer, Fallen Hierophant, Curator Prime, Fulminating Sovereign, Prime Forgemaster Core
  - Dynamic Adjective Mutation Layer:
    - Ember / Flame coronas for `Scorching` / `Fire` / `Burn`
    - Frost crystals and icy spikes for `Crystalline` / `Sub-Zero` / `Chill`
    - Crackling electric arcs for `Tempestuous` / `Magnetic` / `Overcharge`
    - Shadow tendrils and dark eyes for `Abyssal` / `Silent` / `Void`
    - Toxic spore emissions for `Blighted` / `Fungal` / `Bio`
    - Stardust and celestial halo for `Aetherial` / `Radiant`
    - Metallic filigree and glints for `Gilded`
    - Ticking cogs and ghost echoes for `Clockwork` / `Chrono-Fractured`
    - Armor fractures for `Sunder`
    - Mute seal for `Silenced`
  - Subtle idle animations:
    - Breathing / floating hover (`@keyframes enemy-float`)
    - Cog spin for mechanical units
    - Spore / ember / spark drift
    - Ocular / core pulsing
    - Full reduced-motion fallback

### Viewport Stage Integration

- Integrate the visual system cleanly into `first-person-stage.html` and `first-person-stage.ts`.
- Add tactical adjective badges under the monster name for visual inspection and combo planning.
- Ensure click-to-target, attack, skill-cast, and inspect actions remain seamless.

## 4. Implementation Steps

- [x] **Step 1: Visual Resolver & Domain Models**:
  - Add `adjectives?: string[]` to `MonsterEntity` in `domain.models.ts`.
  - Implement `enemy-visual-resolver.ts` with comprehensive archetype parsing, adjective parsing, and palette generation.
- [x] **Step 2: Enemy SVG Component / Sprite System**:
  - Implement `EnemySpriteComponent` containing distinct anatomical designs for each monster family and boss archetype.
  - Implement SVG adjective overlays (particles, coronas, crystals, lightning, tendrils, gears, filigree).
- [x] **Step 3: Viewport Stage Update**:
  - Replace generic polygon in `first-person-stage.html` with the new enemy sprite system.
  - Update `first-person-stage.scss` with CSS keyframes, glow filters, and responsive styling.
  - Add adjective indicators in the stage HUD.
- [x] **Step 4: Regular Monster Adjective Generation**:
  - Update `chaos-gate.service.ts` to assign atmospheric or thematic adjectives to regular monsters so they match the boss adjective richness.
- [x] **Step 5: Testing & Quality Gates**:
  - Add unit tests verifying archetype resolution, adjective visual mutations, and SVG rendering.
  - Run `npm test`, `npm run lint`, `npm run format:check`, and `npm run e2e`.
  - Verify visually across viewports.

## 5. Verification Plan

- [x] Unit tests pass: `npm test` (67/67 passed)
- [x] Lint analysis passes: `npm run lint` (0 errors, 0 warnings)
- [x] Formatting passes: `npm run format:check` (All files Prettier formatted)
- [x] E2E smoke tests pass: `npm run e2e` (4/4 viewports passed)
- [x] Real browser verification in mobile portrait (390x844), mobile landscape (844x390), tablet (768x1024), and desktop (1280x800).

## 6. Risks, Ceilings & Rollback

- **Ceiling**: Pure SVG vector art without heavy raster textures maintains high framerates and small bundle size (< 20KB footprint), ideal for static PWA hosting.
- **Rollback Strategy**: Git restore of `src/app/viewport/first-person-stage.*` reverts to previous generic silhouette if needed.

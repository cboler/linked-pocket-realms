# Linked Pocket Realms

A browser dungeon crawler where every player's browser holds their own dungeon. You explore it in a first-person view, fight in real-time Active Time Battle (ATB) combat, and grow it by defeating monsters. Other players can visit your dungeon and you can visit theirs, peer to peer, with no game server.

**Play:** <https://cboler.github.io/linked-pocket-realms/>

Inspired by `.hack`'s three-word server addresses, classic MOO/MUD world-building, and ATB combat.

## How it works

1. **Three-word dungeons (`ChaosGateService`)**
   - Every dungeon ("Pocket Realm") comes from an era letter (`Δ Θ Λ Σ Ω`, the difficulty) plus three words: atmosphere (element), theme (monsters and traps), and biome (boss room). For example, `Θ: Scorching Clockwork Catacombs`.
   - The address seeds a deterministic `Mulberry32` generator, so the same words always build the same dungeon. Changes are stored as a small JSON delta (`RealmDelta`) in IndexedDB and can be exported as a base64 cartridge. Your own progress (defeated monsters, collected loot) is stored separately and survives reloads.
2. **Shared map legend (`LegendRegistryService`)**
   - Standard symbols across all realms (anchor portal, campfire, boss chamber, puzzle, lore terminal, treasure vault, hazard, merchant), plus custom symbols a realm's owner can register.
3. **ATB combat and skills (`MudEngineService`)**
   - Four classes (_Vanguard_, _Chronomancer_, _Hexblade_, _Artificer_), four active skills, two passives, and elemental/status combos (`Burn`, `Chill`, `Sunder`, `Overcharge`) that interact with each room's atmosphere.
   - **Dual input**: typing `cast sunder automaton` in the terminal and pressing `[Sunder Strike]` on the HUD send the same `CommandIntent`.
4. **Three perspectives and data drawers**
   - **Explorer**: fog-of-war map, room cards with clickable entities, and a Perception-gated inspector.
   - **Architect**: full dungeon graph, visitor radar, and MOO-style building commands (`@dig`, `@describe`, `@craft`, `@trigger`, `@legend`) with a `WHEN / IF / DO` trigger editor.
   - **Spectator**: replay timeline for recorded visitor runs and gravestones.
   - **Drawers**: 7-slot equipment paperdoll with provenance badges, attribute radar, combat charts, dungeon heatmap, and career chronicle.
5. **Peer-to-peer play (`TransportService`, `StorageService`)**
   - `BroadcastChannel` links tabs in the same browser instantly; WebRTC DataChannels link browsers, using copy-paste room codes or the optional broker lobby.
   - Boss drops are signed with Web Crypto (ECDSA P-256). When you visit a realm with stricter rules, over-powered gear is scaled down for the visit (the "Customs Gate").
6. **Optional broker (`cloud-function/`)**
   - A free-tier Google Cloud function that exchanges WebRTC handshakes and matches nearby players for Thunderpass (StreetPass-style) encounters using blinded geohashes. Solo play never needs it.

## Develop

Requires Node.js 22+ and npm 10+.

```bash
npm ci
npm start          # http://localhost:4200/
npm test           # Vitest unit tests
npm run lint
npm run format:check
npm run e2e        # Playwright: phone portrait/landscape, tablet, desktop
```

Pushes to `main` deploy to GitHub Pages through `.github/workflows/deploy.yml` after the same checks pass.

## Docs

- [AGENTS.md](AGENTS.md): code map, commands, and guardrails for contributors and coding agents
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): services, persistence, networking, layout
- [docs/DECISIONS.md](docs/DECISIONS.md): architecture decision records
- [docs/ROADMAP.md](docs/ROADMAP.md): milestones, feature backlog, technical debt
- [cloud-function/README.md](cloud-function/README.md): broker deployment and free-tier limits

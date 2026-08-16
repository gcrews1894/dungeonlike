# D&D-Themed Roguelike — MVP Vertical Slice Design

## Summary

A browser-based, D&D-themed roguelike. The player picks a class, explores a
single procedurally generated dungeon level rendered as an ASCII/glyph grid,
and fights monsters in a separate Pokémon-style turn-based battle screen
using real d20 combat math. No visual art assets — legibility comes from
character glyphs, color, and real D&D stat blocks. This spec covers the
first playable vertical slice only; leveling, multi-level dungeons, full
spell lists, and a broader bestiary are explicitly out of scope and will be
separate follow-on specs.

## Goals

- Prove out the full loop: character select → explore → fight → win/die.
- Use real, structured D&D data (stats, dice, AC, HP) so encounters feel
  legitimate rather than made up.
- Keep game logic decoupled from rendering so combat/dungeon rules are
  testable and extensible without UI rewrites.

## Non-goals (this slice)

- Character leveling, XP, or spell progression.
- Multiple dungeon levels / persistent runs across levels.
- Full inventory management (equipping, stacking, selling) — pickup + use
  only.
- Accounts, save/load, or any backend. Single browser session, no
  persistence across reloads.
- Non-SRD content curated by hand (see Content Source below).

## Content source

D&D monster and class data is sourced from the **open5e API**, which
serves 5e System Reference Document (SRD) content under its open license.
This is what "information available online" resolves to in practice for
structured, legitimate stat blocks — the full Monster Manual / Player's
Handbook are closed WotC IP and not available as clean structured data.
The SRD still covers a recognizable D&D core (goblins, orcs, skeletons,
dragons; Fighter, Wizard, Rogue, Cleric, etc.), which is sufficient for
this slice. Expanding beyond SRD content later would require manual,
hand-curated data entry and a licensing decision — out of scope here.

Data is fetched **once, at development time**, not at runtime. A Node
script normalizes the open5e responses into the minimal shape the engine
needs and writes it to local JSON checked into the repo. The running game
has no network dependency.

## Architecture

A standalone TypeScript **engine** module owns all game state and rules,
with no dependency on React or the DOM:

- Exposes a `GameState` type and pure(ish) action functions —
  `movePlayer`, `startBattle`, `chooseBattleAction`, `useItem`,
  `descendStairs`, `selectClass` — each taking the current state and
  returning the next state.
- Contains dice rolling, combat resolution, and dungeon generation as
  independently unit-testable functions with no rendering involved.

React holds the current `GameState` at the app root (`useReducer` calling
into the engine's action functions), re-rendering the appropriate view
based on `state.mode`. Components never contain rule logic — they render
state and dispatch actions.

### Project layout

```
src/
  engine/        # pure TS: state, actions, dice, combat, dungeon-gen — no React
    state.ts
    dice.ts
    combat.ts
    dungeon.ts
    actions.ts
  data/          # generated JSON, checked into repo
    monsters.json
    classes.json
  components/
    App.tsx
    CharacterSelect.tsx
    DungeonView.tsx     # ASCII grid
    BattleView.tsx      # stat blocks, HP bars, action menu, log
    Inventory.tsx
scripts/
  fetch-data.ts  # one-time open5e -> local JSON normalizer
```

## Data model

```ts
type GameState = {
  mode: 'character-select' | 'exploring' | 'battle' | 'victory' | 'game-over'
  player: {
    class: string
    abilityScores: Record<AbilityName, number>
    hp: number
    maxHp: number
    ac: number
    inventory: Item[]
    position: { x: number; y: number }
  }
  dungeon: {
    grid: Tile[][]
    rooms: Room[]
    stairsPosition: { x: number; y: number }
    monsters: MonsterInstance[]
    items: ItemDrop[]
  }
  battle?: {
    monster: MonsterInstance
    log: string[]
  }
}
```

Static class/monster definitions (from `data/classes.json` and
`data/monsters.json`) are loaded once and never mutated. `GameState` only
holds runtime instances derived from that data (e.g., a monster's current
HP), so the source data stays a stable reference table.

## Dungeon generation

Room-and-corridor generation, the standard roguelike approach:

1. Randomly place a number of non-overlapping rectangular rooms on a grid.
2. Connect rooms with L-shaped corridors (simple graph: connect each room
   to the next, ensuring full connectivity).
3. Choose the start room for the player's spawn position.
4. Choose the room with the greatest graph distance from the start as the
   stairs-down location.
5. Scatter monsters and items into the remaining rooms, weighted so the
   level is beatable, not overwhelming.

This is preferred over BSP trees (more even but more complex to implement)
or cellular automata (organic caves, poor fit for room-based monster/item
placement and a "dungeon" read).

## Combat system

Combat is a self-contained state machine that exists only while
`state.battle` is populated (`state.mode === 'battle'`).

**Flow:**
1. Player walks into a monster's tile in `exploring` mode → engine calls
   `startBattle`, setting `mode: 'battle'` and populating `state.battle`.
2. Player chooses an action from a menu: **Attack**, **Cast/Use Ability**,
   **Item**, **Flee**.
3. Engine resolves the action using real d20 mechanics:
   - Attack: d20 + modifier vs. target AC; on hit, roll damage dice.
   - Ability/spell: attack roll or save DC as appropriate to the ability.
   - Item: apply item effect (e.g., potion heals HP).
   - Flee: chance-based or automatic (TBD at implementation time — default
     to automatic success, returning to `exploring` at the player's prior
     grid position, since this is a single-monster slice with no chase
     mechanic).
4. Each resolution appends a line to `battle.log` (e.g., "You hit the
   goblin for 6 damage.").
5. If the monster survives, it takes its turn the same way (its own
   attack roll/damage against the player).
6. Battle ends when either HP reaches 0 (monster defeated → clear it from
   `dungeon.monsters`, return to `exploring`; player defeated →
   `mode: 'game-over'`) or the player flees.

**UI is purely a reflection of this log and the two combatants' current
stat blocks/HP** — "animation" is sequential log reveal plus HP bar
updates, no actual sprite/motion animation since there are no art assets.

Monster defeat in this slice awards no XP or loot beyond items already
placed in the dungeon (no leveling system yet).

## Win/lose conditions

- **Win:** player reaches the stairs-down tile while in `exploring` mode
  → `mode: 'victory'`.
- **Lose:** player HP reaches 0 in battle → `mode: 'game-over'`.
- Permadeath, single run, no save — reflects the roguelike genre and this
  slice's no-persistence scope.

## Testing approach

- Engine functions get unit tests with a seeded/injectable RNG so dice
  rolls and dungeon generation are deterministic in tests:
  - Dice/combat resolution: hit/miss/damage math against known rolls.
  - Dungeon generation invariants: stairs are always reachable from the
    start room, no overlapping rooms, monster/item counts within expected
    bounds.
- Components get light interaction tests against a fixed `GameState`
  fixture (e.g., selecting a class advances to `exploring`; choosing
  "Attack" in battle appends a log line and updates HP).
- Follows test-driven-development during implementation: tests for engine
  behavior are written before the corresponding action function.

## Risks / open questions

- **Content licensing**: proceeding on SRD-via-open5e as the practical
  interpretation of "information available online." Expanding to
  non-SRD official content later needs a explicit decision (hand-curated
  data entry, and accepting the licensing exposure that comes with it).
- **open5e data completeness/consistency**: spellcasting classes have
  more complex data (spell lists, slots) than martial classes. The fetch
  script may need per-class normalization logic; if a given class's data
  is too messy to normalize cleanly, drop it from the MVP class list
  rather than hand-patching bad data.
- **Flee mechanic**: spec defaults to automatic success; revisit if
  playtesting shows fleeing needs to be a real risk/reward choice.

## Follow-on work (explicitly out of scope here)

- Leveling/XP and spell/ability progression.
- Multiple dungeon levels, persistent runs, save/load.
- Broader class and monster roster.
- Full inventory management (equip, stack, sell).
- **Meta-progression across runs.** This slice's runs are fully isolated
  (no save/load, no persistence per Non-goals), so there's no sense of
  progress between deaths yet. A roguelike's repetitive, randomized core
  loop typically needs a meta layer to feel rewarding over many runs.
  Candidate directions raised for a future spec: unlocking additional
  classes beyond the MVP starting set, and unlocking alternate starting
  loadouts/items that change how a class plays. Both imply *some*
  persistence layer (at minimum browser storage) that doesn't exist yet
  in this slice — sequencing that persistence mechanism is itself a
  design question for that future spec, not assumed here.

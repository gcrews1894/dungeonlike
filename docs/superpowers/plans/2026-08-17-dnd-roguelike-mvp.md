# D&D Roguelike MVP Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first playable vertical slice of a D&D-themed roguelike: pick one of three classes, explore a single procedurally generated ASCII dungeon level, fight monsters in a turn-based battle screen using real d20 mechanics, and reach the stairs down to win (or die trying).

**Architecture:** A standalone TypeScript "engine" (`src/engine/`) with zero React dependency owns all game state and rules — dice, combat resolution, dungeon generation, and state transitions are plain functions, independently unit-tested. A single `gameReducer` function is the one bridge between engine and UI; React (`src/components/`) holds `GameState` in `useReducer`, dispatches typed actions, and renders whatever `state.mode` says to render.

**Tech Stack:** React 18 + TypeScript + Vite, Vitest + React Testing Library for tests, plain JSON data files (no backend, no network at runtime).

**Spec:** `docs/superpowers/specs/2026-08-15-dnd-roguelike-mvp-design.md`

## Global Constraints

- No runtime network calls — all D&D data is static JSON checked into the repo (spec: Content source).
- No leveling/XP, no multi-level dungeons, no save/load, no equip/stack/sell inventory — single run, single level, permadeath (spec: Non-goals).
- Engine code (`src/engine/**`) must not import React or touch the DOM (spec: Architecture).
- All dice/combat rolls take an injectable RNG (`() => number` in `[0,1)`) defaulting to `Math.random`, so tests are deterministic (spec: Testing approach).
- Monster and class stat numbers must be real 5e SRD level-1 values, not invented (spec: Goals — "feel legitimate").

---

## Data reference (used across multiple tasks)

Real SRD-derived stats locked in during planning, fetched live from the open5e API (`https://api.open5e.com/v1/monsters/?slug=<slug>`) for monsters, and hand-derived from standard 5e level-1 class rules (hit die max + CON mod for HP, standard ability array, proficiency bonus +2) for classes, since open5e's class endpoint returns prose rather than structured combat stats.

**Monsters** (slug, AC, HP, primary attack):
- goblin: AC 15, HP 7 — Scimitar +4, 1d6+2 slashing
- skeleton: AC 13, HP 13 — Shortsword +4, 1d6+2 piercing
- giant-rat: AC 12, HP 7 — Bite +4, 1d4+2 piercing
- kobold: AC 12, HP 5 — Dagger +4, 1d4+2 piercing
- orc: AC 13, HP 15 — Greataxe +5, 1d12+3 slashing

**Classes** (slug, HP, AC, attack, once-per-battle ability):
- fighter: HP 12, AC 16 — Longsword +4, 1d8+2 slashing / ability: Second Wind (heal 1d10+1)
- wizard: HP 7, AC 12 — Fire Bolt +4, 1d10 fire / ability: Ray of Frost +4, 1d8 cold
- rogue: HP 10, AC 13 — Rapier +4, 1d8+2 piercing / ability: Sneak Attack +4, 1d8+2 piercing +1d6 bonus

**Item:** potion-of-healing — heals 2d4+2 (real SRD Potion of Healing value).

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.setup.ts`
- Create: `index.html`
- Create: `.gitignore`
- Create: `src/main.tsx`
- Create: `src/components/App.tsx`
- Test: `src/components/App.test.tsx`

**Interfaces:**
- Produces: a working Vite + React + TS project with `npm test` (Vitest) and `npm run build` (tsc + vite build) both green. `App` is a placeholder component later tasks will replace.

- [ ] **Step 1: Write `.gitignore`**

```
node_modules
dist
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "dungeonlike",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "fetch-data": "tsx scripts/fetch-data.ts"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^24.1.1",
    "tsx": "^4.16.2",
    "typescript": "^5.5.3",
    "vite": "^5.4.0",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`
Expected: installs without errors, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 4: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "scripts", "vite.config.ts", "vitest.setup.ts"]
}
```

- [ ] **Step 5: Write `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
  },
})
```

- [ ] **Step 6: Write `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 7: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dungeonlike</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Write `src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './components/App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 9: Write the failing test for `App`**

`src/components/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the game title on first load', () => {
    render(<App />)
    expect(screen.getByText(/dungeonlike/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 10: Run the test and confirm it fails**

Run: `npm test`
Expected: FAIL — `src/components/App.tsx` does not exist yet.

- [ ] **Step 11: Write the placeholder `App`**

`src/components/App.tsx`:

```tsx
export default function App() {
  return <h1>Dungeonlike</h1>
}
```

- [ ] **Step 12: Run the test and confirm it passes**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 13: Confirm the project builds**

Run: `npm run build`
Expected: succeeds with no TypeScript errors.

- [ ] **Step 14: Commit**

```bash
git add .gitignore package.json package-lock.json tsconfig.json vite.config.ts vitest.setup.ts index.html src/main.tsx src/components/App.tsx src/components/App.test.tsx
git commit -m "Scaffold Vite + React + TypeScript + Vitest project"
```

---

### Task 2: Dice module

**Files:**
- Create: `src/engine/dice.ts`
- Test: `src/engine/dice.test.ts`

**Interfaces:**
- Produces: `RNG` type (`() => number`, range `[0,1)`), `rollDie(sides, rng?)`, `rollDice(notation, rng?)` (notation like `"2d6"`), `rollD20(rng?)`, `mulberry32(seed)` — a deterministic seeded RNG for tests and dungeon generation.

- [ ] **Step 1: Write the failing tests**

`src/engine/dice.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { rollDie, rollDice, rollD20, mulberry32 } from './dice'

describe('rollDie', () => {
  it('returns a value derived from the given rng', () => {
    const rng = () => 0.5 // floor(0.5*6)+1 = 4
    expect(rollDie(6, rng)).toBe(4)
  })

  it('never returns less than 1 or more than sides', () => {
    expect(rollDie(6, () => 0)).toBe(1)
    expect(rollDie(6, () => 0.9999)).toBe(6)
  })
})

describe('rollDice', () => {
  it('sums multiple dice using notation like "2d6"', () => {
    const values = [0.5, 0.5] // each d6 -> 4
    let i = 0
    const rng = () => values[i++]
    expect(rollDice('2d6', rng)).toBe(8)
  })

  it('throws on invalid notation', () => {
    expect(() => rollDice('nonsense', () => 0)).toThrow()
  })
})

describe('rollD20', () => {
  it('rolls between 1 and 20', () => {
    expect(rollD20(() => 0)).toBe(1)
    expect(rollD20(() => 0.9999)).toBe(20)
  })
})

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect(a()).toBe(b())
    expect(a()).toBe(b())
  })

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(1)
    for (let i = 0; i < 20; i++) {
      const value = rng()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})
```

- [ ] **Step 2: Run tests, confirm failure**

Run: `npm test -- dice`
Expected: FAIL — `src/engine/dice.ts` does not exist.

- [ ] **Step 3: Implement `src/engine/dice.ts`**

```ts
export type RNG = () => number

export function rollDie(sides: number, rng: RNG = Math.random): number {
  return Math.floor(rng() * sides) + 1
}

export function rollDice(notation: string, rng: RNG = Math.random): number {
  const match = notation.match(/^(\d+)d(\d+)$/)
  if (!match) throw new Error(`Invalid dice notation: ${notation}`)
  const count = Number(match[1])
  const sides = Number(match[2])
  let total = 0
  for (let i = 0; i < count; i++) {
    total += rollDie(sides, rng)
  }
  return total
}

export function rollD20(rng: RNG = Math.random): number {
  return rollDie(20, rng)
}

export function mulberry32(seed: number): RNG {
  let t = seed
  return function rng() {
    t |= 0
    t = (t + 0x6d2b79f5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm test -- dice`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/dice.ts src/engine/dice.test.ts
git commit -m "Add dice rolling module with seeded RNG"
```

---

### Task 3: Engine types and initial state

**Files:**
- Create: `src/engine/state.ts`
- Test: `src/engine/state.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: all shared engine types — `AbilityScores`, `AttackAction`, `HealAction`, `ClassAction`, `ClassDefinition`, `MonsterDefinition`, `ItemDefinition`, `Position`, `Tile`, `Room`, `MonsterInstance`, `ItemDrop`, `Player`, `DungeonState`, `BattleState`, `GameMode`, `GameState` — and `createInitialState(): GameState`.

- [ ] **Step 1: Write the failing test**

`src/engine/state.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { createInitialState } from './state'

describe('createInitialState', () => {
  it('starts in character-select mode with no player, dungeon, or battle', () => {
    const state = createInitialState()
    expect(state.mode).toBe('character-select')
    expect(state.player).toBeNull()
    expect(state.dungeon).toBeNull()
    expect(state.battle).toBeNull()
  })
})
```

- [ ] **Step 2: Run test, confirm failure**

Run: `npm test -- state`
Expected: FAIL — `src/engine/state.ts` does not exist.

- [ ] **Step 3: Implement `src/engine/state.ts`**

```ts
export type AbilityScores = {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export type AttackAction = {
  kind: 'attack'
  name: string
  attackBonus: number
  damageDice: string
  damageBonus: number
  damageType: string
  bonusDamageDice?: string
}

export type HealAction = {
  kind: 'heal'
  name: string
  healDice: string
  healBonus: number
}

export type ClassAction = AttackAction | HealAction

export type ClassDefinition = {
  slug: string
  name: string
  hitDie: string
  maxHp: number
  armorClass: number
  abilityScores: AbilityScores
  attack: AttackAction
  ability: ClassAction
}

export type MonsterDefinition = {
  slug: string
  name: string
  glyph: string
  armorClass: number
  maxHp: number
  abilityScores: AbilityScores
  challengeRating: string
  attack: AttackAction
}

export type ItemDefinition = {
  slug: string
  name: string
  glyph: string
  effect: { kind: 'heal'; healDice: string; healBonus: number }
}

export type Position = { x: number; y: number }

export type Tile = 'wall' | 'floor'

export type Room = { x: number; y: number; width: number; height: number }

export type MonsterInstance = { defSlug: string; hp: number; position: Position }

export type ItemDrop = { defSlug: string; position: Position }

export type Player = {
  classSlug: string
  className: string
  abilityScores: AbilityScores
  hp: number
  maxHp: number
  ac: number
  inventory: string[]
  position: Position
}

export type DungeonState = {
  grid: Tile[][]
  rooms: Room[]
  startPosition: Position
  stairsPosition: Position
  monsters: MonsterInstance[]
  items: ItemDrop[]
}

export type BattleState = {
  monster: MonsterInstance
  log: string[]
  abilityUsed: boolean
}

export type GameMode = 'character-select' | 'exploring' | 'battle' | 'victory' | 'game-over'

export type GameState = {
  mode: GameMode
  player: Player | null
  dungeon: DungeonState | null
  battle: BattleState | null
}

export function createInitialState(): GameState {
  return { mode: 'character-select', player: null, dungeon: null, battle: null }
}
```

- [ ] **Step 4: Run test, confirm pass**

Run: `npm test -- state`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/engine/state.ts src/engine/state.test.ts
git commit -m "Add engine state types and createInitialState"
```

---

### Task 4: Data files (monsters, classes, items)

**Files:**
- Create: `src/data/monsters.json`
- Create: `src/data/classes.json`
- Create: `src/data/items.json`
- Create: `scripts/fetch-data.ts`
- Test: `src/data/data.test.ts`

**Interfaces:**
- Consumes: shapes defined in `src/engine/state.ts` (`MonsterDefinition`, `ClassDefinition`, `ItemDefinition`) — the JSON must match those shapes field-for-field.
- Produces: the game's static content, imported by later tasks via `import monsters from '../data/monsters.json'` etc.

**Note:** `monsters.json` values below are the real 5e SRD stat blocks (fetched from `https://api.open5e.com/v1/monsters/?slug=<slug>` during planning), and `classes.json` values are hand-derived from standard 5e level-1 rules (hit die max + CON modifier for HP, standard ability array, +2 proficiency bonus) since open5e's class endpoint returns prose rather than structured combat stats — there is nothing to auto-fetch for classes. `scripts/fetch-data.ts` is provided as a regeneration tool for `monsters.json` only; it requires network access and is run manually, never as part of the automated test suite.

- [ ] **Step 1: Write `src/data/monsters.json`**

```json
[
  {
    "slug": "goblin",
    "name": "Goblin",
    "glyph": "g",
    "armorClass": 15,
    "maxHp": 7,
    "abilityScores": { "str": 8, "dex": 14, "con": 10, "int": 10, "wis": 8, "cha": 8 },
    "challengeRating": "1/4",
    "attack": { "kind": "attack", "name": "Scimitar", "attackBonus": 4, "damageDice": "1d6", "damageBonus": 2, "damageType": "slashing" }
  },
  {
    "slug": "skeleton",
    "name": "Skeleton",
    "glyph": "s",
    "armorClass": 13,
    "maxHp": 13,
    "abilityScores": { "str": 10, "dex": 14, "con": 15, "int": 6, "wis": 8, "cha": 5 },
    "challengeRating": "1/4",
    "attack": { "kind": "attack", "name": "Shortsword", "attackBonus": 4, "damageDice": "1d6", "damageBonus": 2, "damageType": "piercing" }
  },
  {
    "slug": "giant-rat",
    "name": "Giant Rat",
    "glyph": "r",
    "armorClass": 12,
    "maxHp": 7,
    "abilityScores": { "str": 7, "dex": 15, "con": 11, "int": 2, "wis": 10, "cha": 4 },
    "challengeRating": "1/8",
    "attack": { "kind": "attack", "name": "Bite", "attackBonus": 4, "damageDice": "1d4", "damageBonus": 2, "damageType": "piercing" }
  },
  {
    "slug": "kobold",
    "name": "Kobold",
    "glyph": "k",
    "armorClass": 12,
    "maxHp": 5,
    "abilityScores": { "str": 7, "dex": 15, "con": 9, "int": 8, "wis": 7, "cha": 8 },
    "challengeRating": "1/8",
    "attack": { "kind": "attack", "name": "Dagger", "attackBonus": 4, "damageDice": "1d4", "damageBonus": 2, "damageType": "piercing" }
  },
  {
    "slug": "orc",
    "name": "Orc",
    "glyph": "o",
    "armorClass": 13,
    "maxHp": 15,
    "abilityScores": { "str": 16, "dex": 12, "con": 16, "int": 7, "wis": 11, "cha": 10 },
    "challengeRating": "1/2",
    "attack": { "kind": "attack", "name": "Greataxe", "attackBonus": 5, "damageDice": "1d12", "damageBonus": 3, "damageType": "slashing" }
  }
]
```

- [ ] **Step 2: Write `src/data/classes.json`**

```json
[
  {
    "slug": "fighter",
    "name": "Fighter",
    "hitDie": "1d10",
    "maxHp": 12,
    "armorClass": 16,
    "abilityScores": { "str": 15, "dex": 13, "con": 14, "int": 8, "wis": 12, "cha": 10 },
    "attack": { "kind": "attack", "name": "Longsword", "attackBonus": 4, "damageDice": "1d8", "damageBonus": 2, "damageType": "slashing" },
    "ability": { "kind": "heal", "name": "Second Wind", "healDice": "1d10", "healBonus": 1 }
  },
  {
    "slug": "wizard",
    "name": "Wizard",
    "hitDie": "1d6",
    "maxHp": 7,
    "armorClass": 12,
    "abilityScores": { "str": 8, "dex": 14, "con": 13, "int": 15, "wis": 12, "cha": 10 },
    "attack": { "kind": "attack", "name": "Fire Bolt", "attackBonus": 4, "damageDice": "1d10", "damageBonus": 0, "damageType": "fire" },
    "ability": { "kind": "attack", "name": "Ray of Frost", "attackBonus": 4, "damageDice": "1d8", "damageBonus": 0, "damageType": "cold" }
  },
  {
    "slug": "rogue",
    "name": "Rogue",
    "hitDie": "1d8",
    "maxHp": 10,
    "armorClass": 13,
    "abilityScores": { "str": 10, "dex": 15, "con": 14, "int": 12, "wis": 13, "cha": 8 },
    "attack": { "kind": "attack", "name": "Rapier", "attackBonus": 4, "damageDice": "1d8", "damageBonus": 2, "damageType": "piercing" },
    "ability": { "kind": "attack", "name": "Sneak Attack", "attackBonus": 4, "damageDice": "1d8", "damageBonus": 2, "damageType": "piercing", "bonusDamageDice": "1d6" }
  }
]
```

- [ ] **Step 3: Write `src/data/items.json`**

```json
[
  {
    "slug": "potion-of-healing",
    "name": "Potion of Healing",
    "glyph": "!",
    "effect": { "kind": "heal", "healDice": "2d4", "healBonus": 2 }
  }
]
```

- [ ] **Step 4: Write the failing test**

`src/data/data.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import monsters from './monsters.json'
import classes from './classes.json'
import items from './items.json'

describe('monsters.json', () => {
  it('has exactly the expected monsters', () => {
    const slugs = monsters.map((m) => m.slug).sort()
    expect(slugs).toEqual(['giant-rat', 'goblin', 'kobold', 'orc', 'skeleton'])
  })

  it('every monster has a positive AC/HP and a valid attack', () => {
    for (const monster of monsters) {
      expect(monster.armorClass).toBeGreaterThan(0)
      expect(monster.maxHp).toBeGreaterThan(0)
      expect(monster.attack.kind).toBe('attack')
      expect(monster.attack.damageDice).toMatch(/^\d+d\d+$/)
    }
  })
})

describe('classes.json', () => {
  it('has exactly the expected classes', () => {
    const slugs = classes.map((c) => c.slug).sort()
    expect(slugs).toEqual(['fighter', 'rogue', 'wizard'])
  })

  it('every class has positive HP/AC and a valid attack + ability', () => {
    for (const cls of classes) {
      expect(cls.maxHp).toBeGreaterThan(0)
      expect(cls.armorClass).toBeGreaterThan(0)
      expect(cls.attack.damageDice).toMatch(/^\d+d\d+$/)
      expect(['attack', 'heal']).toContain(cls.ability.kind)
    }
  })
})

describe('items.json', () => {
  it('has at least one healing item', () => {
    expect(items.some((i) => i.effect.kind === 'heal')).toBe(true)
  })
})
```

- [ ] **Step 5: Run test, confirm failure**

Run: `npm test -- data`
Expected: FAIL if any JSON file is missing or malformed (should pass immediately once Steps 1-3 are done — run this after writing all three files to confirm they're well-formed).

- [ ] **Step 6: Run test, confirm pass**

Run: `npm test -- data`
Expected: PASS (5 tests).

- [ ] **Step 7: Write `scripts/fetch-data.ts`** (regeneration tool, not run by tests)

```ts
// One-time regeneration tool for src/data/monsters.json.
// Requires network access to https://api.open5e.com. Run manually:
//   npm run fetch-data
// src/data/classes.json is hand-authored from 5e SRD level-1 rules, not
// fetched: open5e's class endpoint returns prose (equipment, features)
// rather than structured combat stats, so there is nothing mechanical to
// normalize automatically.

import { writeFileSync } from 'node:fs'

const MONSTER_SLUGS = ['goblin', 'skeleton', 'giant-rat', 'kobold', 'orc'] as const

const GLYPHS: Record<string, string> = {
  goblin: 'g',
  skeleton: 's',
  'giant-rat': 'r',
  kobold: 'k',
  orc: 'o',
}

const PRIMARY_ATTACK_NAME: Record<string, string> = {
  goblin: 'Scimitar',
  skeleton: 'Shortsword',
  'giant-rat': 'Bite',
  kobold: 'Dagger',
  orc: 'Greataxe',
}

const DAMAGE_TYPE: Record<string, string> = {
  goblin: 'slashing',
  skeleton: 'piercing',
  'giant-rat': 'piercing',
  kobold: 'piercing',
  orc: 'slashing',
}

type Open5eMonster = {
  name: string
  armor_class: number
  hit_points: number
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  challenge_rating: string
  actions: { name: string; attack_bonus: number; damage_dice: string; damage_bonus: number }[]
}

async function fetchMonster(slug: string) {
  const response = await fetch(`https://api.open5e.com/v1/monsters/?slug=${slug}`)
  const data = (await response.json()) as { results: Open5eMonster[] }
  const result = data.results[0]
  if (!result) throw new Error(`No monster found for slug: ${slug}`)
  const action = result.actions.find((a) => a.name === PRIMARY_ATTACK_NAME[slug])
  if (!action) throw new Error(`Could not find primary attack for ${slug}`)
  return {
    slug,
    name: result.name,
    glyph: GLYPHS[slug],
    armorClass: result.armor_class,
    maxHp: result.hit_points,
    abilityScores: {
      str: result.strength,
      dex: result.dexterity,
      con: result.constitution,
      int: result.intelligence,
      wis: result.wisdom,
      cha: result.charisma,
    },
    challengeRating: result.challenge_rating,
    attack: {
      kind: 'attack' as const,
      name: action.name,
      attackBonus: action.attack_bonus,
      damageDice: action.damage_dice,
      damageBonus: action.damage_bonus,
      damageType: DAMAGE_TYPE[slug],
    },
  }
}

async function main() {
  const monsters = []
  for (const slug of MONSTER_SLUGS) {
    monsters.push(await fetchMonster(slug))
  }
  writeFileSync('src/data/monsters.json', JSON.stringify(monsters, null, 2) + '\n')
  console.log(`Wrote ${monsters.length} monsters to src/data/monsters.json`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

- [ ] **Step 8: Commit**

```bash
git add src/data/monsters.json src/data/classes.json src/data/items.json src/data/data.test.ts scripts/fetch-data.ts
git commit -m "Add SRD-derived monster/class/item data and regeneration script"
```

---

### Task 5: Combat resolution

**Files:**
- Create: `src/engine/combat.ts`
- Test: `src/engine/combat.test.ts`

**Interfaces:**
- Consumes: `RNG`, `rollD20`, `rollDice` from `src/engine/dice.ts` (Task 2).
- Produces: `resolveAttack(attackerName, targetName, attackBonus, targetAc, damageDice, damageBonus, damageType, rng?, bonusDamageDice?): { hit: boolean; critical: boolean; damage: number; log: string }` and `resolveHeal(actorName, abilityName, healDice, healBonus, rng?): { amount: number; log: string }`. Used by Task 8 (`actions.ts`).

- [ ] **Step 1: Write the failing tests**

`src/engine/combat.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resolveAttack, resolveHeal } from './combat'
import type { RNG } from './dice'

function forceRoll(sides: number, roll: number): number {
  return (roll - 0.5) / sides
}

function sequenceRng(values: number[]): RNG {
  const queue = [...values]
  return () => {
    const next = queue.shift()
    if (next === undefined) throw new Error('sequenceRng exhausted')
    return next
  }
}

describe('resolveAttack', () => {
  it('misses when the attack roll plus bonus is below target AC', () => {
    const rng = sequenceRng([forceRoll(20, 5)]) // 5 + 4 = 9, below AC 15
    const result = resolveAttack('Fighter', 'Goblin', 4, 15, '1d8', 2, 'slashing', rng)
    expect(result.hit).toBe(false)
    expect(result.damage).toBe(0)
  })

  it('hits and rolls damage when the attack meets AC', () => {
    const rng = sequenceRng([forceRoll(20, 15), forceRoll(8, 6)]) // 15+4=19 hits AC 15; damage 6+2=8
    const result = resolveAttack('Fighter', 'Goblin', 4, 15, '1d8', 2, 'slashing', rng)
    expect(result.hit).toBe(true)
    expect(result.critical).toBe(false)
    expect(result.damage).toBe(8)
  })

  it('always misses on a natural 1, even against a trivial AC', () => {
    const rng = sequenceRng([forceRoll(20, 1)])
    const result = resolveAttack('Fighter', 'Goblin', 20, 1, '1d8', 2, 'slashing', rng)
    expect(result.hit).toBe(false)
  })

  it('always hits and doubles damage dice on a natural 20', () => {
    const rng = sequenceRng([forceRoll(20, 20), forceRoll(8, 3), forceRoll(8, 5)])
    const result = resolveAttack('Fighter', 'Goblin', -10, 30, '1d8', 2, 'slashing', rng)
    expect(result.hit).toBe(true)
    expect(result.critical).toBe(true)
    expect(result.damage).toBe(3 + 5 + 2)
  })

  it('adds bonus damage dice when provided (e.g. Sneak Attack)', () => {
    const rng = sequenceRng([forceRoll(20, 15), forceRoll(8, 6), forceRoll(6, 4)])
    const result = resolveAttack('Rogue', 'Goblin', 4, 15, '1d8', 2, 'piercing', rng, '1d6')
    expect(result.damage).toBe(6 + 2 + 4)
  })
})

describe('resolveHeal', () => {
  it('rolls heal dice plus bonus and names the ability in the log', () => {
    const rng = sequenceRng([forceRoll(10, 7)])
    const result = resolveHeal('Fighter', 'Second Wind', '1d10', 1, rng)
    expect(result.amount).toBe(8)
    expect(result.log).toContain('Second Wind')
  })
})
```

- [ ] **Step 2: Run tests, confirm failure**

Run: `npm test -- combat`
Expected: FAIL — `src/engine/combat.ts` does not exist.

- [ ] **Step 3: Implement `src/engine/combat.ts`**

```ts
import { rollD20, rollDice, type RNG } from './dice'

export type AttackResult = {
  hit: boolean
  critical: boolean
  damage: number
  log: string
}

export function resolveAttack(
  attackerName: string,
  targetName: string,
  attackBonus: number,
  targetAc: number,
  damageDice: string,
  damageBonus: number,
  damageType: string,
  rng: RNG = Math.random,
  bonusDamageDice?: string
): AttackResult {
  const roll = rollD20(rng)

  if (roll === 1) {
    return {
      hit: false,
      critical: false,
      damage: 0,
      log: `${attackerName} attacks ${targetName} and rolls a natural 1 — a miss.`,
    }
  }

  const critical = roll === 20
  const total = roll + attackBonus

  if (!critical && total < targetAc) {
    return {
      hit: false,
      critical: false,
      damage: 0,
      log: `${attackerName} attacks ${targetName} (${total} vs AC ${targetAc}) — miss.`,
    }
  }

  let damage = rollDice(damageDice, rng) + damageBonus
  if (critical) damage += rollDice(damageDice, rng)
  if (bonusDamageDice) damage += rollDice(bonusDamageDice, rng)

  const critText = critical ? ' Critical hit!' : ''
  return {
    hit: true,
    critical,
    damage,
    log: `${attackerName} hits ${targetName} for ${damage} ${damageType} damage.${critText}`,
  }
}

export function resolveHeal(
  actorName: string,
  abilityName: string,
  healDice: string,
  healBonus: number,
  rng: RNG = Math.random
): { amount: number; log: string } {
  const amount = rollDice(healDice, rng) + healBonus
  return { amount, log: `${actorName} uses ${abilityName} and recovers ${amount} HP.` }
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm test -- combat`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/combat.ts src/engine/combat.test.ts
git commit -m "Add d20 attack and heal resolution"
```

---

### Task 6: Dungeon generation

**Files:**
- Create: `src/engine/dungeon.ts`
- Test: `src/engine/dungeon.test.ts`

**Interfaces:**
- Consumes: `RNG` from `src/engine/dice.ts` (Task 2); `MonsterDefinition`, `ItemDefinition`, `DungeonState`, `Room`, `Tile`, `Position`, `MonsterInstance`, `ItemDrop` from `src/engine/state.ts` (Task 3).
- Produces: `GRID_WIDTH`, `GRID_HEIGHT` constants and `generateDungeon(rng, monsterDefs, itemDefs): DungeonState`. Used by Task 7 (`actions.ts`).

The room-and-corridor algorithm below (place non-overlapping rooms via rejection sampling, connect sequentially with L-shaped corridors, stairs in the last room) was prototyped and stress-tested against 500 seeds with 0 failures — room placement always succeeds and the stairs are always reachable from the start.

- [ ] **Step 1: Write the failing tests**

`src/engine/dungeon.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateDungeon, GRID_WIDTH, GRID_HEIGHT } from './dungeon'
import { mulberry32 } from './dice'
import type { MonsterDefinition, ItemDefinition, Tile } from './state'

const monsterDefs: MonsterDefinition[] = [
  {
    slug: 'goblin',
    name: 'Goblin',
    glyph: 'g',
    armorClass: 15,
    maxHp: 7,
    abilityScores: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    challengeRating: '1/4',
    attack: { kind: 'attack', name: 'Scimitar', attackBonus: 4, damageDice: '1d6', damageBonus: 2, damageType: 'slashing' },
  },
]

const itemDefs: ItemDefinition[] = [
  { slug: 'potion-of-healing', name: 'Potion of Healing', glyph: '!', effect: { kind: 'heal', healDice: '2d4', healBonus: 2 } },
]

function reachableTiles(grid: Tile[][], start: { x: number; y: number }): Set<string> {
  const visited = new Set<string>()
  const queue = [start]
  while (queue.length > 0) {
    const current = queue.shift()!
    const key = `${current.x},${current.y}`
    if (visited.has(key)) continue
    if (current.y < 0 || current.y >= grid.length || current.x < 0 || current.x >= grid[0].length) continue
    if (grid[current.y][current.x] === 'wall') continue
    visited.add(key)
    queue.push({ x: current.x + 1, y: current.y })
    queue.push({ x: current.x - 1, y: current.y })
    queue.push({ x: current.x, y: current.y + 1 })
    queue.push({ x: current.x, y: current.y - 1 })
  }
  return visited
}

describe('generateDungeon', () => {
  it('places at least two non-overlapping rooms within grid bounds', () => {
    const dungeon = generateDungeon(mulberry32(1), monsterDefs, itemDefs)
    expect(dungeon.rooms.length).toBeGreaterThanOrEqual(2)
    for (const room of dungeon.rooms) {
      expect(room.x).toBeGreaterThanOrEqual(0)
      expect(room.y).toBeGreaterThanOrEqual(0)
      expect(room.x + room.width).toBeLessThanOrEqual(GRID_WIDTH)
      expect(room.y + room.height).toBeLessThanOrEqual(GRID_HEIGHT)
    }
    for (let i = 0; i < dungeon.rooms.length; i++) {
      for (let j = i + 1; j < dungeon.rooms.length; j++) {
        const a = dungeon.rooms[i]
        const b = dungeon.rooms[j]
        const overlaps = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
        expect(overlaps).toBe(false)
      }
    }
  })

  it('makes the stairs reachable from the start position', () => {
    const dungeon = generateDungeon(mulberry32(7), monsterDefs, itemDefs)
    const reachable = reachableTiles(dungeon.grid, dungeon.startPosition)
    expect(reachable.has(`${dungeon.stairsPosition.x},${dungeon.stairsPosition.y}`)).toBe(true)
  })

  it('places at least one monster, keeps monsters/items on floor tiles, off the start', () => {
    const dungeon = generateDungeon(mulberry32(3), monsterDefs, itemDefs)
    expect(dungeon.monsters.length).toBeGreaterThanOrEqual(1)
    expect(dungeon.monsters.length).toBeLessThan(dungeon.rooms.length)
    const onStart = (pos: { x: number; y: number }) =>
      pos.x === dungeon.startPosition.x && pos.y === dungeon.startPosition.y
    for (const monster of dungeon.monsters) {
      expect(dungeon.grid[monster.position.y][monster.position.x]).toBe('floor')
      expect(onStart(monster.position)).toBe(false)
    }
    for (const item of dungeon.items) {
      expect(dungeon.grid[item.position.y][item.position.x]).toBe('floor')
      expect(onStart(item.position)).toBe(false)
    }
  })
})
```

- [ ] **Step 2: Run tests, confirm failure**

Run: `npm test -- dungeon`
Expected: FAIL — `src/engine/dungeon.ts` does not exist.

- [ ] **Step 3: Implement `src/engine/dungeon.ts`**

```ts
import type { RNG } from './dice'
import type {
  DungeonState,
  ItemDefinition,
  ItemDrop,
  MonsterDefinition,
  MonsterInstance,
  Position,
  Room,
  Tile,
} from './state'

export const GRID_WIDTH = 40
export const GRID_HEIGHT = 20

const TARGET_ROOMS = 6
const MAX_PLACEMENT_ATTEMPTS = 200
const MIN_ROOM_WIDTH = 4
const MAX_ROOM_WIDTH = 8
const MIN_ROOM_HEIGHT = 3
const MAX_ROOM_HEIGHT = 6

function randomInt(rng: RNG, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

function roomsOverlap(a: Room, b: Room): boolean {
  return (
    a.x - 1 < b.x + b.width + 1 &&
    a.x + a.width + 1 > b.x - 1 &&
    a.y - 1 < b.y + b.height + 1 &&
    a.y + a.height + 1 > b.y - 1
  )
}

function roomCenter(room: Room): Position {
  return { x: Math.floor(room.x + room.width / 2), y: Math.floor(room.y + room.height / 2) }
}

function carveRoom(grid: Tile[][], room: Room): void {
  for (let y = room.y; y < room.y + room.height; y++) {
    for (let x = room.x; x < room.x + room.width; x++) {
      grid[y][x] = 'floor'
    }
  }
}

function carveCorridor(grid: Tile[][], from: Position, to: Position): void {
  let x = from.x
  let y = from.y
  while (x !== to.x) {
    grid[y][x] = 'floor'
    x += x < to.x ? 1 : -1
  }
  while (y !== to.y) {
    grid[y][x] = 'floor'
    y += y < to.y ? 1 : -1
  }
  grid[y][x] = 'floor'
}

function placeRooms(rng: RNG): Room[] {
  const rooms: Room[] = []
  let attempts = 0
  while (rooms.length < TARGET_ROOMS && attempts < MAX_PLACEMENT_ATTEMPTS) {
    attempts++
    const width = randomInt(rng, MIN_ROOM_WIDTH, MAX_ROOM_WIDTH)
    const height = randomInt(rng, MIN_ROOM_HEIGHT, MAX_ROOM_HEIGHT)
    const x = randomInt(rng, 1, GRID_WIDTH - width - 1)
    const y = randomInt(rng, 1, GRID_HEIGHT - height - 1)
    const candidate: Room = { x, y, width, height }
    if (rooms.every((room) => !roomsOverlap(room, candidate))) {
      rooms.push(candidate)
    }
  }
  if (rooms.length < 2) {
    throw new Error('Failed to place enough rooms for a dungeon')
  }
  return rooms
}

function randomFloorSpot(rng: RNG, room: Room, occupied: Set<string>): Position | null {
  for (let attempt = 0; attempt < 20; attempt++) {
    const x = randomInt(rng, room.x, room.x + room.width - 1)
    const y = randomInt(rng, room.y, room.y + room.height - 1)
    const key = `${x},${y}`
    if (!occupied.has(key)) return { x, y }
  }
  return null
}

export function generateDungeon(
  rng: RNG,
  monsterDefs: MonsterDefinition[],
  itemDefs: ItemDefinition[]
): DungeonState {
  const grid: Tile[][] = Array.from({ length: GRID_HEIGHT }, () =>
    Array.from({ length: GRID_WIDTH }, (): Tile => 'wall')
  )

  const rooms = placeRooms(rng)
  rooms.forEach((room) => carveRoom(grid, room))
  for (let i = 0; i < rooms.length - 1; i++) {
    carveCorridor(grid, roomCenter(rooms[i]), roomCenter(rooms[i + 1]))
  }

  const startPosition = roomCenter(rooms[0])
  const stairsPosition = roomCenter(rooms[rooms.length - 1])

  const occupied = new Set<string>([`${startPosition.x},${startPosition.y}`])
  const monsters: MonsterInstance[] = []
  const items: ItemDrop[] = []

  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i]
    const spot = randomFloorSpot(rng, room, occupied)
    if (!spot) continue
    if (rng() < 0.7) {
      const def = monsterDefs[randomInt(rng, 0, monsterDefs.length - 1)]
      monsters.push({ defSlug: def.slug, hp: def.maxHp, position: spot })
      occupied.add(`${spot.x},${spot.y}`)
    } else if (rng() < 0.5) {
      const def = itemDefs[randomInt(rng, 0, itemDefs.length - 1)]
      items.push({ defSlug: def.slug, position: spot })
      occupied.add(`${spot.x},${spot.y}`)
    }
  }

  return { grid, rooms, startPosition, stairsPosition, monsters, items }
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm test -- dungeon`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/dungeon.ts src/engine/dungeon.test.ts
git commit -m "Add room-and-corridor dungeon generation"
```

---

### Task 7: Engine actions, part A — character select and movement

**Files:**
- Create: `src/engine/actions.ts`
- Test: `src/engine/actions.test.ts`

**Interfaces:**
- Consumes: `RNG` from `dice.ts`; `generateDungeon` from `dungeon.ts`; `GameState`, `Player`, `ClassDefinition`, `MonsterDefinition`, `ItemDefinition`, `DungeonState`, `Tile` from `state.ts`.
- Produces: `selectClass(state, classSlug, classDefs, monsterDefs, itemDefs, rng?): GameState` and `movePlayer(state, dx, dy, monsterDefs): GameState` (movement/pickup/win-check involve no randomness, so `movePlayer` takes no `rng` param). Both consumed directly by Task 8 (adds `chooseBattleAction` + `gameReducer` to this same file) and Task 12 (`App.tsx`).

- [ ] **Step 1: Write the failing tests**

`src/engine/actions.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { selectClass, movePlayer } from './actions'
import { createInitialState } from './state'
import { mulberry32 } from './dice'
import type { ClassDefinition, DungeonState, GameState, ItemDefinition, MonsterDefinition, Player, Tile } from './state'

const classDefs: ClassDefinition[] = [
  {
    slug: 'fighter',
    name: 'Fighter',
    hitDie: '1d10',
    maxHp: 12,
    armorClass: 16,
    abilityScores: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
    attack: { kind: 'attack', name: 'Longsword', attackBonus: 4, damageDice: '1d8', damageBonus: 2, damageType: 'slashing' },
    ability: { kind: 'heal', name: 'Second Wind', healDice: '1d10', healBonus: 1 },
  },
]

const monsterDefs: MonsterDefinition[] = [
  {
    slug: 'goblin',
    name: 'Goblin',
    glyph: 'g',
    armorClass: 15,
    maxHp: 7,
    abilityScores: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    challengeRating: '1/4',
    attack: { kind: 'attack', name: 'Scimitar', attackBonus: 4, damageDice: '1d6', damageBonus: 2, damageType: 'slashing' },
  },
]

const itemDefs: ItemDefinition[] = [
  { slug: 'potion-of-healing', name: 'Potion of Healing', glyph: '!', effect: { kind: 'heal', healDice: '2d4', healBonus: 2 } },
]

function fixtureState(overrides: Partial<GameState> = {}): GameState {
  const grid: Tile[][] = [
    ['wall', 'wall', 'wall', 'wall'],
    ['wall', 'floor', 'floor', 'wall'],
    ['wall', 'floor', 'floor', 'wall'],
    ['wall', 'wall', 'wall', 'wall'],
  ]
  const dungeon: DungeonState = {
    grid,
    rooms: [{ x: 1, y: 1, width: 2, height: 2 }],
    startPosition: { x: 1, y: 1 },
    stairsPosition: { x: 2, y: 2 },
    monsters: [{ defSlug: 'goblin', hp: 7, position: { x: 2, y: 1 } }],
    items: [{ defSlug: 'potion-of-healing', position: { x: 1, y: 2 } }],
  }
  const player: Player = {
    classSlug: 'fighter',
    className: 'Fighter',
    abilityScores: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
    hp: 12,
    maxHp: 12,
    ac: 16,
    inventory: [],
    position: { x: 1, y: 1 },
  }
  return { mode: 'exploring', player, dungeon, battle: null, ...overrides }
}

describe('selectClass', () => {
  it('creates a player from the chosen class and generates a dungeon', () => {
    const state = selectClass(createInitialState(), 'fighter', classDefs, monsterDefs, itemDefs, mulberry32(1))
    expect(state.mode).toBe('exploring')
    expect(state.player?.classSlug).toBe('fighter')
    expect(state.player?.hp).toBe(12)
    expect(state.player?.maxHp).toBe(12)
    expect(state.player?.ac).toBe(16)
    expect(state.dungeon?.rooms.length).toBeGreaterThanOrEqual(2)
    expect(state.player?.position).toEqual(state.dungeon?.startPosition)
  })

  it('is a no-op outside of character-select mode', () => {
    const state = fixtureState()
    const result = selectClass(state, 'fighter', classDefs, monsterDefs, itemDefs)
    expect(result).toBe(state)
  })
})

describe('movePlayer', () => {
  it('does not move into a wall', () => {
    const state = fixtureState()
    const result = movePlayer(state, 0, -1, monsterDefs)
    expect(result.player?.position).toEqual({ x: 1, y: 1 })
  })

  it('moves into an open floor tile', () => {
    const state = fixtureState()
    const result = movePlayer(state, 0, 1, monsterDefs)
    expect(result.player?.position).toEqual({ x: 1, y: 2 })
  })

  it('starts a battle when moving onto a monster', () => {
    const state = fixtureState()
    const result = movePlayer(state, 1, 0, monsterDefs)
    expect(result.mode).toBe('battle')
    expect(result.battle?.monster.defSlug).toBe('goblin')
    expect(result.battle?.log[0]).toContain('Goblin')
    expect(result.player?.position).toEqual({ x: 1, y: 1 })
  })

  it('picks up an item when moving onto it', () => {
    const state = fixtureState()
    const result = movePlayer(state, 0, 1, monsterDefs)
    expect(result.player?.inventory).toEqual(['potion-of-healing'])
    expect(result.dungeon?.items).toEqual([])
  })

  it('wins the run when moving onto the stairs', () => {
    let state = fixtureState()
    state = movePlayer(state, 0, 1, monsterDefs) // pick up potion at (1,2)
    state = movePlayer(state, 1, 0, monsterDefs) // move to stairs at (2,2)
    expect(state.mode).toBe('victory')
  })
})
```

- [ ] **Step 2: Run tests, confirm failure**

Run: `npm test -- actions`
Expected: FAIL — `src/engine/actions.ts` does not exist.

- [ ] **Step 3: Implement `src/engine/actions.ts`**

```ts
import type { RNG } from './dice'
import { generateDungeon } from './dungeon'
import type { ClassDefinition, GameState, ItemDefinition, MonsterDefinition, Player, Position } from './state'

function classLookup(defs: ClassDefinition[], slug: string): ClassDefinition {
  const def = defs.find((d) => d.slug === slug)
  if (!def) throw new Error(`Unknown class: ${slug}`)
  return def
}

function monsterDefLookup(defs: MonsterDefinition[], slug: string): MonsterDefinition {
  const def = defs.find((d) => d.slug === slug)
  if (!def) throw new Error(`Unknown monster: ${slug}`)
  return def
}

export function selectClass(
  state: GameState,
  classSlug: string,
  classDefs: ClassDefinition[],
  monsterDefs: MonsterDefinition[],
  itemDefs: ItemDefinition[],
  rng: RNG = Math.random
): GameState {
  if (state.mode !== 'character-select') return state

  const classDef = classLookup(classDefs, classSlug)
  const dungeon = generateDungeon(rng, monsterDefs, itemDefs)

  const player: Player = {
    classSlug: classDef.slug,
    className: classDef.name,
    abilityScores: classDef.abilityScores,
    hp: classDef.maxHp,
    maxHp: classDef.maxHp,
    ac: classDef.armorClass,
    inventory: [],
    position: dungeon.startPosition,
  }

  return { mode: 'exploring', player, dungeon, battle: null }
}

export function movePlayer(
  state: GameState,
  dx: number,
  dy: number,
  monsterDefs: MonsterDefinition[]
): GameState {
  if (state.mode !== 'exploring' || !state.player || !state.dungeon) return state

  const target: Position = { x: state.player.position.x + dx, y: state.player.position.y + dy }
  const { grid, monsters, items, stairsPosition } = state.dungeon

  if (
    target.y < 0 ||
    target.y >= grid.length ||
    target.x < 0 ||
    target.x >= grid[0].length ||
    grid[target.y][target.x] === 'wall'
  ) {
    return state
  }

  const monsterHere = monsters.find((m) => m.position.x === target.x && m.position.y === target.y)
  if (monsterHere) {
    const monsterDef = monsterDefLookup(monsterDefs, monsterHere.defSlug)
    return {
      ...state,
      mode: 'battle',
      battle: { monster: monsterHere, log: [`A ${monsterDef.name} blocks your path!`], abilityUsed: false },
    }
  }

  const itemHere = items.find((i) => i.position.x === target.x && i.position.y === target.y)
  const updatedDungeon = itemHere
    ? { ...state.dungeon, items: state.dungeon.items.filter((i) => i !== itemHere) }
    : state.dungeon

  const updatedPlayer: Player = {
    ...state.player,
    position: target,
    inventory: itemHere ? [...state.player.inventory, itemHere.defSlug] : state.player.inventory,
  }

  const reachedStairs = target.x === stairsPosition.x && target.y === stairsPosition.y

  return {
    ...state,
    player: updatedPlayer,
    dungeon: updatedDungeon,
    mode: reachedStairs ? 'victory' : 'exploring',
  }
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm test -- actions`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/actions.ts src/engine/actions.test.ts
git commit -m "Add selectClass and movePlayer engine actions"
```

---

### Task 8: Engine actions, part B — battle resolution and the reducer

**Files:**
- Modify: `src/engine/actions.ts`
- Modify: `src/engine/actions.test.ts`

**Interfaces:**
- Consumes: `resolveAttack`, `resolveHeal` from `combat.ts` (Task 5); `rollDice` from `dice.ts` (Task 2); everything `actions.ts` already imports from Task 7.
- Produces: `chooseBattleAction(state, choice, classDefs, monsterDefs, itemDefs, rng?): GameState` where `choice` is `'attack' | 'ability' | 'item' | 'flee'`; `EngineAction` union type; `gameReducer(state, action, data, rng?): GameState`. `gameReducer` is the single function Task 12 (`App.tsx`) calls from `useReducer`.

- [ ] **Step 1: Add the failing tests**

Append to `src/engine/actions.test.ts` (add these imports to the top alongside the existing ones, and these `describe` blocks at the end of the file):

```ts
// add to the existing import from './actions':
// import { selectClass, movePlayer, chooseBattleAction, gameReducer } from './actions'

function battleFixture(overrides: Partial<GameState> = {}): GameState {
  const state = fixtureState()
  return {
    ...state,
    mode: 'battle',
    battle: { monster: { defSlug: 'goblin', hp: 7, position: { x: 2, y: 1 } }, log: [], abilityUsed: false },
    ...overrides,
  }
}

function forceRoll(sides: number, roll: number): number {
  return (roll - 0.5) / sides
}

function sequenceRng(values: number[]) {
  const queue = [...values]
  return () => {
    const next = queue.shift()
    if (next === undefined) throw new Error('sequenceRng exhausted')
    return next
  }
}

describe('chooseBattleAction', () => {
  it('flees back to exploring without a monster turn', () => {
    const state = battleFixture()
    const result = chooseBattleAction(state, 'flee', classDefs, monsterDefs, itemDefs)
    expect(result.mode).toBe('exploring')
    expect(result.battle).toBeNull()
    expect(result.player?.hp).toBe(12)
  })

  it('resolves a hit-then-hit attack exchange (monster survives)', () => {
    const state = battleFixture()
    // player attack: d20=15 (19 vs AC15, hits), damage d8=3 -> 5; monster hp 7-5=2, survives
    // monster attack: d20=15 (19 vs AC16, hits), damage d6=3 -> 5; player hp 12-5=7
    const rng = sequenceRng([forceRoll(20, 15), forceRoll(8, 3), forceRoll(20, 15), forceRoll(6, 3)])
    const result = chooseBattleAction(state, 'attack', classDefs, monsterDefs, itemDefs, rng)
    expect(result.mode).toBe('battle')
    expect(result.battle?.monster.hp).toBe(2)
    expect(result.player?.hp).toBe(7)
    expect(result.battle?.log.length).toBe(2)
  })

  it('defeats the monster and returns to exploring when its HP hits 0', () => {
    const state = battleFixture({
      battle: { monster: { defSlug: 'goblin', hp: 1, position: { x: 2, y: 1 } }, log: [], abilityUsed: false },
    })
    const rng = sequenceRng([forceRoll(20, 15), forceRoll(8, 6)]) // player hits for 8, monster (hp 1) dies
    const result = chooseBattleAction(state, 'attack', classDefs, monsterDefs, itemDefs, rng)
    expect(result.mode).toBe('exploring')
    expect(result.battle).toBeNull()
    expect(result.dungeon?.monsters).toEqual([])
  })

  it('sends the player to game-over when their HP hits 0', () => {
    const state = battleFixture({
      player: { ...battleFixture().player!, hp: 1 },
    })
    // player misses (natural 1), monster then hits hard
    const rng = sequenceRng([forceRoll(20, 1), forceRoll(20, 15), forceRoll(6, 6)])
    const result = chooseBattleAction(state, 'attack', classDefs, monsterDefs, itemDefs, rng)
    expect(result.mode).toBe('game-over')
  })

  it('uses the class ability once, then refuses a second use without spending the monster turn', () => {
    const state = battleFixture()
    // Second Wind heals 7+1=8 (capped at maxHp, already full); using an ability still spends the
    // turn, so the monster acts too — force its attack roll to a natural 1 (auto-miss, no damage roll needed)
    const rng1 = sequenceRng([forceRoll(10, 7), forceRoll(20, 1)])
    const afterFirst = chooseBattleAction(state, 'ability', classDefs, monsterDefs, itemDefs, rng1)
    expect(afterFirst.battle?.abilityUsed).toBe(true)
    expect(afterFirst.player?.hp).toBe(12) // capped at maxHp, was already full; monster's turn missed

    const rng2 = sequenceRng([]) // must not be called — no monster turn on a wasted click
    const afterSecond = chooseBattleAction(afterFirst, 'ability', classDefs, monsterDefs, itemDefs, rng2)
    expect(afterSecond.battle?.log.at(-1)).toContain('already been used')
    expect(afterSecond.player?.hp).toBe(12)
  })

  it('uses a potion from inventory, heals, and still takes a monster turn', () => {
    const state = battleFixture({
      player: { ...battleFixture().player!, hp: 5, inventory: ['potion-of-healing'] },
    })
    const rng = sequenceRng([forceRoll(4, 2), forceRoll(4, 2), forceRoll(20, 15), forceRoll(6, 3)])
    const result = chooseBattleAction(state, 'item', classDefs, monsterDefs, itemDefs, rng)
    expect(result.player?.inventory).toEqual([])
    expect(result.player?.hp).toBe(Math.min(12, 5 + 2 + 2 + 2) - 5) // healed then hit for 5
  })

  it('does nothing and skips the monster turn when there are no usable items', () => {
    const state = battleFixture()
    const rng = sequenceRng([])
    const result = chooseBattleAction(state, 'item', classDefs, monsterDefs, itemDefs, rng)
    expect(result.battle?.log.at(-1)).toContain('No usable items')
    expect(result.player?.hp).toBe(12)
  })
})

describe('gameReducer', () => {
  it('dispatches SELECT_CLASS to selectClass', () => {
    const data = { classDefs, monsterDefs, itemDefs }
    const result = gameReducer(createInitialState(), { type: 'SELECT_CLASS', classSlug: 'fighter' }, data, mulberry32(2))
    expect(result.mode).toBe('exploring')
  })

  it('dispatches MOVE to movePlayer', () => {
    const data = { classDefs, monsterDefs, itemDefs }
    const result = gameReducer(fixtureState(), { type: 'MOVE', dx: 0, dy: 1 }, data)
    expect(result.player?.position).toEqual({ x: 1, y: 2 })
  })

  it('dispatches BATTLE_ACTION to chooseBattleAction', () => {
    const data = { classDefs, monsterDefs, itemDefs }
    const result = gameReducer(battleFixture(), { type: 'BATTLE_ACTION', choice: 'flee' }, data)
    expect(result.mode).toBe('exploring')
  })
})
```

Update the top import line in `src/engine/actions.test.ts` from:

```ts
import { selectClass, movePlayer } from './actions'
```

to:

```ts
import { selectClass, movePlayer, chooseBattleAction, gameReducer } from './actions'
```

- [ ] **Step 2: Run tests, confirm failure**

Run: `npm test -- actions`
Expected: FAIL — `chooseBattleAction` and `gameReducer` are not exported yet.

- [ ] **Step 3: Add battle resolution and the reducer to `src/engine/actions.ts`**

Add these imports to the top of `src/engine/actions.ts`:

```ts
import { resolveAttack, resolveHeal } from './combat'
import { rollDice } from './dice'
import type { BattleState } from './state'
```

Add these two lookup helpers below `monsterDefLookup`:

```ts
function itemDefLookup(defs: ItemDefinition[], slug: string): ItemDefinition {
  const def = defs.find((d) => d.slug === slug)
  if (!def) throw new Error(`Unknown item: ${slug}`)
  return def
}

function removeFirst(items: string[], value: string): string[] {
  const index = items.indexOf(value)
  if (index === -1) return items
  const copy = [...items]
  copy.splice(index, 1)
  return copy
}
```

Append `chooseBattleAction` at the end of the file:

```ts
export function chooseBattleAction(
  state: GameState,
  choice: 'attack' | 'ability' | 'item' | 'flee',
  classDefs: ClassDefinition[],
  monsterDefs: MonsterDefinition[],
  itemDefs: ItemDefinition[],
  rng: RNG = Math.random
): GameState {
  if (state.mode !== 'battle' || !state.player || !state.battle || !state.dungeon) return state

  if (choice === 'flee') {
    return { ...state, mode: 'exploring', battle: null }
  }

  const classDef = classLookup(classDefs, state.player.classSlug)
  const monsterDef = monsterDefLookup(monsterDefs, state.battle.monster.defSlug)

  let player = state.player
  let monster = state.battle.monster
  const log = [...state.battle.log]
  let abilityUsed = state.battle.abilityUsed
  let playerActed = true

  if (choice === 'attack') {
    const result = resolveAttack(
      player.className,
      monsterDef.name,
      classDef.attack.attackBonus,
      monsterDef.armorClass,
      classDef.attack.damageDice,
      classDef.attack.damageBonus,
      classDef.attack.damageType,
      rng,
      classDef.attack.bonusDamageDice
    )
    log.push(result.log)
    monster = { ...monster, hp: Math.max(0, monster.hp - result.damage) }
  } else if (choice === 'ability') {
    if (abilityUsed) {
      log.push(`${player.className}'s ${classDef.ability.name} has already been used this battle.`)
      playerActed = false
    } else if (classDef.ability.kind === 'heal') {
      const result = resolveHeal(player.className, classDef.ability.name, classDef.ability.healDice, classDef.ability.healBonus, rng)
      player = { ...player, hp: Math.min(player.maxHp, player.hp + result.amount) }
      log.push(result.log)
      abilityUsed = true
    } else {
      const result = resolveAttack(
        player.className,
        monsterDef.name,
        classDef.ability.attackBonus,
        monsterDef.armorClass,
        classDef.ability.damageDice,
        classDef.ability.damageBonus,
        classDef.ability.damageType,
        rng,
        classDef.ability.bonusDamageDice
      )
      log.push(`${player.className} uses ${classDef.ability.name}! ${result.log}`)
      monster = { ...monster, hp: Math.max(0, monster.hp - result.damage) }
      abilityUsed = true
    }
  } else if (choice === 'item') {
    const potionSlug = player.inventory.find((slug) => itemDefLookup(itemDefs, slug).effect.kind === 'heal')
    if (!potionSlug) {
      log.push('No usable items.')
      playerActed = false
    } else {
      const itemDef = itemDefLookup(itemDefs, potionSlug)
      const amount = rollDice(itemDef.effect.healDice, rng) + itemDef.effect.healBonus
      player = {
        ...player,
        hp: Math.min(player.maxHp, player.hp + amount),
        inventory: removeFirst(player.inventory, potionSlug),
      }
      log.push(`${player.className} drinks a ${itemDef.name} and recovers ${amount} HP.`)
    }
  }

  if (monster.hp <= 0) {
    log.push(`The ${monsterDef.name} is defeated!`)
    return {
      ...state,
      mode: 'exploring',
      player,
      dungeon: {
        ...state.dungeon,
        monsters: state.dungeon.monsters.filter(
          (m) => !(m.position.x === state.battle!.monster.position.x && m.position.y === state.battle!.monster.position.y)
        ),
      },
      battle: null,
    }
  }

  if (playerActed) {
    const monsterResult = resolveAttack(
      monsterDef.name,
      player.className,
      monsterDef.attack.attackBonus,
      player.ac,
      monsterDef.attack.damageDice,
      monsterDef.attack.damageBonus,
      monsterDef.attack.damageType,
      rng
    )
    log.push(monsterResult.log)
    player = { ...player, hp: Math.max(0, player.hp - monsterResult.damage) }
  }

  const battle: BattleState = { monster, log, abilityUsed }

  if (player.hp <= 0) {
    return { ...state, mode: 'game-over', player, battle }
  }

  return { ...state, player, battle }
}

export type EngineAction =
  | { type: 'SELECT_CLASS'; classSlug: string }
  | { type: 'MOVE'; dx: number; dy: number }
  | { type: 'BATTLE_ACTION'; choice: 'attack' | 'ability' | 'item' | 'flee' }

export function gameReducer(
  state: GameState,
  action: EngineAction,
  data: { classDefs: ClassDefinition[]; monsterDefs: MonsterDefinition[]; itemDefs: ItemDefinition[] },
  rng: RNG = Math.random
): GameState {
  switch (action.type) {
    case 'SELECT_CLASS':
      return selectClass(state, action.classSlug, data.classDefs, data.monsterDefs, data.itemDefs, rng)
    case 'MOVE':
      return movePlayer(state, action.dx, action.dy, data.monsterDefs)
    case 'BATTLE_ACTION':
      return chooseBattleAction(state, action.choice, data.classDefs, data.monsterDefs, data.itemDefs, rng)
    default:
      return state
  }
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm test -- actions`
Expected: PASS (17 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/actions.ts src/engine/actions.test.ts
git commit -m "Add battle resolution and the top-level game reducer"
```

---

### Task 9: CharacterSelect component

**Files:**
- Create: `src/components/CharacterSelect.tsx`
- Test: `src/components/CharacterSelect.test.tsx`

**Interfaces:**
- Consumes: `ClassDefinition` from `src/engine/state.ts`.
- Produces: `CharacterSelect({ classDefs, onSelect }: { classDefs: ClassDefinition[]; onSelect: (classSlug: string) => void })`. Used by Task 12 (`App.tsx`).

- [ ] **Step 1: Write the failing test**

`src/components/CharacterSelect.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import CharacterSelect from './CharacterSelect'
import type { ClassDefinition } from '../engine/state'

const classDefs: ClassDefinition[] = [
  {
    slug: 'fighter',
    name: 'Fighter',
    hitDie: '1d10',
    maxHp: 12,
    armorClass: 16,
    abilityScores: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
    attack: { kind: 'attack', name: 'Longsword', attackBonus: 4, damageDice: '1d8', damageBonus: 2, damageType: 'slashing' },
    ability: { kind: 'heal', name: 'Second Wind', healDice: '1d10', healBonus: 1 },
  },
  {
    slug: 'wizard',
    name: 'Wizard',
    hitDie: '1d6',
    maxHp: 7,
    armorClass: 12,
    abilityScores: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 },
    attack: { kind: 'attack', name: 'Fire Bolt', attackBonus: 4, damageDice: '1d10', damageBonus: 0, damageType: 'fire' },
    ability: { kind: 'attack', name: 'Ray of Frost', attackBonus: 4, damageDice: '1d8', damageBonus: 0, damageType: 'cold' },
  },
]

describe('CharacterSelect', () => {
  it('lists every class by name', () => {
    render(<CharacterSelect classDefs={classDefs} onSelect={() => {}} />)
    expect(screen.getByText('Fighter')).toBeInTheDocument()
    expect(screen.getByText('Wizard')).toBeInTheDocument()
  })

  it('calls onSelect with the chosen class slug', async () => {
    const onSelect = vi.fn()
    render(<CharacterSelect classDefs={classDefs} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: /wizard/i }))
    expect(onSelect).toHaveBeenCalledWith('wizard')
  })
})
```

- [ ] **Step 2: Run test, confirm failure**

Run: `npm test -- CharacterSelect`
Expected: FAIL — `src/components/CharacterSelect.tsx` does not exist.

- [ ] **Step 3: Implement `src/components/CharacterSelect.tsx`**

```tsx
import type { ClassDefinition } from '../engine/state'

type Props = {
  classDefs: ClassDefinition[]
  onSelect: (classSlug: string) => void
}

export default function CharacterSelect({ classDefs, onSelect }: Props) {
  return (
    <div>
      <h1>Choose your class</h1>
      <ul>
        {classDefs.map((def) => (
          <li key={def.slug}>
            <button onClick={() => onSelect(def.slug)}>{def.name}</button>
            <span>
              {' '}
              HP {def.maxHp} · AC {def.armorClass} · {def.attack.name}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Run test, confirm pass**

Run: `npm test -- CharacterSelect`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/CharacterSelect.tsx src/components/CharacterSelect.test.tsx
git commit -m "Add CharacterSelect component"
```

---

### Task 10: DungeonView component

**Files:**
- Create: `src/components/DungeonView.tsx`
- Test: `src/components/DungeonView.test.tsx`

**Interfaces:**
- Consumes: `DungeonState`, `Player`, `MonsterDefinition`, `ItemDefinition` from `src/engine/state.ts`.
- Produces: `DungeonView({ dungeon, player, monsterDefs, itemDefs, onMove }: { dungeon: DungeonState; player: Player; monsterDefs: MonsterDefinition[]; itemDefs: ItemDefinition[]; onMove: (dx: number, dy: number) => void })`. Used by Task 12 (`App.tsx`).

- [ ] **Step 1: Write the failing test**

`src/components/DungeonView.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DungeonView from './DungeonView'
import type { DungeonState, ItemDefinition, MonsterDefinition, Player, Tile } from '../engine/state'

const grid: Tile[][] = [
  ['wall', 'wall', 'wall'],
  ['wall', 'floor', 'wall'],
  ['wall', 'wall', 'wall'],
]

const dungeon: DungeonState = {
  grid,
  rooms: [{ x: 1, y: 1, width: 1, height: 1 }],
  startPosition: { x: 1, y: 1 },
  stairsPosition: { x: 1, y: 1 },
  monsters: [],
  items: [],
}

const player: Player = {
  classSlug: 'fighter',
  className: 'Fighter',
  abilityScores: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
  hp: 12,
  maxHp: 12,
  ac: 16,
  inventory: [],
  position: { x: 1, y: 1 },
}

const monsterDefs: MonsterDefinition[] = []
const itemDefs: ItemDefinition[] = []

describe('DungeonView', () => {
  it('renders the player glyph on the grid', () => {
    render(<DungeonView dungeon={dungeon} player={player} monsterDefs={monsterDefs} itemDefs={itemDefs} onMove={() => {}} />)
    expect(screen.getByTestId('dungeon-grid').textContent).toContain('@')
  })

  it('shows current HP', () => {
    render(<DungeonView dungeon={dungeon} player={player} monsterDefs={monsterDefs} itemDefs={itemDefs} onMove={() => {}} />)
    expect(screen.getByText(/12\/12/)).toBeInTheDocument()
  })

  it('calls onMove with the correct delta on arrow key press', () => {
    const onMove = vi.fn()
    render(<DungeonView dungeon={dungeon} player={player} monsterDefs={monsterDefs} itemDefs={itemDefs} onMove={onMove} />)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(onMove).toHaveBeenCalledWith(1, 0)
  })
})
```

- [ ] **Step 2: Run test, confirm failure**

Run: `npm test -- DungeonView`
Expected: FAIL — `src/components/DungeonView.tsx` does not exist.

- [ ] **Step 3: Implement `src/components/DungeonView.tsx`**

```tsx
import { useEffect } from 'react'
import type { DungeonState, ItemDefinition, MonsterDefinition, Player } from '../engine/state'

type Props = {
  dungeon: DungeonState
  player: Player
  monsterDefs: MonsterDefinition[]
  itemDefs: ItemDefinition[]
  onMove: (dx: number, dy: number) => void
}

const KEY_TO_DELTA: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  w: [0, -1],
  ArrowDown: [0, 1],
  s: [0, 1],
  ArrowLeft: [-1, 0],
  a: [-1, 0],
  ArrowRight: [1, 0],
  d: [1, 0],
}

function glyphFor(defSlug: string, defs: { slug: string; glyph: string }[]): string {
  return defs.find((d) => d.slug === defSlug)?.glyph ?? '?'
}

export default function DungeonView({ dungeon, player, monsterDefs, itemDefs, onMove }: Props) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const delta = KEY_TO_DELTA[event.key]
      if (delta) onMove(delta[0], delta[1])
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onMove])

  const monsterAt = (x: number, y: number) => dungeon.monsters.find((m) => m.position.x === x && m.position.y === y)
  const itemAt = (x: number, y: number) => dungeon.items.find((i) => i.position.x === x && i.position.y === y)

  const rows = dungeon.grid.map((row, y) =>
    row
      .map((tile, x) => {
        if (player.position.x === x && player.position.y === y) return '@'
        if (dungeon.stairsPosition.x === x && dungeon.stairsPosition.y === y) return '>'
        const monster = monsterAt(x, y)
        if (monster) return glyphFor(monster.defSlug, monsterDefs)
        const item = itemAt(x, y)
        if (item) return glyphFor(item.defSlug, itemDefs)
        return tile === 'wall' ? '#' : '.'
      })
      .join('')
  )

  return (
    <div>
      <pre data-testid="dungeon-grid">{rows.join('\n')}</pre>
      <p>
        HP: {player.hp}/{player.maxHp}
      </p>
      <ul>
        {player.inventory.map((slug, i) => (
          <li key={i}>{itemDefs.find((d) => d.slug === slug)?.name ?? slug}</li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Run test, confirm pass**

Run: `npm test -- DungeonView`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/DungeonView.tsx src/components/DungeonView.test.tsx
git commit -m "Add DungeonView component with ASCII grid and keyboard movement"
```

---

### Task 11: BattleView component

**Files:**
- Create: `src/components/BattleView.tsx`
- Test: `src/components/BattleView.test.tsx`

**Interfaces:**
- Consumes: `BattleState`, `ClassDefinition`, `MonsterDefinition`, `Player` from `src/engine/state.ts`.
- Produces: `BattleView({ player, classDef, battle, monsterDef, hasItem, onAction }: { player: Player; classDef: ClassDefinition; battle: BattleState; monsterDef: MonsterDefinition; hasItem: boolean; onAction: (choice: 'attack' | 'ability' | 'item' | 'flee') => void })`. Used by Task 12 (`App.tsx`).

- [ ] **Step 1: Write the failing test**

`src/components/BattleView.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import BattleView from './BattleView'
import type { BattleState, ClassDefinition, MonsterDefinition, Player } from '../engine/state'

const player: Player = {
  classSlug: 'fighter',
  className: 'Fighter',
  abilityScores: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
  hp: 10,
  maxHp: 12,
  ac: 16,
  inventory: [],
  position: { x: 1, y: 1 },
}

const classDef: ClassDefinition = {
  slug: 'fighter',
  name: 'Fighter',
  hitDie: '1d10',
  maxHp: 12,
  armorClass: 16,
  abilityScores: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
  attack: { kind: 'attack', name: 'Longsword', attackBonus: 4, damageDice: '1d8', damageBonus: 2, damageType: 'slashing' },
  ability: { kind: 'heal', name: 'Second Wind', healDice: '1d10', healBonus: 1 },
}

const monsterDef: MonsterDefinition = {
  slug: 'goblin',
  name: 'Goblin',
  glyph: 'g',
  armorClass: 15,
  maxHp: 7,
  abilityScores: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
  challengeRating: '1/4',
  attack: { kind: 'attack', name: 'Scimitar', attackBonus: 4, damageDice: '1d6', damageBonus: 2, damageType: 'slashing' },
}

const battle: BattleState = {
  monster: { defSlug: 'goblin', hp: 4, position: { x: 2, y: 1 } },
  log: ['A Goblin blocks your path!'],
  abilityUsed: false,
}

describe('BattleView', () => {
  it('shows both combatants and the log', () => {
    render(<BattleView player={player} classDef={classDef} battle={battle} monsterDef={monsterDef} hasItem={false} onAction={() => {}} />)
    expect(screen.getByText(/Goblin/)).toBeInTheDocument()
    expect(screen.getByText(/4\/7/)).toBeInTheDocument()
    expect(screen.getByText(/10\/12/)).toBeInTheDocument()
    expect(screen.getByText('A Goblin blocks your path!')).toBeInTheDocument()
  })

  it('calls onAction with "attack" when the attack button is clicked', async () => {
    const onAction = vi.fn()
    render(<BattleView player={player} classDef={classDef} battle={battle} monsterDef={monsterDef} hasItem={false} onAction={onAction} />)
    await userEvent.click(screen.getByRole('button', { name: /longsword/i }))
    expect(onAction).toHaveBeenCalledWith('attack')
  })

  it('disables the ability button once it has been used', () => {
    render(
      <BattleView
        player={player}
        classDef={classDef}
        battle={{ ...battle, abilityUsed: true }}
        monsterDef={monsterDef}
        hasItem={false}
        onAction={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: /second wind/i })).toBeDisabled()
  })

  it('disables the item button when the player has no items', () => {
    render(<BattleView player={player} classDef={classDef} battle={battle} monsterDef={monsterDef} hasItem={false} onAction={() => {}} />)
    expect(screen.getByRole('button', { name: /item/i })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run test, confirm failure**

Run: `npm test -- BattleView`
Expected: FAIL — `src/components/BattleView.tsx` does not exist.

- [ ] **Step 3: Implement `src/components/BattleView.tsx`**

```tsx
import type { BattleState, ClassDefinition, MonsterDefinition, Player } from '../engine/state'

type Props = {
  player: Player
  classDef: ClassDefinition
  battle: BattleState
  monsterDef: MonsterDefinition
  hasItem: boolean
  onAction: (choice: 'attack' | 'ability' | 'item' | 'flee') => void
}

export default function BattleView({ player, classDef, battle, monsterDef, hasItem, onAction }: Props) {
  return (
    <div>
      <h2>{monsterDef.name}</h2>
      <p>
        Monster HP: {battle.monster.hp}/{monsterDef.maxHp}
      </p>
      <h2>{player.className}</h2>
      <p>
        Your HP: {player.hp}/{player.maxHp}
      </p>
      <div>
        <button onClick={() => onAction('attack')}>{classDef.attack.name}</button>
        <button onClick={() => onAction('ability')} disabled={battle.abilityUsed}>
          {classDef.ability.name}
        </button>
        <button onClick={() => onAction('item')} disabled={!hasItem}>
          Item
        </button>
        <button onClick={() => onAction('flee')}>Flee</button>
      </div>
      <ul data-testid="battle-log">
        {battle.log.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Run test, confirm pass**

Run: `npm test -- BattleView`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/BattleView.tsx src/components/BattleView.test.tsx
git commit -m "Add BattleView component"
```

---

### Task 12: App integration and end screens

**Files:**
- Modify: `src/components/App.tsx`
- Modify: `src/components/App.test.tsx`

**Interfaces:**
- Consumes: `gameReducer`, `EngineAction` from `src/engine/actions.ts`; `createInitialState`, `RNG` from `src/engine/state.ts` / `src/engine/dice.ts`; `classes.json`, `monsters.json`, `items.json`; `CharacterSelect`, `DungeonView`, `BattleView` components.
- Produces: the fully wired `App` component — the plan's final deliverable.

- [ ] **Step 1: Replace the test in `src/components/App.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('starts on character select', () => {
    render(<App />)
    expect(screen.getByText(/choose your class/i)).toBeInTheDocument()
  })

  it('moves into the dungeon after choosing a class', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /fighter/i }))
    expect(screen.getByTestId('dungeon-grid')).toBeInTheDocument()
    expect(screen.getByText(/HP: \d+\/\d+/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests, confirm failure**

Run: `npm test -- App`
Expected: FAIL — the placeholder `App` only renders "Dungeonlike", not a class-select screen.

- [ ] **Step 3: Implement the wired `src/components/App.tsx`**

```tsx
import { useMemo, useReducer } from 'react'
import classesData from '../data/classes.json'
import monstersData from '../data/monsters.json'
import itemsData from '../data/items.json'
import type { RNG } from '../engine/dice'
import { createInitialState, type ClassDefinition, type ItemDefinition, type MonsterDefinition } from '../engine/state'
import { gameReducer, type EngineAction } from '../engine/actions'
import CharacterSelect from './CharacterSelect'
import DungeonView from './DungeonView'
import BattleView from './BattleView'

const classes = classesData as ClassDefinition[]
const monsters = monstersData as MonsterDefinition[]
const items = itemsData as ItemDefinition[]

type Props = { rng?: RNG }

export default function App({ rng = Math.random }: Props = {}) {
  const [state, dispatch] = useReducer(
    (s: ReturnType<typeof createInitialState>, action: EngineAction) =>
      gameReducer(s, action, { classDefs: classes, monsterDefs: monsters, itemDefs: items }, rng),
    undefined,
    createInitialState
  )

  const classDef = useMemo(() => classes.find((c) => c.slug === state.player?.classSlug), [state.player?.classSlug])
  const monsterDef = useMemo(() => monsters.find((m) => m.slug === state.battle?.monster.defSlug), [state.battle?.monster.defSlug])

  if (state.mode === 'character-select') {
    return <CharacterSelect classDefs={classes} onSelect={(classSlug) => dispatch({ type: 'SELECT_CLASS', classSlug })} />
  }

  if (state.mode === 'exploring' && state.player && state.dungeon) {
    return (
      <DungeonView
        dungeon={state.dungeon}
        player={state.player}
        monsterDefs={monsters}
        itemDefs={items}
        onMove={(dx, dy) => dispatch({ type: 'MOVE', dx, dy })}
      />
    )
  }

  if (state.mode === 'battle' && state.player && state.battle && classDef && monsterDef) {
    return (
      <BattleView
        player={state.player}
        classDef={classDef}
        battle={state.battle}
        monsterDef={monsterDef}
        hasItem={state.player.inventory.length > 0}
        onAction={(choice) => dispatch({ type: 'BATTLE_ACTION', choice })}
      />
    )
  }

  if (state.mode === 'victory') {
    return <h1>You found the stairs down. Victory!</h1>
  }

  if (state.mode === 'game-over') {
    return <h1>You have died.</h1>
  }

  return null
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm test`
Expected: PASS — all tests across every task pass (App, CharacterSelect, DungeonView, BattleView, dice, state, dungeon, combat, actions, data).

- [ ] **Step 5: Confirm the full build succeeds**

Run: `npm run build`
Expected: succeeds with no TypeScript errors.

- [ ] **Step 6: Manually verify in the browser**

Run: `npm run dev`, open the printed local URL. Confirm: character select shows all three classes; picking one drops you into a rendered ASCII dungeon with `@`, walls, and at least one monster glyph; walking into a monster opens the battle screen with both stat blocks, HP, and a working action menu; winning a fight returns you to the dungeon with the monster gone; walking onto `>` shows the victory screen; losing a fight shows the game-over screen. Stop the dev server when done.

- [ ] **Step 7: Commit**

```bash
git add src/components/App.tsx src/components/App.test.tsx
git commit -m "Wire App to the game reducer; add victory/game-over screens"
```

---

## Self-review notes

- **Spec coverage:** character select (Task 9/12) → single generated level (Task 6) → ASCII exploration with movement/pickup (Task 10, 7) → Pokémon-style battle screen with menu, stat blocks, and d20 resolution (Task 11, 8) → win/lose via stairs or HP 0 (Task 7, 8) → SRD-sourced data with documented fetch tooling (Task 4). All MVP scope items from the spec are covered by a task.
- **Placeholder scan:** no TBD/TODO markers; every step has runnable code.
- **Type consistency:** `ClassDefinition`, `MonsterDefinition`, `ItemDefinition`, `GameState`, `EngineAction`, and the `chooseBattleAction`/`gameReducer` signatures are defined once (Tasks 3, 8) and reused with identical names/shapes in every later task.
- **Scope check:** this is one cohesive vertical slice (spec's own framing) — engine, data, and UI subsystems are tightly coupled by the shared `GameState`/`EngineAction` contract, not independent projects, so one plan is appropriate.

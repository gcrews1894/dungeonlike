import { describe, it, expect } from 'vitest'
import { gameReducer } from './actions'
import { createInitialState } from './state'
import { mulberry32 } from './dice'
import type {
  ClassDefinition,
  GameState,
  ItemDefinition,
  MonsterDefinition,
  Position,
  Tile,
} from './state'

// End-to-end coverage of the reducer loop: SELECT_CLASS -> MOVE... -> BATTLE_ACTION... -> MOVE... -> victory.
// The dungeon is generated, so nothing here may hardcode coordinates, monster identity or class
// identity — the test navigates whatever layout the seed produces.

const classDefs: ClassDefinition[] = [
  {
    slug: 'fighter',
    name: 'Fighter',
    hitDie: '1d10',
    maxHp: 40,
    armorClass: 16,
    abilityScores: { str: 16, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
    attack: { kind: 'attack', name: 'Longsword', attackBonus: 5, damageDice: '1d8', damageBonus: 3, damageType: 'slashing' },
    ability: { kind: 'heal', name: 'Second Wind', healDice: '1d10', healBonus: 1 },
  },
  {
    slug: 'rogue',
    name: 'Rogue',
    hitDie: '1d8',
    maxHp: 30,
    armorClass: 14,
    abilityScores: { str: 10, dex: 16, con: 12, int: 12, wis: 12, cha: 14 },
    attack: { kind: 'attack', name: 'Shortsword', attackBonus: 5, damageDice: '1d6', damageBonus: 3, damageType: 'piercing' },
    ability: {
      kind: 'attack',
      name: 'Sneak Attack',
      attackBonus: 5,
      damageDice: '1d6',
      damageBonus: 3,
      damageType: 'piercing',
      bonusDamageDice: '1d6',
    },
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
  {
    slug: 'kobold',
    name: 'Kobold',
    glyph: 'k',
    armorClass: 12,
    maxHp: 5,
    abilityScores: { str: 7, dex: 15, con: 9, int: 8, wis: 7, cha: 8 },
    challengeRating: '1/8',
    attack: { kind: 'attack', name: 'Dagger', attackBonus: 4, damageDice: '1d4', damageBonus: 2, damageType: 'piercing' },
  },
]

const itemDefs: ItemDefinition[] = [
  { slug: 'potion-of-healing', name: 'Potion of Healing', glyph: '!', effect: { kind: 'heal', healDice: '2d4', healBonus: 2 } },
]

const data = { classDefs, monsterDefs, itemDefs }

/** Every die comes up its maximum face: d20s are natural 20s (auto-hit, crit) with max damage. */
const maxRollRng = () => 0.999999

type Step = { dx: number; dy: number }

const DIRECTIONS: Step[] = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
]

const posKey = (p: Position) => `${p.x},${p.y}`
const samePos = (a: Position, b: Position) => a.x === b.x && a.y === b.y

/**
 * Breadth-first shortest path over floor tiles, returned as the sequence of {dx, dy} steps that
 * walks `from` to `to`. Tiles in `avoid` are treated as impassable. Returns null when unreachable.
 */
function findPath(grid: Tile[][], from: Position, to: Position, avoid: Set<string> = new Set()): Step[] | null {
  const walkable = (p: Position) =>
    p.y >= 0 && p.y < grid.length && p.x >= 0 && p.x < grid[0].length && grid[p.y][p.x] === 'floor'

  if (!walkable(from) || !walkable(to)) return null
  if (samePos(from, to)) return []

  const cameFrom = new Map<string, { previous: Position; step: Step }>()
  const visited = new Set<string>([posKey(from)])
  const queue: Position[] = [from]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (samePos(current, to)) {
      const steps: Step[] = []
      let cursor = current
      while (!samePos(cursor, from)) {
        const link = cameFrom.get(posKey(cursor))!
        steps.unshift(link.step)
        cursor = link.previous
      }
      return steps
    }
    for (const step of DIRECTIONS) {
      const next: Position = { x: current.x + step.dx, y: current.y + step.dy }
      const key = posKey(next)
      if (visited.has(key) || !walkable(next)) continue
      if (avoid.has(key) && !samePos(next, to)) continue
      visited.add(key)
      cameFrom.set(key, { previous: current, step })
      queue.push(next)
    }
  }
  return null
}

function pathLength(state: GameState, target: Position, avoid?: Set<string>): number {
  const path = findPath(state.dungeon!.grid, state.player!.position, target, avoid)
  return path === null ? Number.POSITIVE_INFINITY : path.length
}

/** Dispatch a single MOVE along the shortest path toward `target`. */
function stepToward(state: GameState, target: Position, avoid?: Set<string>): GameState {
  const path = findPath(state.dungeon!.grid, state.player!.position, target, avoid)
  expect(path).not.toBeNull()
  expect(path!.length).toBeGreaterThan(0)
  const [next] = path!
  return gameReducer(state, { type: 'MOVE', dx: next.dx, dy: next.dy }, data)
}

/** Attack until the battle resolves. Max rolls make this terminate in a couple of rounds. */
function fightToTheEnd(state: GameState): GameState {
  let current = state
  let rounds = 0
  while (current.mode === 'battle' && rounds < 20) {
    current = gameReducer(current, { type: 'BATTLE_ACTION', choice: 'attack' }, data, maxRollRng)
    rounds++
  }
  expect(current.mode).not.toBe('battle')
  return current
}

describe('full game loop through gameReducer', () => {
  it('selects a class, hunts down the nearest monster, kills it, and walks to the stairs to win', () => {
    // 1. Character select -> a real generated dungeon.
    let state = gameReducer(createInitialState(), { type: 'SELECT_CLASS', classSlug: classDefs[0].slug }, data, mulberry32(1))
    expect(state.mode).toBe('exploring')
    expect(state.player).not.toBeNull()
    expect(state.dungeon).not.toBeNull()
    expect(state.player!.position).toEqual(state.dungeon!.startPosition)
    expect(state.player!.abilityUsed).toBe(false)

    const stairs = state.dungeon!.stairsPosition
    const stairsKey = posKey(stairs)

    // Nothing may be hiding underneath the stairs glyph.
    expect(state.dungeon!.monsters.some((m) => samePos(m.position, stairs))).toBe(false)
    expect(state.dungeon!.items.some((i) => samePos(i.position, stairs))).toBe(false)

    // 2. Pick the monster nearest by walking distance (not straight-line), routing around the stairs
    //    so the run cannot end before the fight.
    const avoidStairs = new Set([stairsKey])
    const monstersBefore = state.dungeon!.monsters
    expect(monstersBefore.length).toBeGreaterThanOrEqual(1)

    const reachable = monstersBefore.filter((m) => Number.isFinite(pathLength(state, m.position, avoidStairs)))
    expect(reachable.length).toBeGreaterThanOrEqual(1)
    const target = reachable.reduce((best, candidate) =>
      pathLength(state, candidate.position, avoidStairs) < pathLength(state, best.position, avoidStairs) ? candidate : best
    )

    // 3. Walk onto it — the final step turns into a battle instead of a move.
    let steps = 0
    while (state.mode === 'exploring' && steps < 500) {
      steps++
      state = stepToward(state, target.position, avoidStairs)
    }
    expect(state.mode).toBe('battle')
    expect(state.battle).not.toBeNull()
    // Whichever monster we ran into, it is one that was standing in the dungeon.
    expect(monstersBefore.some((m) => samePos(m.position, state.battle!.monster.position))).toBe(true)

    const engaged = state.battle!.monster
    expect(engaged.hp).toBeGreaterThan(0)

    // 4. Fight it out with guaranteed crits.
    state = fightToTheEnd(state)
    expect(state.mode).toBe('exploring')
    expect(state.battle).toBeNull()
    expect(state.player!.hp).toBeGreaterThan(0)
    expect(state.dungeon!.monsters.some((m) => samePos(m.position, engaged.position))).toBe(false)
    expect(state.dungeon!.monsters.length).toBe(monstersBefore.length - 1)

    // 5. Head for the stairs, clearing anything that blocks the way.
    let travelSteps = 0
    while (state.mode !== 'victory' && travelSteps < 500) {
      travelSteps++
      state = stepToward(state, stairs)
      if (state.mode === 'battle') state = fightToTheEnd(state)
    }

    // 6. Run won.
    expect(state.mode).toBe('victory')
    expect(state.player!.position).toEqual(stairs)
    expect(state.player!.hp).toBeGreaterThan(0)
  })
})

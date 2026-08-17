import { describe, it, expect } from 'vitest'
import { selectClass, movePlayer, chooseBattleAction, gameReducer } from './actions'
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

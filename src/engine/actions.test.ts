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

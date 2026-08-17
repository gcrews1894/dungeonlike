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

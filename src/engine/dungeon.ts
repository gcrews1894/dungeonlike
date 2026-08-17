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

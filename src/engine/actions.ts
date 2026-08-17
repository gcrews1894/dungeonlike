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

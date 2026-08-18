import type { RNG } from './dice'
import { generateDungeon } from './dungeon'
import type { ClassDefinition, GameState, ItemDefinition, MonsterDefinition, Player, Position } from './state'
import { resolveAttack, resolveHeal } from './combat'
import { rollDice } from './dice'
import type { BattleState } from './state'

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
    abilityUsed: false,
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
      battle: { monster: monsterHere, log: [`A ${monsterDef.name} blocks your path!`] },
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
    const monster = state.battle.monster
    return {
      ...state,
      mode: 'exploring',
      dungeon: {
        ...state.dungeon,
        monsters: state.dungeon.monsters.map((m) =>
          m.position.x === monster.position.x && m.position.y === monster.position.y ? monster : m
        ),
      },
      battle: null,
    }
  }

  const classDef = classLookup(classDefs, state.player.classSlug)
  const monsterDef = monsterDefLookup(monsterDefs, state.battle.monster.defSlug)

  let player = state.player
  let monster = state.battle.monster
  const log = [...state.battle.log]
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
    if (player.abilityUsed) {
      log.push(`${player.className}'s ${classDef.ability.name} has already been used this run.`)
      playerActed = false
    } else if (classDef.ability.kind === 'heal') {
      const result = resolveHeal(player.className, classDef.ability.name, classDef.ability.healDice, classDef.ability.healBonus, rng)
      player = { ...player, hp: Math.min(player.maxHp, player.hp + result.amount), abilityUsed: true }
      log.push(result.log)
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
      player = { ...player, abilityUsed: true }
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

  const battle: BattleState = { monster, log }

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

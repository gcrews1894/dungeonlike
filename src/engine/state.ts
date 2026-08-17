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

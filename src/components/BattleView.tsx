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
        <button onClick={() => onAction('ability')} disabled={player.abilityUsed}>
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

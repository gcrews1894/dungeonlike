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

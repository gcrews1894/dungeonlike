import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import CharacterSelect from './CharacterSelect'
import type { ClassDefinition } from '../engine/state'

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
  {
    slug: 'wizard',
    name: 'Wizard',
    hitDie: '1d6',
    maxHp: 7,
    armorClass: 12,
    abilityScores: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 },
    attack: { kind: 'attack', name: 'Fire Bolt', attackBonus: 4, damageDice: '1d10', damageBonus: 0, damageType: 'fire' },
    ability: { kind: 'attack', name: 'Ray of Frost', attackBonus: 4, damageDice: '1d8', damageBonus: 0, damageType: 'cold' },
  },
]

describe('CharacterSelect', () => {
  it('lists every class by name', () => {
    render(<CharacterSelect classDefs={classDefs} onSelect={() => {}} />)
    expect(screen.getByText('Fighter')).toBeInTheDocument()
    expect(screen.getByText('Wizard')).toBeInTheDocument()
  })

  it('calls onSelect with the chosen class slug', async () => {
    const onSelect = vi.fn()
    render(<CharacterSelect classDefs={classDefs} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: /wizard/i }))
    expect(onSelect).toHaveBeenCalledWith('wizard')
  })
})

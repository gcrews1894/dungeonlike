import { describe, it, expect } from 'vitest'
import { resolveAttack, resolveHeal } from './combat'
import type { RNG } from './dice'

function forceRoll(sides: number, roll: number): number {
  return (roll - 0.5) / sides
}

function sequenceRng(values: number[]): RNG {
  const queue = [...values]
  return () => {
    const next = queue.shift()
    if (next === undefined) throw new Error('sequenceRng exhausted')
    return next
  }
}

describe('resolveAttack', () => {
  it('misses when the attack roll plus bonus is below target AC', () => {
    const rng = sequenceRng([forceRoll(20, 5)]) // 5 + 4 = 9, below AC 15
    const result = resolveAttack('Fighter', 'Goblin', 4, 15, '1d8', 2, 'slashing', rng)
    expect(result.hit).toBe(false)
    expect(result.damage).toBe(0)
  })

  it('hits and rolls damage when the attack meets AC', () => {
    const rng = sequenceRng([forceRoll(20, 15), forceRoll(8, 6)]) // 15+4=19 hits AC 15; damage 6+2=8
    const result = resolveAttack('Fighter', 'Goblin', 4, 15, '1d8', 2, 'slashing', rng)
    expect(result.hit).toBe(true)
    expect(result.critical).toBe(false)
    expect(result.damage).toBe(8)
  })

  it('always misses on a natural 1, even against a trivial AC', () => {
    const rng = sequenceRng([forceRoll(20, 1)])
    const result = resolveAttack('Fighter', 'Goblin', 20, 1, '1d8', 2, 'slashing', rng)
    expect(result.hit).toBe(false)
  })

  it('always hits and doubles damage dice on a natural 20', () => {
    const rng = sequenceRng([forceRoll(20, 20), forceRoll(8, 3), forceRoll(8, 5)])
    const result = resolveAttack('Fighter', 'Goblin', -10, 30, '1d8', 2, 'slashing', rng)
    expect(result.hit).toBe(true)
    expect(result.critical).toBe(true)
    expect(result.damage).toBe(3 + 5 + 2)
  })

  it('adds bonus damage dice when provided (e.g. Sneak Attack)', () => {
    const rng = sequenceRng([forceRoll(20, 15), forceRoll(8, 6), forceRoll(6, 4)])
    const result = resolveAttack('Rogue', 'Goblin', 4, 15, '1d8', 2, 'piercing', rng, '1d6')
    expect(result.damage).toBe(6 + 2 + 4)
  })
})

describe('resolveHeal', () => {
  it('rolls heal dice plus bonus and names the ability in the log', () => {
    const rng = sequenceRng([forceRoll(10, 7)])
    const result = resolveHeal('Fighter', 'Second Wind', '1d10', 1, rng)
    expect(result.amount).toBe(8)
    expect(result.log).toContain('Second Wind')
  })
})

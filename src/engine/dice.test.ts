import { describe, it, expect } from 'vitest'
import { rollDie, rollDice, rollD20, mulberry32 } from './dice'

describe('rollDie', () => {
  it('returns a value derived from the given rng', () => {
    const rng = () => 0.5 // floor(0.5*6)+1 = 4
    expect(rollDie(6, rng)).toBe(4)
  })

  it('never returns less than 1 or more than sides', () => {
    expect(rollDie(6, () => 0)).toBe(1)
    expect(rollDie(6, () => 0.9999)).toBe(6)
  })
})

describe('rollDice', () => {
  it('sums multiple dice using notation like "2d6"', () => {
    const values = [0.5, 0.5] // each d6 -> 4
    let i = 0
    const rng = () => values[i++]
    expect(rollDice('2d6', rng)).toBe(8)
  })

  it('throws on invalid notation', () => {
    expect(() => rollDice('nonsense', () => 0)).toThrow()
  })
})

describe('rollD20', () => {
  it('rolls between 1 and 20', () => {
    expect(rollD20(() => 0)).toBe(1)
    expect(rollD20(() => 0.9999)).toBe(20)
  })
})

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect(a()).toBe(b())
    expect(a()).toBe(b())
  })

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(1)
    for (let i = 0; i < 20; i++) {
      const value = rng()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

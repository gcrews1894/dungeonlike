import { describe, it, expect } from 'vitest'
import monsters from './monsters.json'
import classes from './classes.json'
import items from './items.json'

describe('monsters.json', () => {
  it('has exactly the expected monsters', () => {
    const slugs = monsters.map((m) => m.slug).sort()
    expect(slugs).toEqual(['giant-rat', 'goblin', 'kobold', 'orc', 'skeleton'])
  })

  it('every monster has a positive AC/HP and a valid attack', () => {
    for (const monster of monsters) {
      expect(monster.armorClass).toBeGreaterThan(0)
      expect(monster.maxHp).toBeGreaterThan(0)
      expect(monster.attack.kind).toBe('attack')
      expect(monster.attack.damageDice).toMatch(/^\d+d\d+$/)
    }
  })
})

describe('classes.json', () => {
  it('has exactly the expected classes', () => {
    const slugs = classes.map((c) => c.slug).sort()
    expect(slugs).toEqual(['fighter', 'rogue', 'wizard'])
  })

  it('every class has positive HP/AC and a valid attack + ability', () => {
    for (const cls of classes) {
      expect(cls.maxHp).toBeGreaterThan(0)
      expect(cls.armorClass).toBeGreaterThan(0)
      expect(cls.attack.damageDice).toMatch(/^\d+d\d+$/)
      expect(['attack', 'heal']).toContain(cls.ability.kind)
    }
  })
})

describe('items.json', () => {
  it('has at least one healing item', () => {
    expect(items.some((i) => i.effect.kind === 'heal')).toBe(true)
  })
})

// One-time regeneration tool for src/data/monsters.json.
// Requires network access to https://api.open5e.com. Run manually:
//   npm run fetch-data
// src/data/classes.json is hand-authored from 5e SRD level-1 rules, not
// fetched: open5e's class endpoint returns prose (equipment, features)
// rather than structured combat stats, so there is nothing mechanical to
// normalize automatically.

import { writeFileSync } from 'node:fs'

const MONSTER_SLUGS = ['goblin', 'skeleton', 'giant-rat', 'kobold', 'orc'] as const

const GLYPHS: Record<string, string> = {
  goblin: 'g',
  skeleton: 's',
  'giant-rat': 'r',
  kobold: 'k',
  orc: 'o',
}

const PRIMARY_ATTACK_NAME: Record<string, string> = {
  goblin: 'Scimitar',
  skeleton: 'Shortsword',
  'giant-rat': 'Bite',
  kobold: 'Dagger',
  orc: 'Greataxe',
}

const DAMAGE_TYPE: Record<string, string> = {
  goblin: 'slashing',
  skeleton: 'piercing',
  'giant-rat': 'piercing',
  kobold: 'piercing',
  orc: 'slashing',
}

type Open5eMonster = {
  name: string
  armor_class: number
  hit_points: number
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  challenge_rating: string
  actions: { name: string; attack_bonus: number; damage_dice: string; damage_bonus: number }[]
}

async function fetchMonster(slug: string) {
  const response = await fetch(`https://api.open5e.com/v1/monsters/?slug=${slug}`)
  const data = (await response.json()) as { results: Open5eMonster[] }
  const result = data.results[0]
  if (!result) throw new Error(`No monster found for slug: ${slug}`)
  const action = result.actions.find((a) => a.name === PRIMARY_ATTACK_NAME[slug])
  if (!action) throw new Error(`Could not find primary attack for ${slug}`)
  return {
    slug,
    name: result.name,
    glyph: GLYPHS[slug],
    armorClass: result.armor_class,
    maxHp: result.hit_points,
    abilityScores: {
      str: result.strength,
      dex: result.dexterity,
      con: result.constitution,
      int: result.intelligence,
      wis: result.wisdom,
      cha: result.charisma,
    },
    challengeRating: result.challenge_rating,
    attack: {
      kind: 'attack' as const,
      name: action.name,
      attackBonus: action.attack_bonus,
      damageDice: action.damage_dice,
      damageBonus: action.damage_bonus,
      damageType: DAMAGE_TYPE[slug],
    },
  }
}

async function main() {
  const monsters = []
  for (const slug of MONSTER_SLUGS) {
    monsters.push(await fetchMonster(slug))
  }
  writeFileSync('src/data/monsters.json', JSON.stringify(monsters, null, 2) + '\n')
  console.log(`Wrote ${monsters.length} monsters to src/data/monsters.json`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

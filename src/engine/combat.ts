import { rollD20, rollDice, type RNG } from './dice'

export type AttackResult = {
  hit: boolean
  critical: boolean
  damage: number
  log: string
}

export function resolveAttack(
  attackerName: string,
  targetName: string,
  attackBonus: number,
  targetAc: number,
  damageDice: string,
  damageBonus: number,
  damageType: string,
  rng: RNG = Math.random,
  bonusDamageDice?: string
): AttackResult {
  const roll = rollD20(rng)

  if (roll === 1) {
    return {
      hit: false,
      critical: false,
      damage: 0,
      log: `${attackerName} attacks ${targetName} and rolls a natural 1 — a miss.`,
    }
  }

  const critical = roll === 20
  const total = roll + attackBonus

  if (!critical && total < targetAc) {
    return {
      hit: false,
      critical: false,
      damage: 0,
      log: `${attackerName} attacks ${targetName} (${total} vs AC ${targetAc}) — miss.`,
    }
  }

  let damage = rollDice(damageDice, rng) + damageBonus
  if (critical) damage += rollDice(damageDice, rng)
  if (bonusDamageDice) damage += rollDice(bonusDamageDice, rng)

  const critText = critical ? ' Critical hit!' : ''
  return {
    hit: true,
    critical,
    damage,
    log: `${attackerName} hits ${targetName} for ${damage} ${damageType} damage.${critText}`,
  }
}

export function resolveHeal(
  actorName: string,
  abilityName: string,
  healDice: string,
  healBonus: number,
  rng: RNG = Math.random
): { amount: number; log: string } {
  const amount = rollDice(healDice, rng) + healBonus
  return { amount, log: `${actorName} uses ${abilityName} and recovers ${amount} HP.` }
}

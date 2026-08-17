export type RNG = () => number

export function rollDie(sides: number, rng: RNG = Math.random): number {
  return Math.floor(rng() * sides) + 1
}

export function rollDice(notation: string, rng: RNG = Math.random): number {
  const match = notation.match(/^(\d+)d(\d+)$/)
  if (!match) throw new Error(`Invalid dice notation: ${notation}`)
  const count = Number(match[1])
  const sides = Number(match[2])
  let total = 0
  for (let i = 0; i < count; i++) {
    total += rollDie(sides, rng)
  }
  return total
}

export function rollD20(rng: RNG = Math.random): number {
  return rollDie(20, rng)
}

export function mulberry32(seed: number): RNG {
  let t = seed
  return function rng() {
    t |= 0
    t = (t + 0x6d2b79f5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

import { useEffect } from 'react'
import type { DungeonState, ItemDefinition, MonsterDefinition, Player } from '../engine/state'

type Props = {
  dungeon: DungeonState
  player: Player
  monsterDefs: MonsterDefinition[]
  itemDefs: ItemDefinition[]
  onMove: (dx: number, dy: number) => void
}

const KEY_TO_DELTA: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  w: [0, -1],
  ArrowDown: [0, 1],
  s: [0, 1],
  ArrowLeft: [-1, 0],
  a: [-1, 0],
  ArrowRight: [1, 0],
  d: [1, 0],
}

function glyphFor(defSlug: string, defs: { slug: string; glyph: string }[]): string {
  return defs.find((d) => d.slug === defSlug)?.glyph ?? '?'
}

export default function DungeonView({ dungeon, player, monsterDefs, itemDefs, onMove }: Props) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const delta = KEY_TO_DELTA[event.key]
      if (delta) onMove(delta[0], delta[1])
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onMove])

  const monsterAt = (x: number, y: number) => dungeon.monsters.find((m) => m.position.x === x && m.position.y === y)
  const itemAt = (x: number, y: number) => dungeon.items.find((i) => i.position.x === x && i.position.y === y)

  const rows = dungeon.grid.map((row, y) =>
    row
      .map((tile, x) => {
        if (player.position.x === x && player.position.y === y) return '@'
        if (dungeon.stairsPosition.x === x && dungeon.stairsPosition.y === y) return '>'
        const monster = monsterAt(x, y)
        if (monster) return glyphFor(monster.defSlug, monsterDefs)
        const item = itemAt(x, y)
        if (item) return glyphFor(item.defSlug, itemDefs)
        return tile === 'wall' ? '#' : '.'
      })
      .join('')
  )

  return (
    <div>
      <pre data-testid="dungeon-grid">{rows.join('\n')}</pre>
      <p>
        HP: {player.hp}/{player.maxHp}
      </p>
      <ul>
        {player.inventory.map((slug, i) => (
          <li key={i}>{itemDefs.find((d) => d.slug === slug)?.name ?? slug}</li>
        ))}
      </ul>
    </div>
  )
}

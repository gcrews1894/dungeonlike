import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DungeonView from './DungeonView'
import type { DungeonState, ItemDefinition, MonsterDefinition, Player, Tile } from '../engine/state'

const grid: Tile[][] = [
  ['wall', 'wall', 'wall'],
  ['wall', 'floor', 'wall'],
  ['wall', 'wall', 'wall'],
]

const dungeon: DungeonState = {
  grid,
  rooms: [{ x: 1, y: 1, width: 1, height: 1 }],
  startPosition: { x: 1, y: 1 },
  stairsPosition: { x: 1, y: 1 },
  monsters: [],
  items: [],
}

const player: Player = {
  classSlug: 'fighter',
  className: 'Fighter',
  abilityScores: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
  hp: 12,
  maxHp: 12,
  ac: 16,
  inventory: [],
  position: { x: 1, y: 1 },
  abilityUsed: false,
}

const monsterDefs: MonsterDefinition[] = []
const itemDefs: ItemDefinition[] = []

describe('DungeonView', () => {
  it('renders the player glyph on the grid', () => {
    render(<DungeonView dungeon={dungeon} player={player} monsterDefs={monsterDefs} itemDefs={itemDefs} onMove={() => {}} />)
    expect(screen.getByTestId('dungeon-grid').textContent).toContain('@')
  })

  it('shows current HP', () => {
    render(<DungeonView dungeon={dungeon} player={player} monsterDefs={monsterDefs} itemDefs={itemDefs} onMove={() => {}} />)
    expect(screen.getByText(/12\/12/)).toBeInTheDocument()
  })

  it('calls onMove with the correct delta on arrow key press', () => {
    const onMove = vi.fn()
    render(<DungeonView dungeon={dungeon} player={player} monsterDefs={monsterDefs} itemDefs={itemDefs} onMove={onMove} />)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(onMove).toHaveBeenCalledWith(1, 0)
  })
})

import { describe, it, expect } from 'vitest'
import { createInitialState } from './state'

describe('createInitialState', () => {
  it('starts in character-select mode with no player, dungeon, or battle', () => {
    const state = createInitialState()
    expect(state.mode).toBe('character-select')
    expect(state.player).toBeNull()
    expect(state.dungeon).toBeNull()
    expect(state.battle).toBeNull()
  })
})

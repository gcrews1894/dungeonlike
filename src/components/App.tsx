import { useMemo, useReducer } from 'react'
import classesData from '../data/classes.json'
import monstersData from '../data/monsters.json'
import itemsData from '../data/items.json'
import type { RNG } from '../engine/dice'
import { createInitialState, type ClassDefinition, type ItemDefinition, type MonsterDefinition } from '../engine/state'
import { gameReducer, type EngineAction } from '../engine/actions'
import CharacterSelect from './CharacterSelect'
import DungeonView from './DungeonView'
import BattleView from './BattleView'

const classes = classesData as ClassDefinition[]
const monsters = monstersData as MonsterDefinition[]
const items = itemsData as ItemDefinition[]

type Props = { rng?: RNG }

export default function App({ rng = Math.random }: Props = {}) {
  const [state, dispatch] = useReducer(
    (s: ReturnType<typeof createInitialState>, action: EngineAction) =>
      gameReducer(s, action, { classDefs: classes, monsterDefs: monsters, itemDefs: items }, rng),
    undefined,
    createInitialState
  )

  const classDef = useMemo(() => classes.find((c) => c.slug === state.player?.classSlug), [state.player?.classSlug])
  const monsterDef = useMemo(() => monsters.find((m) => m.slug === state.battle?.monster.defSlug), [state.battle?.monster.defSlug])

  if (state.mode === 'character-select') {
    return <CharacterSelect classDefs={classes} onSelect={(classSlug) => dispatch({ type: 'SELECT_CLASS', classSlug })} />
  }

  if (state.mode === 'exploring' && state.player && state.dungeon) {
    return (
      <DungeonView
        dungeon={state.dungeon}
        player={state.player}
        monsterDefs={monsters}
        itemDefs={items}
        onMove={(dx, dy) => dispatch({ type: 'MOVE', dx, dy })}
      />
    )
  }

  if (state.mode === 'battle' && state.player && state.battle && classDef && monsterDef) {
    return (
      <BattleView
        player={state.player}
        classDef={classDef}
        battle={state.battle}
        monsterDef={monsterDef}
        hasItem={state.player.inventory.length > 0}
        onAction={(choice) => dispatch({ type: 'BATTLE_ACTION', choice })}
      />
    )
  }

  if (state.mode === 'victory') {
    return <h1>You found the stairs down. Victory!</h1>
  }

  if (state.mode === 'game-over') {
    return <h1>You have died.</h1>
  }

  return null
}

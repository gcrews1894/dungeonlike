import type { ClassDefinition } from '../engine/state'

type Props = {
  classDefs: ClassDefinition[]
  onSelect: (classSlug: string) => void
}

export default function CharacterSelect({ classDefs, onSelect }: Props) {
  return (
    <div>
      <h1>Choose your class</h1>
      <ul>
        {classDefs.map((def) => (
          <li key={def.slug}>
            <button onClick={() => onSelect(def.slug)}>{def.name}</button>
            <span>
              {' '}
              HP {def.maxHp} · AC {def.armorClass} · {def.attack.name}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

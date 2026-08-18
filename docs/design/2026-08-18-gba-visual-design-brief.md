# Dungeonlike — Visual Design Brief (16-bit GBA Direction)

**For:** Claude Design
**From:** Product / engineering
**Date:** 2026-08-18
**Status:** Ready for design pass
**Scope:** Visual/UI redesign only. Do not change game rules, engine, or the state machine — this is a re-skin of existing screens.

---

## 1. TL;DR

Dungeonlike is a small, fully-working browser roguelike. The **logic is done; the visuals do not exist yet.** Right now the dungeon is raw ASCII in a `<pre>` tag and every other screen is unstyled HTML (`<h1>`, `<button>`, `<ul>`). We want it to look and feel like a **16-bit Game Boy Advance dungeon-crawler RPG** — think *Golden Sun*, *Fire Emblem*, *Final Fantasy Tactics Advance*, *The Minish Cap*, and *Pokémon Emerald*.

Deliver a cohesive visual system: a locked palette, a pixel type treatment, a reusable "window-box" UI kit, and screen-by-screen layouts for all five game states. Keep it crisp, chunky, warm, and readable — a handheld game you'd play on a bus in 2004, not a modern flat web app.

---

## 2. What the game is (so layouts match reality)

A single run flows through five modes. The renderer switches on `state.mode`:

| Mode | Screen | What's on it today |
|---|---|---|
| `character-select` | **Character Select** | "Choose your class" + 3 class buttons with `HP / AC / attack name` |
| `exploring` | **Dungeon** | 40×20 ASCII grid, HP line, inventory list |
| `battle` | **Battle** | Monster name + HP, player name + HP, 4 action buttons, scrolling combat log |
| `victory` | **Victory** | "You found the stairs down. Victory!" |
| `game-over` | **Game Over** | "You have died." |

**Content the art must cover (this is the whole roster — size the work accordingly):**

- **3 classes:** Fighter (Longsword / Second Wind), Wizard (Fire Bolt / Ray of Frost), Rogue (Rapier / Sneak Attack).
- **5 monsters:** Goblin `g`, Skeleton `s`, Giant Rat `r`, Kobold `k`, Orc `o`.
- **1 item:** Potion of Healing `!`.
- **Dungeon tiles:** wall `#`, floor `.`, stairs-down `>`, player `@`.
- **4 damage types** that want distinct color/icon language: slashing, piercing, fire, cold.

The dungeon grid is **40 tiles wide × 20 tall**. Battles are 1-v-1, turn-based, Pokémon-style, and "animation" is defined in the engine as *sequential log reveal + HP-bar updates* — there is no sprite motion system yet, so any motion you specify is net-new and should be cheap (CSS transforms/keyframes).

---

## 3. Creative North Star

**One-line vision:** *A cozy-but-dangerous SRD dungeon crawl that looks like it shipped on a GBA cartridge.*

**Primary references (steal the UI language from these):**

- **Golden Sun / Golden Sun: The Lost Age** — the gold standard for GBA menu framing, beveled blue window boxes, and battle HUD. This is our closest cousin (turn-based, class-flavored, stat-driven).
- **Fire Emblem (GBA) / FF Tactics Advance** — tile grids, unit info panels, crisp small pixel type over a map. Directly relevant to the Dungeon screen.
- **Pokémon FireRed / Emerald** — the command menu + message box pattern for battles (Attack/Ability/Item/Flee maps 1:1 to Fight/Pkmn/Bag/Run), HP bar drain, damage flash.
- **The Minish Cap / A Link to the Past** — dungeon tile warmth, torch light, readable environment tiles.
- **Advance Wars** — punchy, high-contrast UI chrome and confident color blocking.

**Feeling words:** chunky, tactile, warm torchlight, high-contrast, snappy, legible-at-a-glance, a little grimy, nostalgic.

**Anti-references (do NOT do):** flat modern Material/Tailwind web UI, thin hairline borders, soft drop shadows, gradients-as-decoration, huge whitespace, ultra-thin fonts, emoji as icons, NES-era 8-bit blockiness (we're 16-bit — more colors, more shading, more detail than *Press Start 2P* territory).

---

## 4. Hardware-flavored constraints (as a design language, not literal emulation)

GBA-ness comes from *self-imposed rules*, not from running on real hardware. Adopt these so everything reads as one console:

- **Virtual resolution.** Design to a fixed low-res canvas and integer-scale it up. Native GBA is **240×160 (3:2)**. We should design on a **240×160 grid multiplied to a comfortable 3×–4× (720×480 / 960×640)** so pixels stay square and crisp. All screens live inside this letterboxed "screen"; the surrounding web page is just a dark bezel.
- **Everything is pixel-crisp.** No anti-aliasing on art or type. In CSS: `image-rendering: pixelated` on sprites and the scaled canvas; only integer scale factors. Never blur a pixel.
- **Tile grid.** Backgrounds are built from **8×8 or 16×16 tiles**. Sprites are **16×16** (monsters, items, player, tiles) with **32×32 or 48×48 portraits** for class/enemy hero shots in battle and select.
- **Constrained palette.** Limited, deliberate colors (see §5) — saturated but slightly muted, like a backlit LCD. Dither for gradients instead of smooth blends.
- **Snap, don't glide.** Menu cursors jump tile-to-tile; transitions are wipes/fades, not eased slides. Motion is a few discrete frames, not smooth 60fps tweens (HP-bar drain is the one acceptable continuous tween).

These are aesthetic guardrails, not a request to emulate GBA hardware or ship a `<canvas>` engine. Plain DOM + CSS with a pixel font and pixel-art sprites is the intended implementation (see §11).

---

## 5. Color palette

A dark-fantasy dungeon palette on a warm-neutral chrome. Use these as **design tokens**; exact values are a starting point — tune for LCD-style saturation, but keep the count small and the roles fixed.

### Core UI chrome (the "window box" system)
| Token | Hex | Use |
|---|---|---|
| `--screen-bezel` | `#0b0b12` | Page background around the virtual screen |
| `--panel-fill` | `#243052` | Window-box interior (Golden Sun blue) |
| `--panel-fill-alt`| `#1a2340` | Nested/secondary panel |
| `--panel-hi` | `#5b74b8` | Top/left bevel highlight |
| `--panel-lo` | `#111832` | Bottom/right bevel shadow |
| `--panel-edge` | `#e8ecf8` | 1px outer keyline |
| `--ink` | `#f2f4ff` | Primary text |
| `--ink-dim` | `#9aa6cc` | Secondary/label text |
| `--ink-shadow` | `#0a0e1e` | 1px text drop-shadow (readability over art) |
| `--cursor` | `#ffd23f` | Menu selection pointer ▶ / highlight |

### Dungeon environment
| Token | Hex | Use |
|---|---|---|
| `--floor` | `#3a3550` | Walkable floor tile |
| `--floor-alt` | `#332e48` | Checkerboard variation |
| `--wall` | `#1c1a2b` | Wall tile |
| `--wall-top` | `#2a2740` | Wall top face / bevel |
| `--torch` | `#ffb038` | Torch glow, lit accents |
| `--fog` | `#05060c` | Unexplored / fog-of-war |

### State & feedback
| Token | Hex | Use |
|---|---|---|
| `--hp-high` | `#57d977` | HP bar > 50% |
| `--hp-mid` | `#ffd23f` | HP bar 25–50% |
| `--hp-low` | `#f0523f` | HP bar < 25% |
| `--bar-track` | `#0e1120` | Empty bar backing |
| `--danger` | `#f0523f` | Damage numbers, game-over |
| `--good` | `#57d977` | Heal numbers, victory |
| `--gold` | `#ffd23f` | Rewards, emphasis, stairs |

### Class & damage-type accents (for portraits, icons, spell FX)
| Token | Hex | Applies to |
|---|---|---|
| `--fighter` | `#c8483a` | Fighter (martial red) |
| `--wizard` | `#4f7fe0` | Wizard (arcane blue) |
| `--rogue` | `#63b96b` | Rogue (shadow green) |
| `--dmg-slashing`| `#d7d2c4` | Slashing (steel) |
| `--dmg-piercing`| `#b8c6e0` | Piercing (cold steel-blue) |
| `--dmg-fire` | `#ff7a2f` | Fire |
| `--dmg-cold` | `#7ad4ff` | Cold |

**Contrast rule:** every text/background pairing must clear a legible contrast bar at small pixel sizes. Always pair light `--ink` with a 1px `--ink-shadow` when text sits over dungeon art. Never rely on color alone (see §10 accessibility).

---

## 6. Typography

Two roles, both pixel-crisp:

1. **UI / body pixel font** — small, readable, variable-or-fixed-width, GBA-menu flavored. Recommended: **"m5x7" / "m6x11" (Daniel Linssen), "Pixeloid Sans", "Departure Mono", or "Determination Mono."** These read like console menus at small sizes. *Avoid "Press Start 2P"* — it's NES-blocky and eats space; use it only for a logo accent if at all.
2. **Display / title font** — a heavier pixel face (or the same font scaled up 2×) for the game logo, screen titles ("VICTORY", "YOU DIED"), and menu headers.

**Rules:**
- Render type at its native pixel size or integer multiples only — no fractional scaling, no anti-aliasing (`-webkit-font-smoothing: none` where honored; prefer an actual pixel/bitmap font so it's crisp regardless).
- 1px hard drop-shadow (`--ink-shadow`) on any text over textured/art backgrounds — this is the classic GBA readability trick.
- Numbers matter (HP, damage, AC, dice). Use a **tabular/monospaced** treatment for all stats and combat numbers so they don't jitter as they change.
- Keep line lengths short; message/log boxes wrap like a GBA text window (≈2–3 lines visible, the rest scrolls).

---

## 7. UI component kit (build these once, reuse everywhere)

The whole game is made of a few repeated primitives. Design them as a small system.

### 7.1 Window Box (the hero component)
The beveled panel that frames every menu, stat block, and message. Nine-slice friendly:
- Outer 1px keyline (`--panel-edge`), then a chunky **2–3px double bevel**: highlight on top/left (`--panel-hi`), shadow on bottom/right (`--panel-lo`), fill `--panel-fill`.
- Squared corners (optionally a 2px corner notch/ornament for the "fancy" variant used on titles).
- Two weights: **standard** (menus, stat blocks) and **message** (combat log / dialog, slightly darker fill).

### 7.2 Menu list + cursor
- Vertical list of options in a Window Box.
- Selected row marked by a blinking **`▶` gold cursor** (`--cursor`) in a fixed left gutter; the row does not move, the cursor does.
- Support keyboard (arrows/WASD + Enter — the game already listens to arrows/WASD) and click/tap. Hover = same highlight as cursor.

### 7.3 HP bar
- Segmented or smooth fill inside a recessed `--bar-track` groove with a 1px dark border.
- Color shifts by threshold: `--hp-high` → `--hp-mid` → `--hp-low`.
- **Drains** with a short tween (~300–500ms) when HP changes — the one continuous animation we want. Numeric `cur/max` in tabular type beside it.

### 7.4 Stat block chip
- Compact readout for a combatant: name, HP bar, AC shield icon + number, class/monster tag. Used in Battle (both sides) and Character Select cards.

### 7.5 Command menu (battle)
- 2×2 grid of the four actions inside a Window Box: **Attack** (class attack name, e.g. "Longsword"), **Ability** (e.g. "Second Wind" — greys out when `abilityUsed`), **Item** (greys out with empty inventory), **Flee**. Disabled = desaturated + no cursor stop.

### 7.6 Message / log window
- Bottom-anchored Window Box that reveals combat-log lines with a short character-crawl, GBA text-box style. Keep the last few lines; older lines scroll up. A small ▼ "more" blink when text is waiting.

### 7.7 Buttons / prompts
- Primary action = Window-Box button with bevel + cursor affordance. Secondary/"press any key" prompts = blinking `--cursor` hint text.

### 7.8 Icon set (16×16 pixel icons)
- **AC** = kite shield. **HP** = heart/potion. **Dice** for damage rolls. **Damage-type glyphs:** slash arc, arrow/point, flame, snowflake — tinted per §5. **Stairs-down** marker. **Item** = potion bottle.

---

## 8. Screen-by-screen direction

For each: current state → target. Keep the same information; upgrade the presentation.

### 8.1 Title / Boot screen (NEW — recommended)
There's no title screen today; the app drops straight into Character Select. Add a short **title card**: pixel logo "DUNGEONLIKE," a dim tiled dungeon backdrop with a flickering torch, and a blinking `▶ PRESS START` prompt that advances to Character Select. Optional: a subtle palette-cycled torch flame. Low effort, huge tone-setter. *(If out of scope, fold the logo into the top of Character Select.)*

### 8.2 Character Select
- **Now:** "Choose your class" heading + 3 text buttons.
- **Target:** Header in a title Window Box. Three **class cards** side by side (or a vertical menu with a detail panel — Fire Emblem unit-info style). Each card: **class portrait (32–48px pixel bust)** tinted to its accent (`--fighter/--wizard/--rogue`), class name, and a stat block chip showing **HP, AC, attack name, ability name**. The focused card gets the gold cursor + a raised/selected bevel and reveals a one-line flavor + full stat readout in a side panel. Confirm advances to the dungeon.

### 8.3 Dungeon (exploring)
- **Now:** 40×20 ASCII in a `<pre>`; `@ # . > g s r k o !`.
- **Target:** A **tile-rendered map** on the virtual screen. Replace each glyph with a 16×16 tile/sprite:
  - `#` wall → dark stone wall tile with a lit top face (`--wall` / `--wall-top`), occasional variation tiles (cracks, moss, torch sconce with `--torch` glow).
  - `.` floor → flagstone floor with a subtle 2-tone checker (`--floor` / `--floor-alt`).
  - `@` player → class-colored adventurer sprite (idle bob optional).
  - monsters `g/s/r/k/o` → their 16×16 monster sprites (idle).
  - `!` item → potion sprite with a soft glint.
  - `>` stairs-down → glowing gold stairwell (`--gold`), clearly the goal.
- **Camera:** the 40×20 map is wider than the 240px virtual screen (which fits ~15 tiles at 16px). **Center the camera on `@` and scroll**, or scale tiles down to fit — designer's call; a scrolling camera reads far more "GBA dungeon." 
- **Fog of war (recommended):** unexplored tiles = `--fog`; a soft torch-radius light around the player. Adds mood and focus cheaply.
- **HUD overlay:** a small bottom or corner Window Box with the player's **HP bar + inventory** (potion icons). Keep it out of the play area.

### 8.4 Battle
The marquee screen. Golden Sun / Pokémon layout:
- **Enemy** upper area: large **monster portrait/sprite** (48–64px) over a dungeon-tinted backdrop, with a stat chip (name, HP bar, AC) top-corner.
- **Player** lower area: class portrait/sprite + stat chip (name, HP bar, AC) bottom-corner.
- **Command menu** (§7.5): 2×2 Window Box, bottom-right.
- **Message/log window** (§7.6): bottom-wide Window Box that plays back the combat log line-by-line ("You hit the Goblin for 6 damage.").
- **Feedback FX (net-new, keep cheap with CSS):**
  - **Damage flash** — target sprite flashes white/red for ~1–2 frames on hit.
  - **Screen shake** — a few px shake on a heavy/crit hit.
  - **Floating damage number** — `--danger` for damage, `--good` for heals, rises and fades. Tabular pixel digits.
  - **HP-bar drain** tween on both bars.
  - **Miss** — a small "MISS" tag; **flee** — a quick fade/dash-out.
  - Spell/attack accent uses the **damage-type color** (fire = `--dmg-fire`, cold = `--dmg-cold`, etc.).

### 8.5 Victory
- **Now:** plain "You found the stairs down. Victory!"
- **Target:** Full-screen **"VICTORY"** in the display font (gold, `--good`/`--gold`), warm lit backdrop, the player sprite over the glowing stairs, a fanfare-style Window Box with a one-line result and a blinking `▶ PLAY AGAIN` prompt.

### 8.6 Game Over
- **Now:** plain "You have died."
- **Target:** Desaturated/darkened screen, **"YOU DIED"** in the display font (`--danger`), a tombstone or fallen-adventurer sprite, and a `▶ TRY AGAIN` prompt. Classic somber GBA death card.

---

## 9. Motion & feel

Cheap, discrete, snappy. Nothing here needs a game engine — CSS keyframes/transitions cover all of it.

- **Screen transitions:** hard cut or a 4–6 frame **fade/wipe** (e.g., a pixel-dissolve or a curtain) between modes. No smooth slides.
- **Cursor:** blink at ~2Hz; instant tile-to-tile jumps.
- **Text:** log/dialog reveals ~30–60 chars/sec with a click-y cadence; the whole line snaps in on keypress (skip).
- **HP bars:** the one continuous tween (~300–500ms ease-out drain).
- **Idle life:** optional 2-frame idle bob on the player/monster sprites, torch flicker via palette swap.
- **Hits:** flash + shake + floating number, all ≤300ms. Keep combat feeling responsive, not cinematic.

Respect `prefers-reduced-motion`: drop shake/flash/crawl to instant states.

---

## 10. Accessibility & legibility

- **Contrast:** all text over UI panels and over dungeon art must stay legible at 3×–4× scale. Use the 1px `--ink-shadow` outline trick on art-backed text.
- **Never color-alone:** HP thresholds also change nothing structurally, so pair them with the numeric `cur/max`. Damage types carry an **icon shape** (slash/point/flame/snowflake), not just a hue — covers color-blind players.
- **Focus is always visible:** the gold cursor + selected-bevel must clearly mark the current menu item for keyboard players (arrows/WASD + Enter already wired).
- **Scalable, not tiny:** integer-scale the whole virtual screen up so pixels stay crisp on high-DPI displays; don't ship a 240px screen at 1×.
- **Input parity:** every action works by keyboard AND pointer/tap.

---

## 11. Implementation notes (for whoever builds the pass)

Keep the engine untouched — this is a rendering-layer change in `src/components/*` plus CSS/assets. Suggested approach:

- **Stack:** React 18 + Vite + TypeScript (already in place). No new game framework needed. Plain DOM + CSS Grid for the tile map is fine at this size; a `<canvas>` layer is optional and only worth it if the scrolling camera + FX get heavy.
- **Virtual screen:** one fixed-aspect container (240×160 design units) integer-scaled via CSS `transform: scale()` / container queries; the page background is the bezel.
- **Pixel crispness:** `image-rendering: pixelated;` on sprites and the scaled root; integer scale factors only; disable font smoothing / use a bitmap-style webfont.
- **Design tokens:** put the §5 palette in CSS custom properties (`:root { --panel-fill: … }`) so the whole kit is themeable and consistent. One `theme.css`.
- **Sprites:** a small **sprite sheet** (16×16 tiles/monsters/items, 32–48px portraits) referenced by glyph. The existing data already carries a `glyph` per monster/item — map glyph → sprite index so the renderer stays data-driven (no engine change). Player sprite keys off class slug; portraits key off class/monster slug.
- **Fonts:** self-host the chosen pixel font (`@font-face`), preload it, and set a pixel-friendly fallback so first paint isn't a system serif.
- **Component mapping:** `CharacterSelect.tsx`, `DungeonView.tsx`, `BattleView.tsx`, and the victory/game-over branches in `App.tsx` each get the treatment in §8. The Window Box, HP bar, menu+cursor, and message window from §7 become shared components.
- **Keep tests green:** components currently expose `data-testid="dungeon-grid"` and `data-testid="battle-log"` and rely on button text (class attack/ability names, "Item", "Flee"). Preserve those testids and accessible button names, or update tests in lockstep. Don't break the reducer contract.

---

## 12. Do / Don't

**Do**
- Frame everything in beveled Window Boxes; make chrome feel physical.
- Commit to a small, saturated, LCD-flavored palette and reuse it religiously.
- Keep pixels square and crisp at every scale.
- Make HP, damage, and stats read instantly and animate satisfyingly.
- Add torchlight, mood, and a little grime.

**Don't**
- Ship flat modern web UI, thin borders, soft shadows, or gradient decoration.
- Use emoji, system fonts, or anti-aliased "smooth" scaling.
- Go full NES/8-bit blocky (we're 16-bit — richer shading, more colors).
- Rely on color alone for HP/damage-type meaning.
- Touch game rules, dice math, or the state machine.

---

## 13. Deliverables checklist for the design pass

- [ ] Locked color palette (tokens, §5) + `theme.css`
- [ ] Chosen + self-hosted pixel font(s), body + display
- [ ] Window Box, menu+cursor, HP bar, stat chip, command menu, message window (§7)
- [ ] 16×16 tile set: wall (+ variants), floor (+ alt), stairs, fog
- [ ] Sprites: player (×3 class tints), 5 monsters, potion, + 16×16 icon set (AC/HP/dice/4 damage types)
- [ ] Portraits: 3 classes, 5 monsters (battle + select busts)
- [ ] Screen comps: Title (opt), Character Select, Dungeon, Battle, Victory, Game Over (§8)
- [ ] Motion spec applied: transitions, cursor blink, HP drain, hit flash/shake/floating numbers (§9)
- [ ] Accessibility check: contrast, non-color-coded meaning, visible focus (§10)

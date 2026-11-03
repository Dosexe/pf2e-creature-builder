# Changelog

All notable changes to the PF2E Creature Builder module are documented here.

---

## Unreleased

### Added

- **Manual Input** — With **Show Bonuses** on, a Manual Input checkbox edits the bonus badges. `5` and `+5` both save as `+5`. Only a leading minus is negative. Hit Points, Armor Class, and spell DC stay unsigned.
- Strike damage opens an editor for dice count, die (`d4` through `d12`), and bonus. Each die in the list has a dice icon, and the chosen icon sits to the left of the field. The panel stays inside the window and closes if the form scrolls.
- Lore skills and extra attacks have the same badges. A saved value snaps the nearby tier to the closest creature-building option, and Submit uses the typed value until the level changes or a roadmap replaces that stat. Turning Manual Input or Show Bonuses off, or Reset, clears those edits.
- Changing the level replaces a typed value with the detected tier's table value at the new level. A roadmap still clears edits on the stats it sets. Lore skills and extra attacks keep their detected tiers and scale to that tier's value for the current level.
- Typed values and the Manual Input checkbox stay when the form re-renders.
- **Size** — A Size menu sets the creature size. The built-in choices are Tiny, Small, Medium, Large, Huge, and Gargantuan. When `CONFIG.PF2E.actorSizes` is present, that list is used instead.


## 3.0.0 SF2e support

### Added

- **Starfinder 2e** — The module also runs on `sf2e` 1.0.0 or newer. Creature-role roadmaps are shared. Class roadmaps are Envoy, Mystic, Operative, Solarian, Soldier (Class), and Witchwarper. Skills add Computers and Piloting.
- **Extreme hit points** — Hit Points gain an `Extreme` option, one step above `High`. A creature above the High band is detected as Extreme.

### Fixed

- A creature saved from the builder sets its prototype token name to the creature name.

## 2.1.0 Weapons generate attacks support

### Changed

- **Foundry Application V2** — The creature builder window uses Foundry's Application V2. The **Use Classic UI** setting is removed, and the modern layout is the only form.
- The window can be resized. Closing it removes its listeners and the traits dropdown. Two open builder windows no longer edit each other's fields or toggles.
- The form keeps its scroll position, dropdown choices, and dropped items when it re-renders. The window title uses the translated form title.
- Add Lore and Reset use the window's own actions. Clicking the Traits label focuses the traits field and opens its suggestions.
- Form controls follow Foundry's field style. The name sits on the same line as its input, Level, Roadmap, and the other selects share one size, and Spell List uses that same row. Headings are smaller than the old titles and still larger than the field text.
- Stat dropdowns stay readable on Foundry's dark theme, including Moderate ability scores and defense. The drop zone, its hint, and the preview use the theme's text and border colors.

### Fixed

- Dropping an item that is already on the form shows "This item has already been added" instead of a translation key.
- If one dropped item, lore skill, or the spellcasting step cannot be created, the actor is still saved and the remaining items are added.

## 2.0.0 — Modern UI

### New Features

- **New Form Layout** — Completely redesigned form with a compact stat grid and two-column layout.

- **Live Preview Sidebar** — A sticky sidebar on the right side of the form displays real-time computed values for all core stats (HP, AC, Perception, saves, attack, damage, Spell DC) and ability score modifiers. Updates instantly on any change to level, roadmap, or stat dropdowns. Spell DC is hidden when spellcasting is set to "None".

- **Color-Coded Stat Highlights** — Stat dropdowns and preview entries are color-coded by option level (Extreme = dark green, High = light green, Moderate = neutral, Low = light orange, Terrible = orange, Abysmal = red, None = gray).

- **Inline Bonus Badges** — Each stat dropdown shows a small numeric badge with the computed value for the current level and option (e.g. `+7`, `18`, `2d8+9`). Toggle visibility with the **Show Bonuses** checkbox at the top of the form.

- **Drag-and-Drop Items & Actions** — A collapsible drop zone at the bottom of the form accepts items dragged from Foundry compendiums or the sidebar. Supported types: weapons, armor, shields, equipment, treasure, ammo, containers, consumables, actions, feats, conditions, lore, and spells. Items are applied to the actor on form submit.

- **Item Deduplication** — Stackable items (weapons, equipment, consumables, etc.) can be added multiple times. Unique items (spells, actions, feats, conditions, lore) are deduplicated by source UUID. Spell deduplication also considers spell level, allowing the same spell at different heightened levels.

# Changelog

All notable changes to the PF2E Creature Builder module are documented here.

---

## 2.0.0 — Modern UI

### New Features

- **New Form Layout** — Completely redesigned form with a compact stat grid and two-column layout. The new UI is the default; switch back to the classic layout via the **Use Classic UI** module setting.

- **Live Preview Sidebar** — A sticky sidebar on the right side of the form displays real-time computed values for all core stats (HP, AC, Perception, saves, attack, damage, Spell DC) and ability score modifiers. Updates instantly on any change to level, roadmap, or stat dropdowns. Spell DC is hidden when spellcasting is set to "None".

- **Color-Coded Stat Highlights** — Stat dropdowns and preview entries are color-coded by option level (Extreme = dark green, High = light green, Moderate = neutral, Low = light orange, Terrible = orange, Abysmal = red, None = gray).

- **Inline Bonus Badges** — Each stat dropdown shows a small numeric badge with the computed value for the current level and option (e.g. `+7`, `18`, `2d8+9`). Toggle visibility with the **Show Bonuses** checkbox at the top of the form.

- **Drag-and-Drop Items & Actions** — A collapsible drop zone at the bottom of the form accepts items dragged from Foundry compendiums or the sidebar. Supported types: weapons, armor, shields, equipment, treasure, ammo, containers, consumables, actions, feats, conditions, lore, and spells. Items are applied to the actor on form submit.

- **Item Deduplication** — Stackable items (weapons, equipment, consumables, etc.) can be added multiple times. Unique items (spells, actions, feats, conditions, lore) are deduplicated by source UUID. Spell deduplication also considers spell level, allowing the same spell at different heightened levels.

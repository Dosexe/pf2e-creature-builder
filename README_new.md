![Build](https://img.shields.io/github/actions/workflow/status/Dosexe/pf2e-creature-builder/build.yml) ![Release](https://img.shields.io/github/v/release/Dosexe/pf2e-creature-builder) ![FoundryVtt](https://img.shields.io/badge/foundry_vtt_module-orange?logo=foundryvirtualtabletop&logoColor=black)

# PF2E Creature Builder

The first version was forked from the [pf2e-monster-maker](https://github.com/mikolajg-tt/pf2e-monster-maker). Thanks to the creator **mikolajg-tt** for the solid foundation and great work on the original module.
Current version is a rework of the original idea.

**Install:** `https://github.com/dosexe/pf2e-creature-builder/releases/latest/download/module.json`

A Foundry VTT module for the Pathfinder 2E system that lets you create combat NPCs from scratch or from an existing creature, using values from the [PF2E Building Creatures Guide](https://2e.aonprd.com/Rules.aspx?ID=995).

### Key Features

- All official roadmaps from the [Pathfinder 2e rules](https://2e.aonprd.com/Rules.aspx?ID=2919)
- Build from an existing creature — inherits attributes, skills, traits, and spellcasting
- Lore skills, traits, and full spellcasting support
- Support of spellcasting
- Custom roadmaps [BETA] (see [ROADMAPS.md](ROADMAPS.md))
- **UI 2.0** has live preview, drag-and-drop of items and color-coded stats

---

## Getting Started

You can create a blank NPC or start with an existing one.

When starting from an **existing creature**, the new creature **inherits all data** from the base creature (attributes, skills, lore, traits, spellcasting). The only elements **not inherited** are strikes — those are replaced by the values you set in the form.

If the resulting creature is a **spellcaster of a higher level** than the base, the module automatically grants additional spell slots:
- **Prepared** casters use the wizard table ([Wizard Class](https://2e.aonprd.com/Classes.aspx?ID=39))
- **Spontaneous** casters use the sorcerer table ([Sorcerer Class](https://2e.aonprd.com/Classes.aspx?ID=62))

### Accessing the Creature Builder

- **From an NPC sheet:** Click the **Creature Builder** button in the title bar
- **From the Actors sidebar:** Click the **Creature Builder** button in the footer to start from a blank NPC

Inside the builder you can select an official **roadmap** (which auto-fills stats for a monster archetype) or manually adjust every dropdown. All values default to `moderate` at level `-1`.

Click **Submit** to generate the creature. Click **Reset to Defaults** to clear all changes.

---

## UI 2.0 — Modern Form

The modern UI is the **default**. If you prefer the original layout, enable **Use Classic UI** in Module Settings.

### Form Layout

The form is split into two areas:

| Left — Main Form                                                                 | Right — Live Preview                                                    |
|----------------------------------------------------------------------------------|-------------------------------------------------------------------------|
| All stat dropdowns, traits, lore skills, items/actions, and submit/reset buttons | A sticky sidebar showing computed stat values that updates in real time |

Each stat section (Ability Scores, Defence + Perception, Strikes, Spellcasting, Skills) is **collapsible** — click the section header to expand or collapse. Skills and Lore Skills are collapsed by default.

### Compact Stat Grid

Stats are displayed in a compact grid with abbreviated labels. Each dropdown has a **bonus badge** next to it showing the computed numeric value for the current level and option.

```
STR [Extreme v] +7    DEX [High v] +5    CON [Moderate v] +4
INT [Low v]     +1    WIS [Moderate v] +4 CHA [High v]     +5
```

Use the **Show Bonuses** toggle at the top of the form to hide or show the bonus badges.

### Color-Coded Stat Highlights

Every stat dropdown and preview entry is color-coded based on the selected option:

| Option   | Color                 |
|----------|-----------------------|
| Extreme  | Dark green            |
| High     | Light green           |
| Moderate | Neutral (transparent) |
| Low      | Light orange          |
| Terrible | Orange                |
| Abysmal  | Red                   |
| None     | Gray                  |

Colors use semi-transparent values and work with both light and dark Foundry themes.

### Live Preview Sidebar

The right sidebar shows a live summary of the creature's stats. It updates instantly when you change any dropdown, the creature level, or the roadmap. The preview includes:

- **Title** — "Preview"
- **Roadmap + Level** — e.g. "Magical Striker lvl 12"
- **Ability Scores** — STR, DEX, CON, INT, WIS, CHA with modifiers
- **Core Stats** — HP, AC, Perception, Fortitude, Reflex, Will, Attack, Damage, Spell DC

Spell DC is hidden automatically when spellcasting is set to "None".

### Drag-and-Drop Items & Actions

The **Items / Actions** section at the bottom of the form is a drop zone where you can drag items directly from Foundry compendiums or the sidebar. Supported item types:

| Category    | Types                                                          |
|-------------|----------------------------------------------------------------|
| Equipment   | Weapons, armor, shields, equipment, treasure, ammo, containers |
| Consumables | Potions, scrolls, wands, and other consumables                 |
| Abilities   | Actions, feats, conditions                                     |
| Spells      | Any spell (linked to the spellcasting entry on submit)         |
| Skills      | Lore items                                                     |

**Deduplication rules:**
- Stackable items (weapons, equipment, consumables, etc.) can be added multiple times
- Unique items (spells, actions, feats, conditions, lore) are deduplicated — dropping the same one again is ignored
- For spells, deduplication also considers the spell level, so the same spell at different levels is allowed

Dropped spells are automatically **linked to the creature's spellcasting entry** when the form is submitted.

### Module Settings

| Setting                         | Default | Description                                           |
|---------------------------------|---------|-------------------------------------------------------|
| **Use Classic UI**              | Off     | Switch back to the original single-column form layout |
| **Abbreviate Creature Builder** | Off     | Show "CB" instead of "Creature Builder" on NPC sheets |

---

## Classic UI

The classic UI is the original form layout from earlier versions. All features (roadmaps, traits, lore, spellcasting) work the same way — the only difference is the visual layout. The classic UI does not include the live preview sidebar, drag-and-drop zone, color highlights, or bonus badges.

Below are images of the classic form:

![Page One of The Form](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/PageOne.png?raw=true)

![Page Two of The Form](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/PageTwo.png?raw=true)

![Traits](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/TraitsSection.png?raw=true)

![Lore Section](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/LoreSection.png?raw=true)

![Full UI Size](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/FullUIImage.png?raw=true)

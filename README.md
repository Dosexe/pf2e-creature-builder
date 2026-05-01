![Build](https://img.shields.io/github/actions/workflow/status/Dosexe/pf2e-creature-builder/build.yml) ![Release](https://img.shields.io/github/v/release/Dosexe/pf2e-creature-builder) ![FoundryVtt](https://img.shields.io/badge/foundry_vtt_module-orange?logo=foundryvirtualtabletop&logoColor=black) ![FoundryVersion](https://img.shields.io/badge/V14-green?logo=foundryvirtualtabletop&logoColor=black)

# Foundry VTT PF2e Creature Builder

The first version was forked from the [pf2e-monster-maker](https://github.com/mikolajg-tt/pf2e-monster-maker). Thanks to the creator **mikolajg-tt** for the solid foundation and great work on the original module.
Current version is a rework of the original idea.

**Install:** `https://github.com/dosexe/pf2e-creature-builder/releases/latest/download/module.json`

A Foundry VTT module for the Pathfinder 2E system that lets you create NPCs from scratch or from an existing creature, using values from the [PF2E Building Creatures Guide](https://2e.aonprd.com/Rules.aspx?ID=995).

### Key Features

- Support for all official roadmaps from the [Pathfinder 2e rules](https://2e.aonprd.com/Rules.aspx?ID=2919)
- Build from an existing creature — inherits attributes, skills, traits, and spellcasting
- Lore skills, traits, and full spellcasting support
- Support for themed spell lists
- Custom roadmaps [BETA] (see [ROADMAPS.md](ROADMAPS.md))
- Live preview, drag-and-drop of items and color-coded stats

## Getting Started

To use the **Creature Builder**, you can create a blank NPC or start with an existing one.
When starting from an **existing creature**, the new creature will **inherit all data** from the base creature, including:
- Attributes and statistics
- Skills and Lore skills
- Traits
- Spellcasting (if present)

The only elements that are **not inherited** are **all strike-related data**.  
Strikes are replaced using the values provided in the Creature Builder form.

If the resulting creature is a **spellcaster of a higher level than the base creature**, the module will automatically grant additional spell slots:
- **Prepared spellcasters** receive spell slots based on the **wizard spellcasting table**, for more info see [Wizard Class](https://2e.aonprd.com/Classes.aspx?ID=39)
- **Spontaneous spellcasters** receive spell slots based on the **sorcerer spellcasting table**, for more info see [Sorcerer Class](https://2e.aonprd.com/Classes.aspx?ID=62)
- For spellcaster it is also possible to choose a specific themed spell list (see [Themed Spell Lists](https://2e.aonprd.com/Rules.aspx?ID=3383)), which will automatically assign spells according to the creature level.

### Accessing the Creature Builder

- **From an NPC sheet:** Click the **Creature Builder** button in the title bar
- **From the Actors sidebar:** Click the **Creature Builder** button in the footer to start from a blank NPC

Inside the builder, you can:
- Select one of the official **roadmaps**, which automatically sets values appropriate for a given monster type
- Or manually create a unique creature by adjusting any of the available drop-down menus

By default:
- All values are set to `moderate`
- The creature level is set to `-1`, meaning the creature has no inherent strengths or weaknesses

If you plan to customize values manually rather than using a roadmap, consult the [PF2e Official Creature Building Guide](https://2e.aonprd.com/Rules.aspx?ID=995) to ensure the creature remains balanced.

Once all values are set, click the **Submit** button. This will generate a new creature and automatically open its sheet.

If you want to start over at any time, click **Reset to Defaults**, which will clear all changes made in the form.

---

## UI 2.0 — Modern Form

The modern UI is the **default**. If you prefer the original layout, enable **Use Classic UI** in Module Settings.

### Form Layout

The form is split into two areas:

| Left — Main Form                                                                 | Right — Live Preview                                                    |
|----------------------------------------------------------------------------------|-------------------------------------------------------------------------|
| All stat dropdowns, traits, lore skills, items/actions, and submit/reset buttons | A sticky sidebar showing computed stat values that updates in real time |

Each stat section (Ability Scores, Defence + Perception, Strikes, Spellcasting, Skills) is **collapsible** — click the section header to expand or collapse. **Skills** and **Lore Skills** are collapsed by default.

### Stat Grid

Stats are displayed in a grid with abbreviated labels. Each dropdown has a **bonus badge** next to it showing the computed numeric value for the current level and option.

```
STR [Extreme v] +7    DEX [High v] +5    CON [Moderate v] +4
INT [Low v]     +1    WIS [Moderate v] +4 CHA [High v]     +5
```

Use the **Show Bonuses** checkbox at the top of the form to hide or show the bonus badges.

### Drag-and-Drop Items & Actions

The **Items / Actions** section at the bottom of the form is a drop zone where you can drag items directly from Foundry compendiums, NPCs or other places. Supported item types:

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

Below are the images of the form:

First part contains all the important values like Hit Points, Level, Name etc. and preview block on the right.

![Page One of The Form](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/PageOne.png?raw=true)

The Second part contains all the skills and item dropdown zone.
![Page Two of The Form](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/PageTwo.png?raw=true)

The last part contains `Submit` button and `Reset to Defaults` button

![Page Three of The Form](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/PageThree.png?raw=true)

Traits will show you suggestions from the list of existing ones, or you can add a new one.
![Traits](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/TraitsSection.png?raw=true)

Lore section allow to specify any number of additional lore entries if needed.

![Skill Section](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/SkillLoreItemBlock.png?raw=true)

Here is a comparison of size in relation to UI:
![Full UI Size](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/FullUIImage.png?raw=true)

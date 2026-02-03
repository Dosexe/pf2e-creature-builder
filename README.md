# fvtt-module-pf2e-CreatureBuilderForm

This is forked from the [pf2e-monster-maker](https://github.com/mikolajg-tt/pf2e-monster-maker). Thanks to the creator **mikolajg-tt** for the solid foundation and great work on the original module.

The download link: https://github.com/dosexe/pf2e-creature-builder/releases/latest/download/module.json

A Foundry VTT module designed for Pathfinder 2E System, that allows you to create combat NPCs from scratch or from existing creature, using values from the [Pathfinder 2e Building Creatures Guide](https://2e.aonprd.com/Rules.aspx?ID=995)

Main differences from the original module:
 - Added support for all official roadmaps as defined in the [Pathfinder 2e rules](https://2e.aonprd.com/Rules.aspx?ID=2919).
 - Introduced the ability to start a build from an existing creature.
 - Added  support for Lore skills.
 - Added support for traits.
 - Minor UI changes.

To use the **Creature Builder**, you can create a blank NPC or start with an existing one. 
For existing creature note that some of the values won't be inherited, like attacks/actions/passives, although those can be easily added afterward if needed.

When you open actor **Character Sheet**, you can find a button at the top named **Creature Builder**. Clicking this button will open the creature builder.
In there, you either use one of the roadmaps, allowing you to set values automatically for a given monster type, or you could create your unique creature by changing any of the drop-down menus.

By default, all values are `moderate` and level is set to `-1`, meaning you will get a creature that does not possess strengths or weaknesses. If you are planning to use your values rather than roadmaps, please take a look at the [PF2e Official Creature Building Guide](https://2e.aonprd.com/Rules.aspx?ID=995) to see how to create a balanced monster. 
When the values are set, click the `Submit` button. This will create a new creature and open its sheet on the screen. 
If you want to start from scratch you can always click `Reset to Defaults` button, that will flush all changes in the form.
Note each group in the form is clickable and can be expanded or collapsed. By default, all groups are expanded, except `Skills` and `Lore Skills`.

## Custom Roadmaps

You can add your own custom roadmaps by placing JSON files in a specific folder. Custom roadmaps will appear in the roadmap dropdown alongside the built-in ones.

### Setup

1. In your FoundryVTT Data folder, create the following directory structure:
   ```
   Data/pf2e-creature-builder/custom-roadmaps/
   ```

2. Place your custom roadmap JSON files in this folder. Each file can contain a single roadmap or an array of roadmaps.

3. Restart FoundryVTT or reload your world. Custom roadmaps are loaded when the game is ready.

### JSON Format

Custom roadmaps use a user-friendly format with readable statistic and option names:

```json
{
  "name": "Tank",
  "statistics": {
    "strength": "high",
    "constitution": "extreme",
    "dexterity": "low",
    "armorClass": "extreme",
    "hitPoints": "high",
    "fortitude": "high",
    "reflex": "low",
    "strikeBonus": "moderate",
    "strikeDamage": "moderate"
  }
}
```

You can also define multiple roadmaps in a single file using an array:

```json
[
  {
    "name": "Glass Cannon",
    "statistics": {
      "strength": "extreme",
      "constitution": "low",
      "hitPoints": "low",
      "armorClass": "low",
      "strikeBonus": "high",
      "strikeDamage": "extreme"
    }
  },
  {
    "name": "Utility Caster",
    "statistics": {
      "intelligence": "high",
      "wisdom": "high",
      "spellcasting": "high",
      "hitPoints": "low",
      "armorClass": "low"
    }
  }
]
```

### Available Statistics

| Statistic Key | Description |
|--------------|-------------|
| `strength` | Strength modifier |
| `dexterity` | Dexterity modifier |
| `constitution` | Constitution modifier |
| `intelligence` | Intelligence modifier |
| `wisdom` | Wisdom modifier |
| `charisma` | Charisma modifier |
| `hitPoints` | Hit Points |
| `perception` | Perception modifier |
| `armorClass` | Armor Class |
| `fortitude` | Fortitude save |
| `reflex` | Reflex save |
| `will` | Will save |
| `strikeBonus` | Strike attack bonus |
| `strikeDamage` | Strike damage |
| `spellcasting` | Spellcasting DC/attack |
| `acrobatics` | Acrobatics skill |
| `arcana` | Arcana skill |
| `athletics` | Athletics skill |
| `crafting` | Crafting skill |
| `deception` | Deception skill |
| `diplomacy` | Diplomacy skill |
| `intimidation` | Intimidation skill |
| `medicine` | Medicine skill |
| `nature` | Nature skill |
| `occultism` | Occultism skill |
| `performance` | Performance skill |
| `religion` | Religion skill |
| `society` | Society skill |
| `stealth` | Stealth skill |
| `survival` | Survival skill |
| `thievery` | Thievery skill |

### Available Values

| Value | Description |
|-------|-------------|
| `extreme` | Exceptional at this |
| `high` | Above average |
| `moderate` | Average |
| `low` | Below average |
| `terrible` | Poor |
| `abysmal` | Very poor (ability scores only) |
| `none` | No value (skills/spellcasting only) |

### Notes

- Custom roadmaps cannot override built-in roadmaps. If you use a name that conflicts with a built-in roadmap, your custom roadmap will be skipped.
- Only include the statistics you want to modify. Unspecified statistics will use the default value (usually `moderate`).
- Invalid statistic names or option values will be logged to the console and skipped.
- Custom roadmaps load asynchronously after the game is ready, so they may not appear immediately on the very first form open after starting FoundryVTT.

Below are the images of the form:

First part contains all the important values like Hit Points, Level, Name etc.

![Page One of The Form](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/PageOne.png?raw=true)

The Second part contains all the skills as well as the `Submit` button and `Reset to Defaults` button.
![Page Two of The Form](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/PageTwo.png?raw=true)

Traits will show you suggestions from the list of existing ones, or you can add a new one.
![Traits](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/TraitsSection.png?raw=true)

Lore section allow to specify any number of additional lore entries if needed.

![Lore Section](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/LoreSection.png?raw=true)

Here is a comparison of size in relation to UI:
![Full UI Size](https://github.com/Dosexe/pf2e-creature-builder/blob/main/images/FullUIImage.png?raw=true)

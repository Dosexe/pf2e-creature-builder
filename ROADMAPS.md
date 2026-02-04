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

| Statistic Key  | Description            |
|----------------|------------------------|
| `strength`     | Strength modifier      |
| `dexterity`    | Dexterity modifier     |
| `constitution` | Constitution modifier  |
| `intelligence` | Intelligence modifier  |
| `wisdom`       | Wisdom modifier        |
| `charisma`     | Charisma modifier      |
| `hitPoints`    | Hit Points             |
| `perception`   | Perception modifier    |
| `armorClass`   | Armor Class            |
| `fortitude`    | Fortitude save         |
| `reflex`       | Reflex save            |
| `will`         | Will save              |
| `strikeBonus`  | Strike attack bonus    |
| `strikeDamage` | Strike damage          |
| `spellcasting` | Spellcasting DC/attack |
| `acrobatics`   | Acrobatics skill       |
| `arcana`       | Arcana skill           |
| `athletics`    | Athletics skill        |
| `crafting`     | Crafting skill         |
| `deception`    | Deception skill        |
| `diplomacy`    | Diplomacy skill        |
| `intimidation` | Intimidation skill     |
| `medicine`     | Medicine skill         |
| `nature`       | Nature skill           |
| `occultism`    | Occultism skill        |
| `performance`  | Performance skill      |
| `religion`     | Religion skill         |
| `society`      | Society skill          |
| `stealth`      | Stealth skill          |
| `survival`     | Survival skill         |
| `thievery`     | Thievery skill         |

### Available Values

| Value      | Description                         |
|------------|-------------------------------------|
| `extreme`  | Exceptional at this                 |
| `high`     | Above average                       |
| `moderate` | Average                             |
| `low`      | Below average                       |
| `terrible` | Poor                                |
| `abysmal`  | Very poor (ability scores only)     |
| `none`     | No value (skills/spellcasting only) |

### Notes

- Custom roadmaps cannot override built-in roadmaps. If you use a name that conflicts with a built-in roadmap, your custom roadmap will be skipped.
- Only include the statistics you want to modify. Unspecified statistics will use the default value (usually `moderate`).
- Invalid statistic names or option values will be logged to the console and skipped.
- Custom roadmaps load asynchronously after the game is ready, so they may not appear immediately on the very first form open after starting FoundryVTT.

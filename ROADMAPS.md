## Custom Roadmaps [BETA]

You can add your own custom roadmaps by placing JSON files in a specific folder. Custom roadmaps appear in the roadmap dropdown alongside the built-in ones once Foundry finishes loading.

### Setup

1. In your FoundryVTT Data folder, create the following directory structure:
   ```
   Data/pf2e-creature-builder/custom-roadmaps/
   ```

2. Place your custom roadmap JSON files in this folder. Each file can contain a single roadmap or an array of roadmaps.

3. Restart FoundryVTT or reload your world. Custom roadmaps are loaded when the game is ready.

### JSON Format

Custom roadmaps use a grouped, user-friendly format with readable statistic and option names. The `stats` object must follow the full structure shown below, using the same group names and keys from `RoadmapConfigFile`.

```json
{
  "name": "Tank",
  "stats": {
    "abilityScores": {
      "strength": "high",
      "constitution": "extreme",
      "dexterity": "low"
    },
    "defenseAndPerception": {
      "armorClass": "extreme",
      "hitPoints": "high",
      "fortitude": "high",
      "reflex": "low"
    },
    "strikes": {
      "strikeBonus": "moderate",
      "strikeDamage": "moderate"
    }
  }
}
```

You can also define multiple roadmaps in a single file using an array:

```json
[
  {
    "name": "Glass Cannon",
    "stats": {
      "abilityScores": {
        "strength": "extreme",
        "constitution": "low"
      },
      "defenseAndPerception": {
        "hitPoints": "low",
        "armorClass": "low"
      },
      "strikes": {
        "strikeBonus": "high",
        "strikeDamage": "extreme"
      }
    }
  },
  {
    "name": "Utility Caster",
    "stats": {
      "abilityScores": {
        "intelligence": "high",
        "wisdom": "high"
      },
      "spellcasting": {
        "spellcasting": "high"
      },
      "defenseAndPerception": {
        "hitPoints": "low",
        "armorClass": "low"
      }
    }
  }
]
```

### Available Statistics

Each statistic belongs to a specific group in `stats`, and the group names/keys must match the `RoadmapConfigFile` structure.

#### `abilityScores`

| Statistic Key  | Description           |
|----------------|-----------------------|
| `strength`     | Strength modifier     |
| `dexterity`    | Dexterity modifier    |
| `constitution` | Constitution modifier |
| `intelligence` | Intelligence modifier |
| `wisdom`       | Wisdom modifier       |
| `charisma`     | Charisma modifier     |

#### `defenseAndPerception`

| Statistic Key | Description         |
|---------------|---------------------|
| `hitPoints`   | Hit Points          |
| `perception`  | Perception modifier |
| `armorClass`  | Armor Class         |
| `fortitude`   | Fortitude save      |
| `reflex`      | Reflex save         |
| `will`        | Will save           |

#### `strikes`

| Statistic Key  | Description         |
|----------------|---------------------|
| `strikeBonus`  | Strike attack bonus |
| `strikeDamage` | Strike damage       |

#### `spellcasting`

| Statistic Key  | Description            |
|----------------|------------------------|
| `spellcasting` | Spellcasting DC/attack |
| `tradition`    | Spellcasting tradition |
| `type`         | Spellcasting type      |

#### `skills`

| Statistic Key  | Description        |
|----------------|--------------------|
| `acrobatics`   | Acrobatics skill   |
| `arcana`       | Arcana skill       |
| `athletics`    | Athletics skill    |
| `crafting`     | Crafting skill     |
| `deception`    | Deception skill    |
| `diplomacy`    | Diplomacy skill    |
| `intimidation` | Intimidation skill |
| `medicine`     | Medicine skill     |
| `nature`       | Nature skill       |
| `occultism`    | Occultism skill    |
| `performance`  | Performance skill  |
| `religion`     | Religion skill     |
| `society`      | Society skill      |
| `stealth`      | Stealth skill      |
| `survival`     | Survival skill     |
| `thievery`     | Thievery skill     |

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

Spellcasting tradition values:
`arcane`, `divine`, `occult`, `primal`

Spellcasting type values:
`innate`, `prepared`, `spontaneous`

### Notes

- Custom roadmaps cannot override built-in roadmaps. If you use a name that conflicts with a built-in roadmap, your custom roadmap will be skipped.
- Only include the statistics you want to modify. Unspecified statistics will use the default value (usually `moderate`, or `none` for skills/spellcasting).
- Invalid statistic names or option values will be logged to the console and skipped.
- Spellcasting roadmaps can set spellcasting, tradition, and type. Key attribute still uses the form default.
- Custom roadmaps load asynchronously after the game is ready, so they may not appear immediately on the very first form open after starting FoundryVTT.

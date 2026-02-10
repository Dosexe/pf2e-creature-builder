export const Levels: string[] = [
    '-1',
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    '11',
    '12',
    '13',
    '14',
    '15',
    '16',
    '17',
    '18',
    '19',
    '20',
    '21',
    '22',
    '23',
    '24',
]

export const KeyPrefix = 'PF2EMONSTERMAKER'

export enum Statistics {
    name = 'PF2EMONSTERMAKER.name',
    level = 'PF2EMONSTERMAKER.level',
    // Ability Scores
    str = 'PF2EMONSTERMAKER.str',
    dex = 'PF2EMONSTERMAKER.dex',
    con = 'PF2EMONSTERMAKER.con',
    int = 'PF2EMONSTERMAKER.int',
    wis = 'PF2EMONSTERMAKER.wis',
    cha = 'PF2EMONSTERMAKER.cha',

    hp = 'PF2EMONSTERMAKER.hp',

    per = 'PF2EMONSTERMAKER.per',

    ac = 'PF2EMONSTERMAKER.ac',

    // Saves
    fort = 'PF2EMONSTERMAKER.fort',
    ref = 'PF2EMONSTERMAKER.ref',
    wil = 'PF2EMONSTERMAKER.wil',

    // Strikes
    strikeBonus = 'PF2EMONSTERMAKER.strikeBonus',
    strikeDamage = 'PF2EMONSTERMAKER.strikeDamage',
    spellcasting = 'PF2EMONSTERMAKER.spellcasting',
    spellcastingTradition = 'PF2EMONSTERMAKER.spellcastingTradition',
    spellcastingType = 'PF2EMONSTERMAKER.spellcastingType',
    spellcastingAttribute = 'PF2EMONSTERMAKER.spellcastingAttribute',

    // Skills
    acrobatics = 'PF2EMONSTERMAKER.acrobatics',
    arcana = 'PF2EMONSTERMAKER.arcana',
    athletics = 'PF2EMONSTERMAKER.athletics',
    crafting = 'PF2EMONSTERMAKER.crafting',
    deception = 'PF2EMONSTERMAKER.deception',
    diplomacy = 'PF2EMONSTERMAKER.diplomacy',
    intimidation = 'PF2EMONSTERMAKER.intimidation',
    medicine = 'PF2EMONSTERMAKER.medicine',
    nature = 'PF2EMONSTERMAKER.nature',
    occultism = 'PF2EMONSTERMAKER.occultism',
    performance = 'PF2EMONSTERMAKER.performance',
    religion = 'PF2EMONSTERMAKER.religion',
    society = 'PF2EMONSTERMAKER.society',
    stealth = 'PF2EMONSTERMAKER.stealth',
    survival = 'PF2EMONSTERMAKER.survival',
    thievery = 'PF2EMONSTERMAKER.thievery',
}

export const Skills: Statistics[] = [
    Statistics.acrobatics,
    Statistics.arcana,
    Statistics.athletics,
    Statistics.crafting,
    Statistics.deception,
    Statistics.diplomacy,
    Statistics.intimidation,
    Statistics.medicine,
    Statistics.nature,
    Statistics.occultism,
    Statistics.performance,
    Statistics.religion,
    Statistics.society,
    Statistics.stealth,
    Statistics.survival,
    Statistics.thievery,
]

export const actorFields = {
    // Ability Scores
    [Statistics.str]: 'system.abilities.str.mod',
    [Statistics.dex]: 'system.abilities.dex.mod',
    [Statistics.con]: 'system.abilities.con.mod',
    [Statistics.int]: 'system.abilities.int.mod',
    [Statistics.wis]: 'system.abilities.wis.mod',
    [Statistics.cha]: 'system.abilities.cha.mod',

    [Statistics.hp]: 'system.attributes.hp.max',

    [Statistics.per]: 'system.perception.mod',

    [Statistics.ac]: 'system.attributes.ac.value',

    // Saves
    [Statistics.fort]: 'system.saves.fortitude.value',
    [Statistics.ref]: 'system.saves.reflex.value',
    [Statistics.wil]: 'system.saves.will.value',
}

export enum Options {
    extreme = 'PF2EMONSTERMAKER.extreme',
    high = 'PF2EMONSTERMAKER.high',
    moderate = 'PF2EMONSTERMAKER.moderate',
    low = 'PF2EMONSTERMAKER.low',
    terrible = 'PF2EMONSTERMAKER.terrible',
    abysmal = 'PF2EMONSTERMAKER.abysmal',
    none = 'PF2EMONSTERMAKER.none',
}

export enum MagicalTradition {
    arcane = 'PF2EMONSTERMAKER.traditionArcane',
    divine = 'PF2EMONSTERMAKER.traditionDivine',
    occult = 'PF2EMONSTERMAKER.traditionOccult',
    primal = 'PF2EMONSTERMAKER.traditionPrimal',
}

export enum CasterType {
    innate = 'PF2EMONSTERMAKER.casterInnate',
    prepared = 'PF2EMONSTERMAKER.casterPrepared',
    spontaneous = 'PF2EMONSTERMAKER.casterSpontaneous',
}

export enum SpellcastingAttribute {
    str = 'PF2EMONSTERMAKER.attrStr',
    dex = 'PF2EMONSTERMAKER.attrDex',
    con = 'PF2EMONSTERMAKER.attrCon',
    int = 'PF2EMONSTERMAKER.attrInt',
    wis = 'PF2EMONSTERMAKER.attrWis',
    cha = 'PF2EMONSTERMAKER.attrCha',
}

// ============================================================================
// Roadmap Types
// ============================================================================

export type RoadmapValue =
    | Options
    | MagicalTradition
    | CasterType
    | SpellcastingAttribute

/** Internal roadmap format - maps Statistics keys to options or spellcasting enums */
export type Roadmap = Record<string, RoadmapValue>

export type RoadmapCollection = Record<string, Roadmap>

// Note: RoadmapConfigFile interface has been removed and replaced with Zod schemas
// in RoadmapSchemas.ts. The old STAT_KEY_MAP, OPTION_MAP, TRADITION_MAP, and
// CASTER_TYPE_MAP have been replaced with direct mapping in RoadmapTransformer.ts

// ============================================================================
// Built-in Roadmaps
// ============================================================================

export const RoadMaps: RoadmapCollection = {
    'PF2EMONSTERMAKER.brute': {
        [Statistics.per]: Options.low,
        [Statistics.str]: Options.high,
        [Statistics.ac]: Options.low,
        [Statistics.fort]: Options.high,
        [Statistics.ref]: Options.low,
        [Statistics.wil]: Options.low,
        [Statistics.hp]: Options.high,
        [Statistics.strikeBonus]: Options.high,
        [Statistics.strikeDamage]: Options.high,
    },
    'PF2EMONSTERMAKER.magicalStriker': {
        [Statistics.per]: Options.moderate,
        [Statistics.dex]: Options.high,
        [Statistics.int]: Options.moderate,
        [Statistics.ac]: Options.moderate,
        [Statistics.fort]: Options.moderate,
        [Statistics.ref]: Options.high,
        [Statistics.wil]: Options.moderate,
        [Statistics.hp]: Options.moderate,
        [Statistics.strikeBonus]: Options.high,
        [Statistics.strikeDamage]: Options.moderate,
        [Statistics.spellcasting]: Options.moderate,
    },
    'PF2EMONSTERMAKER.skirmisher': {
        [Statistics.per]: Options.high,
        [Statistics.dex]: Options.high,
        [Statistics.ac]: Options.high,
        [Statistics.fort]: Options.moderate,
        [Statistics.ref]: Options.high,
        [Statistics.hp]: Options.moderate,
        [Statistics.strikeBonus]: Options.high,
        [Statistics.strikeDamage]: Options.moderate,
    },
    'PF2EMONSTERMAKER.sniper': {
        [Statistics.per]: Options.high,
        [Statistics.dex]: Options.extreme,
        [Statistics.ac]: Options.moderate,
        [Statistics.fort]: Options.moderate,
        [Statistics.ref]: Options.high,
        [Statistics.hp]: Options.low,
        [Statistics.strikeBonus]: Options.extreme,
        [Statistics.strikeDamage]: Options.moderate,
    },
    'PF2EMONSTERMAKER.soldier': {
        [Statistics.per]: Options.moderate,
        [Statistics.str]: Options.moderate,
        [Statistics.dex]: Options.moderate,
        [Statistics.ac]: Options.high,
        [Statistics.fort]: Options.high,
        [Statistics.ref]: Options.moderate,
        [Statistics.hp]: Options.moderate,
        [Statistics.strikeBonus]: Options.high,
        [Statistics.strikeDamage]: Options.moderate,
    },
    'PF2EMONSTERMAKER.spellcaster': {
        [Statistics.per]: Options.moderate,
        [Statistics.int]: Options.high,
        [Statistics.ac]: Options.low,
        [Statistics.fort]: Options.low,
        [Statistics.ref]: Options.moderate,
        [Statistics.wil]: Options.high,
        [Statistics.hp]: Options.low,
        [Statistics.strikeBonus]: Options.low,
        [Statistics.strikeDamage]: Options.low,
        [Statistics.spellcasting]: Options.extreme,
    },
    'PF2EMONSTERMAKER.alchemist': {
        [Statistics.per]: Options.moderate,
        [Statistics.crafting]: Options.high,
        [Statistics.int]: Options.high,
        [Statistics.ac]: Options.moderate,
        [Statistics.fort]: Options.moderate,
        [Statistics.ref]: Options.high,
        [Statistics.hp]: Options.moderate,
        [Statistics.strikeBonus]: Options.moderate,
        [Statistics.strikeDamage]: Options.moderate,
    },
    'PF2EMONSTERMAKER.barbarian': {
        [Statistics.per]: Options.moderate,
        [Statistics.athletics]: Options.high,
        [Statistics.str]: Options.high,
        [Statistics.ac]: Options.low,
        [Statistics.fort]: Options.high,
        [Statistics.ref]: Options.moderate,
        [Statistics.hp]: Options.high,
        [Statistics.strikeBonus]: Options.high,
        [Statistics.strikeDamage]: Options.high,
    },
    'PF2EMONSTERMAKER.bard': {
        [Statistics.per]: Options.moderate,
        [Statistics.performance]: Options.high,
        [Statistics.cha]: Options.high,
        [Statistics.ac]: Options.low,
        [Statistics.fort]: Options.low,
        [Statistics.ref]: Options.moderate,
        [Statistics.wil]: Options.high,
        [Statistics.hp]: Options.moderate,
        [Statistics.strikeBonus]: Options.low,
        [Statistics.strikeDamage]: Options.low,
        [Statistics.spellcasting]: Options.high,
    },
    'PF2EMONSTERMAKER.champion': {
        [Statistics.per]: Options.moderate,
        [Statistics.religion]: Options.moderate,
        [Statistics.str]: Options.high,
        [Statistics.ac]: Options.high,
        [Statistics.fort]: Options.high,
        [Statistics.ref]: Options.moderate,
        [Statistics.wil]: Options.moderate,
        [Statistics.hp]: Options.moderate,
        [Statistics.strikeBonus]: Options.high,
        [Statistics.strikeDamage]: Options.moderate,
    },
    'PF2EMONSTERMAKER.cleric': {
        [Statistics.per]: Options.moderate,
        [Statistics.religion]: Options.high,
        [Statistics.wis]: Options.high,
        [Statistics.ac]: Options.low,
        [Statistics.fort]: Options.moderate,
        [Statistics.wil]: Options.high,
        [Statistics.hp]: Options.moderate,
        [Statistics.strikeBonus]: Options.low,
        [Statistics.strikeDamage]: Options.low,
        [Statistics.spellcasting]: Options.high,
    },
    'PF2EMONSTERMAKER.druid': {
        [Statistics.per]: Options.moderate,
        [Statistics.nature]: Options.high,
        [Statistics.wis]: Options.high,
        [Statistics.ac]: Options.low,
        [Statistics.fort]: Options.moderate,
        [Statistics.ref]: Options.moderate,
        [Statistics.wil]: Options.high,
        [Statistics.hp]: Options.moderate,
        [Statistics.strikeBonus]: Options.low,
        [Statistics.strikeDamage]: Options.low,
        [Statistics.spellcasting]: Options.high,
    },
    'PF2EMONSTERMAKER.fighter': {
        [Statistics.per]: Options.high,
        [Statistics.athletics]: Options.moderate,
        [Statistics.str]: Options.high,
        [Statistics.dex]: Options.high,
        [Statistics.ac]: Options.high,
        [Statistics.fort]: Options.high,
        [Statistics.ref]: Options.moderate,
        [Statistics.hp]: Options.moderate,
        [Statistics.strikeBonus]: Options.extreme,
        [Statistics.strikeDamage]: Options.moderate,
    },
    'PF2EMONSTERMAKER.monk': {
        [Statistics.per]: Options.high,
        [Statistics.acrobatics]: Options.high,
        [Statistics.dex]: Options.high,
        [Statistics.ac]: Options.high,
        [Statistics.fort]: Options.high,
        [Statistics.ref]: Options.high,
        [Statistics.wil]: Options.high,
        [Statistics.strikeBonus]: Options.high,
        [Statistics.strikeDamage]: Options.moderate,
    },
    'PF2EMONSTERMAKER.oracle': {
        [Statistics.per]: Options.moderate,
        [Statistics.religion]: Options.moderate,
        [Statistics.cha]: Options.high,
        [Statistics.ac]: Options.low,
        [Statistics.fort]: Options.low,
        [Statistics.ref]: Options.moderate,
        [Statistics.wil]: Options.high,
        [Statistics.hp]: Options.moderate,
        [Statistics.strikeBonus]: Options.low,
        [Statistics.strikeDamage]: Options.low,
        [Statistics.spellcasting]: Options.high,
    },
    'PF2EMONSTERMAKER.ranger': {
        [Statistics.per]: Options.high,
        [Statistics.nature]: Options.moderate,
        [Statistics.survival]: Options.high,
        [Statistics.str]: Options.high,
        [Statistics.ac]: Options.high,
        [Statistics.strikeBonus]: Options.high,
        [Statistics.strikeDamage]: Options.high,
    },
    'PF2EMONSTERMAKER.rogue': {
        [Statistics.per]: Options.high,
        [Statistics.stealth]: Options.high,
        [Statistics.thievery]: Options.high,
        [Statistics.dex]: Options.high,
        [Statistics.ac]: Options.high,
        [Statistics.fort]: Options.low,
        [Statistics.ref]: Options.high,
        [Statistics.hp]: Options.low,
        [Statistics.strikeBonus]: Options.moderate,
        [Statistics.strikeDamage]: Options.high,
    },
    'PF2EMONSTERMAKER.sorcerer': {
        [Statistics.per]: Options.low,
        [Statistics.cha]: Options.high,
        [Statistics.ac]: Options.low,
        [Statistics.fort]: Options.low,
        [Statistics.hp]: Options.low,
        [Statistics.strikeBonus]: Options.low,
        [Statistics.strikeDamage]: Options.low,
        [Statistics.spellcasting]: Options.high,
    },
    'PF2EMONSTERMAKER.swashbuckler': {
        [Statistics.per]: Options.high,
        [Statistics.acrobatics]: Options.high,
        [Statistics.dex]: Options.high,
        [Statistics.ac]: Options.high,
        [Statistics.fort]: Options.low,
        [Statistics.ref]: Options.high,
        [Statistics.strikeBonus]: Options.moderate,
        [Statistics.strikeDamage]: Options.high,
    },
    'PF2EMONSTERMAKER.witch': {
        [Statistics.per]: Options.low,
        [Statistics.int]: Options.high,
        [Statistics.ac]: Options.low,
        [Statistics.fort]: Options.low,
        [Statistics.hp]: Options.low,
        [Statistics.strikeBonus]: Options.low,
        [Statistics.strikeDamage]: Options.low,
        [Statistics.spellcasting]: Options.high,
    },
    'PF2EMONSTERMAKER.wizard': {
        [Statistics.per]: Options.low,
        [Statistics.arcana]: Options.high,
        [Statistics.int]: Options.high,
        [Statistics.ac]: Options.low,
        [Statistics.fort]: Options.low,
        [Statistics.hp]: Options.low,
        [Statistics.strikeBonus]: Options.low,
        [Statistics.strikeDamage]: Options.low,
        [Statistics.spellcasting]: Options.high,
    },
}

export class CreatureStatistic {
    name: string
    availableOptions?: (
        | Options
        | MagicalTradition
        | CasterType
        | SpellcastingAttribute
    )[]
    defaultValue?:
        | Options
        | MagicalTradition
        | CasterType
        | SpellcastingAttribute
}

export class CreatureStatisticCategory {
    name: string
    availableOptions: (
        | Options
        | MagicalTradition
        | CasterType
        | SpellcastingAttribute
    )[]
    defaultValue:
        | Options
        | MagicalTradition
        | CasterType
        | SpellcastingAttribute
    statisticEntries: CreatureStatistic[]
}

export const DefaultCreatureLevel = '-1'

export const DefaultCreatureStatistics: CreatureStatisticCategory[] = [
    {
        name: `${KeyPrefix}.abilityScores`,
        availableOptions: [
            Options.abysmal,
            Options.terrible,
            Options.low,
            Options.moderate,
            Options.high,
            Options.extreme,
        ],
        defaultValue: Options.moderate,
        statisticEntries: [
            {
                name: Statistics.str,
            },
            {
                name: Statistics.dex,
            },
            {
                name: Statistics.con,
            },
            {
                name: Statistics.int,
            },
            {
                name: Statistics.wis,
            },
            {
                name: Statistics.cha,
            },
        ],
    },
    {
        name: 'Defence + Perception',
        availableOptions: [
            Options.terrible,
            Options.low,
            Options.moderate,
            Options.high,
            Options.extreme,
        ],
        defaultValue: Options.moderate,
        statisticEntries: [
            {
                name: Statistics.hp,
                availableOptions: [Options.low, Options.moderate, Options.high],
            },
            {
                name: Statistics.per,
            },
            {
                name: Statistics.ac,
                availableOptions: [
                    Options.low,
                    Options.moderate,
                    Options.high,
                    Options.extreme,
                ],
            },
            {
                name: Statistics.fort,
            },
            {
                name: Statistics.ref,
            },
            {
                name: Statistics.wil,
            },
        ],
    },
    {
        name: `${KeyPrefix}.strikes`,
        availableOptions: [
            Options.low,
            Options.moderate,
            Options.high,
            Options.extreme,
        ],
        defaultValue: Options.moderate,
        statisticEntries: [
            {
                name: Statistics.strikeBonus,
            },
            {
                name: Statistics.strikeDamage,
            },
        ],
    },
    {
        name: Statistics.spellcasting,
        defaultValue: Options.none,
        availableOptions: [
            Options.none,
            Options.moderate,
            Options.high,
            Options.extreme,
        ],
        statisticEntries: [
            {
                name: Statistics.spellcasting,
            },
            {
                name: Statistics.spellcastingTradition,
                availableOptions: [
                    MagicalTradition.arcane,
                    MagicalTradition.divine,
                    MagicalTradition.occult,
                    MagicalTradition.primal,
                ],
                defaultValue: MagicalTradition.arcane,
            },
            {
                name: Statistics.spellcastingType,
                availableOptions: [
                    CasterType.innate,
                    CasterType.prepared,
                    CasterType.spontaneous,
                ],
                defaultValue: CasterType.innate,
            },
        ],
    },
    {
        name: `${KeyPrefix}.skills`,
        defaultValue: Options.none,
        availableOptions: [
            Options.none,
            Options.terrible,
            Options.low,
            Options.moderate,
            Options.high,
            Options.extreme,
        ],
        statisticEntries: [
            {
                name: Statistics.acrobatics,
            },
            {
                name: Statistics.arcana,
            },
            {
                name: Statistics.athletics,
            },
            {
                name: Statistics.crafting,
            },
            {
                name: Statistics.deception,
            },
            {
                name: Statistics.diplomacy,
            },
            {
                name: Statistics.intimidation,
            },
            {
                name: Statistics.medicine,
            },
            {
                name: Statistics.nature,
            },
            {
                name: Statistics.occultism,
            },
            {
                name: Statistics.performance,
            },
            {
                name: Statistics.religion,
            },
            {
                name: Statistics.society,
            },
            {
                name: Statistics.stealth,
            },
            {
                name: Statistics.survival,
            },
            {
                name: Statistics.thievery,
            },
        ],
    },
]

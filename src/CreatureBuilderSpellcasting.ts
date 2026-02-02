import {
    CasterType,
    KeyPrefix,
    MagicalTradition,
    SpellcastingAttribute,
    Statistics,
} from './Keys'

/**
 * Configuration for creating a spellcasting entry
 */
export interface SpellcastingConfig {
    tradition: string
    casterType: string
    keyAttribute: string
    spellcastingBonus: number
    level: string
}

/**
 * Spell slot structure for PF2e
 */
interface SpellSlot {
    max: number
    value: number
    prepared: { id: null; expended: boolean }[]
}

// Spell slots table for prepared casters [cantrips, 1st, 2nd, ..., 10th]
// Index 0 = cantrips, Index 1-10 = spell levels 1-10
const preparedSlots: { [level: string]: number[] } = {
    '-1': [5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    '0': [5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    '1': [5, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    '2': [5, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    '3': [5, 3, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    '4': [5, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0],
    '5': [5, 3, 3, 2, 0, 0, 0, 0, 0, 0, 0],
    '6': [5, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0],
    '7': [5, 3, 3, 3, 2, 0, 0, 0, 0, 0, 0],
    '8': [5, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0],
    '9': [5, 3, 3, 3, 3, 2, 0, 0, 0, 0, 0],
    '10': [5, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0],
    '11': [5, 3, 3, 3, 3, 3, 2, 0, 0, 0, 0],
    '12': [5, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0],
    '13': [5, 3, 3, 3, 3, 3, 3, 2, 0, 0, 0],
    '14': [5, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0],
    '15': [5, 3, 3, 3, 3, 3, 3, 3, 2, 0, 0],
    '16': [5, 3, 3, 3, 3, 3, 3, 3, 3, 0, 0],
    '17': [5, 3, 3, 3, 3, 3, 3, 3, 3, 2, 0],
    '18': [5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 0],
    '19': [5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1],
    '20': [5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1],
    '21': [5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1],
    '22': [5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1],
    '23': [5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1],
    '24': [5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1],
}

// Spell slots table for spontaneous casters [cantrips, 1st, 2nd, ..., 10th]
const spontaneousSlots: { [level: string]: number[] } = {
    '-1': [5, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    '0': [5, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    '1': [5, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    '2': [5, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    '3': [5, 4, 3, 0, 0, 0, 0, 0, 0, 0, 0],
    '4': [5, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0],
    '5': [5, 4, 4, 3, 0, 0, 0, 0, 0, 0, 0],
    '6': [5, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0],
    '7': [5, 4, 4, 4, 3, 0, 0, 0, 0, 0, 0],
    '8': [5, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0],
    '9': [5, 4, 4, 4, 4, 3, 0, 0, 0, 0, 0],
    '10': [5, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0],
    '11': [5, 4, 4, 4, 4, 4, 3, 0, 0, 0, 0],
    '12': [5, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0],
    '13': [5, 4, 4, 4, 4, 4, 4, 3, 0, 0, 0],
    '14': [5, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0],
    '15': [5, 4, 4, 4, 4, 4, 4, 4, 3, 0, 0],
    '16': [5, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0],
    '17': [5, 4, 4, 4, 4, 4, 4, 4, 4, 3, 0],
    '18': [5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0],
    '19': [5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1],
    '20': [5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1],
    '21': [5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1],
    '22': [5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1],
    '23': [5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1],
    '24': [5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1],
}

// Maps for converting enum values to system values
const traditionMap: { [key: string]: string } = {
    [MagicalTradition.arcane]: 'arcane',
    [MagicalTradition.divine]: 'divine',
    [MagicalTradition.occult]: 'occult',
    [MagicalTradition.primal]: 'primal',
}

const casterTypeMap: { [key: string]: string } = {
    [CasterType.innate]: 'innate',
    [CasterType.prepared]: 'prepared',
    [CasterType.spontaneous]: 'spontaneous',
}

const attributeMap: { [key: string]: string } = {
    [SpellcastingAttribute.str]: 'str',
    [SpellcastingAttribute.dex]: 'dex',
    [SpellcastingAttribute.con]: 'con',
    [SpellcastingAttribute.int]: 'int',
    [SpellcastingAttribute.wis]: 'wis',
    [SpellcastingAttribute.cha]: 'cha',
}

/**
 * Convert tradition enum value to system value
 */
export function getTraditionValue(traditionOption: string): string {
    return traditionMap[traditionOption] || 'arcane'
}

/**
 * Convert caster type enum value to system value
 */
export function getCasterTypeValue(casterTypeOption: string): string {
    return casterTypeMap[casterTypeOption] || 'innate'
}

/**
 * Convert attribute enum value to system value
 */
export function getAttributeValue(attributeOption: string): string {
    return attributeMap[attributeOption] || 'cha'
}

/**
 * Generate spell slots based on caster type and creature level
 */
export function generateSpellSlots(
    casterType: string,
    level: string,
): { [key: string]: SpellSlot } {
    const slots: { [key: string]: SpellSlot } = {}

    // Innate casters don't use spell slots
    if (casterType === 'innate') {
        for (let i = 0; i <= 11; i++) {
            slots[`slot${i}`] = { max: 0, value: 0, prepared: [] }
        }
        return slots
    }

    const slotTable =
        casterType === 'prepared' ? preparedSlots : spontaneousSlots
    const slotCounts = slotTable[level] || slotTable['1']

    for (let i = 0; i <= 11; i++) {
        const count = i <= 10 ? slotCounts[i] : 0

        if (casterType === 'prepared') {
            // Prepared casters use prepared array with {id: null, expended: false}
            const prepared: { id: null; expended: boolean }[] = []
            for (let j = 0; j < count; j++) {
                prepared.push({ id: null, expended: false })
            }
            slots[`slot${i}`] = { max: count, value: count, prepared }
        } else {
            // Spontaneous casters use max/value for slots, empty prepared array
            slots[`slot${i}`] = { max: count, value: count, prepared: [] }
        }
    }

    return slots
}

/**
 * Build the spellcasting entry name from tradition and caster type
 */
export function buildSpellcastingName(
    tradition: string,
    casterType: string,
    spellsLabel: string,
): string {
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
    return `${capitalize(tradition)} ${capitalize(casterType)} ${spellsLabel}`
}

/**
 * Build the complete spellcasting entry object for PF2e
 */
export function buildSpellcastingEntry(config: SpellcastingConfig): object {
    const slots = generateSpellSlots(config.casterType, config.level)

    // biome-ignore lint/complexity/useLiteralKeys: FoundryVTT type workaround
    const spellsLabel = game['i18n'].localize(`${KeyPrefix}.spells`)
    const name = buildSpellcastingName(
        config.tradition,
        config.casterType,
        spellsLabel,
    )

    return {
        name,
        type: 'spellcastingEntry',
        system: {
            spelldc: {
                value: config.spellcastingBonus,
                dc: config.spellcastingBonus + 8,
            },
            tradition: {
                value: config.tradition,
            },
            prepared: {
                value: config.casterType,
            },
            ability: {
                value: config.keyAttribute,
            },
            showUnpreparedSpells: { value: true },
            slots: slots,
        },
    }
}

/**
 * Parse form data and extract spellcasting configuration
 */
export function parseSpellcastingFormData(formData: object): {
    tradition: string
    casterType: string
    keyAttribute: string
} {
    const traditionOption = formData[Statistics.spellcastingTradition]
    const casterTypeOption = formData[Statistics.spellcastingType]
    const attributeOption = formData[Statistics.spellcastingAttribute]

    return {
        tradition: getTraditionValue(traditionOption),
        casterType: getCasterTypeValue(casterTypeOption),
        keyAttribute: getAttributeValue(attributeOption),
    }
}

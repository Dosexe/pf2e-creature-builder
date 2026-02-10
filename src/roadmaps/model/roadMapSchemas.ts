import { z } from 'zod'
import {
    CasterType,
    MagicalTradition,
    Options,
    SpellcastingAttribute,
} from '@/Keys'

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

/**
 * Valid option values that can be used in custom roadmaps
 */
const optionValueSchema = z.enum([
    'extreme',
    'high',
    'moderate',
    'low',
    'terrible',
    'abysmal',
    'none',
])

/**
 * Valid tradition values that can be used in custom roadmaps
 */
const traditionValueSchema = z.enum(['arcane', 'divine', 'occult', 'primal'])

/**
 * Valid caster type values that can be used in custom roadmaps
 */
const casterTypeValueSchema = z.enum(['innate', 'prepared', 'spontaneous'])

/**
 * Valid spellcasting attribute values that can be used in custom roadmaps
 */
const spellcastingAttributeValueSchema = z.enum([
    'str',
    'dex',
    'con',
    'int',
    'wis',
    'cha',
])

/**
 * Schema for ability scores in custom roadmap
 */
const abilityScoresSchema = z.looseObject({
    strength: optionValueSchema.optional(),
    dexterity: optionValueSchema.optional(),
    constitution: optionValueSchema.optional(),
    intelligence: optionValueSchema.optional(),
    wisdom: optionValueSchema.optional(),
    charisma: optionValueSchema.optional(),
})

/**
 * Schema for defense and perception in custom roadmap
 */
const defenseAndPerceptionSchema = z.looseObject({
    hitPoints: optionValueSchema.optional(),
    perception: optionValueSchema.optional(),
    armorClass: optionValueSchema.optional(),
    fortitude: optionValueSchema.optional(),
    reflex: optionValueSchema.optional(),
    will: optionValueSchema.optional(),
})

/**
 * Schema for strikes in custom roadmap
 */
const strikesSchema = z.looseObject({
    strikeBonus: optionValueSchema.optional(),
    strikeDamage: optionValueSchema.optional(),
})

/**
 * Schema for spellcasting in custom roadmap
 */
const spellcastingSchema = z.looseObject({
    value: optionValueSchema.optional(),
    tradition: traditionValueSchema.optional(),
    type: casterTypeValueSchema.optional(),
})

/**
 * Schema for skills in custom roadmap
 */
const skillsSchema = z.looseObject({
    acrobatics: optionValueSchema.optional(),
    arcana: optionValueSchema.optional(),
    athletics: optionValueSchema.optional(),
    crafting: optionValueSchema.optional(),
    deception: optionValueSchema.optional(),
    diplomacy: optionValueSchema.optional(),
    intimidation: optionValueSchema.optional(),
    medicine: optionValueSchema.optional(),
    nature: optionValueSchema.optional(),
    occultism: optionValueSchema.optional(),
    performance: optionValueSchema.optional(),
    religion: optionValueSchema.optional(),
    society: optionValueSchema.optional(),
    stealth: optionValueSchema.optional(),
    survival: optionValueSchema.optional(),
    thievery: optionValueSchema.optional(),
})

/**
 * Schema for the complete stats object in custom roadmap
 */
const customRoadmapStatsSchema = z.looseObject({
    abilityScores: abilityScoresSchema.optional(),
    defenseAndPerception: defenseAndPerceptionSchema.optional(),
    strikes: strikesSchema.optional(),
    spellcasting: spellcastingSchema.optional(),
    skills: skillsSchema.optional(),
})

/**
 * Schema for a single custom roadmap from JSON file
 */
export const customRoadmapSchema = z.looseObject({
    name: z
        .string()
        .min(1, 'Roadmap name cannot be empty')
        .refine((value) => value.trim().length > 0, {
            message: `Name can't be blank`,
        }),
    stats: customRoadmapStatsSchema,
})

/**
 * Schema for custom roadmap JSON files (supports single or array)
 */
export const customRoadmapFileSchema = z.union([
    customRoadmapSchema,
    z.array(customRoadmapSchema),
])

// ============================================================================
// Type exports
// ============================================================================

export type CustomRoadmap = z.infer<typeof customRoadmapSchema>
export type CustomRoadmapStats = z.infer<typeof customRoadmapStatsSchema>
export type OptionValue = z.infer<typeof optionValueSchema>
export type TraditionValue = z.infer<typeof traditionValueSchema>
export type CasterTypeValue = z.infer<typeof casterTypeValueSchema>
export type SpellcastingAttributeValue = z.infer<
    typeof spellcastingAttributeValueSchema
>

// ============================================================================
// Translation Maps
// ============================================================================

/**
 * Map custom roadmap option values to internal Options enum
 */
export const OPTION_TRANSLATION_MAP: Record<OptionValue, Options> = {
    extreme: Options.extreme,
    high: Options.high,
    moderate: Options.moderate,
    low: Options.low,
    terrible: Options.terrible,
    abysmal: Options.abysmal,
    none: Options.none,
}

/**
 * Map custom roadmap tradition values to internal MagicalTradition enum
 */
export const TRADITION_TRANSLATION_MAP: Record<
    TraditionValue,
    MagicalTradition
> = {
    arcane: MagicalTradition.arcane,
    divine: MagicalTradition.divine,
    occult: MagicalTradition.occult,
    primal: MagicalTradition.primal,
}

/**
 * Map custom roadmap caster type values to internal CasterType enum
 */
export const CASTER_TYPE_TRANSLATION_MAP: Record<CasterTypeValue, CasterType> =
    {
        innate: CasterType.innate,
        prepared: CasterType.prepared,
        spontaneous: CasterType.spontaneous,
    }

/**
 * Map custom roadmap spellcasting attribute values to internal SpellcastingAttribute enum
 */
export const SPELLCASTING_ATTRIBUTE_TRANSLATION_MAP: Record<
    SpellcastingAttributeValue,
    SpellcastingAttribute
> = {
    str: SpellcastingAttribute.str,
    dex: SpellcastingAttribute.dex,
    con: SpellcastingAttribute.con,
    int: SpellcastingAttribute.int,
    wis: SpellcastingAttribute.wis,
    cha: SpellcastingAttribute.cha,
}

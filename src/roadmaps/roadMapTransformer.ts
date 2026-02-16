import {
    CasterType,
    MagicalTradition,
    Options,
    type Roadmap,
    type RoadmapValue,
    Statistics,
} from '@/Keys'
import {
    CASTER_TYPE_TRANSLATION_MAP,
    type CustomRoadmap,
    OPTION_TRANSLATION_MAP,
    TRADITION_TRANSLATION_MAP,
} from '@/roadmaps/model/roadMapSchemas'

/**
 * Transform a validated custom roadmap into internal roadmap format.
 * Uses direct mapping instead of flattening and iteration.
 *
 * @param customRoadmap - The validated custom roadmap
 * @returns Internal roadmap format
 */
export function transformCustomRoadmap(customRoadmap: CustomRoadmap): Roadmap {
    const { stats } = customRoadmap

    // Helper function to get translation key from option value
    const getOptionKey = (
        value?: string,
        defaultValue: Options = Options.moderate,
    ): RoadmapValue => {
        return value
            ? OPTION_TRANSLATION_MAP[
                  value as keyof typeof OPTION_TRANSLATION_MAP
              ]
            : defaultValue
    }

    // Helper function to get tradition key
    const getTraditionKey = (value?: string): RoadmapValue => {
        return value
            ? TRADITION_TRANSLATION_MAP[
                  value as keyof typeof TRADITION_TRANSLATION_MAP
              ]
            : MagicalTradition.arcane
    }

    // Helper function to get caster type key
    const getCasterTypeKey = (value?: string): RoadmapValue => {
        return value
            ? CASTER_TYPE_TRANSLATION_MAP[
                  value as keyof typeof CASTER_TYPE_TRANSLATION_MAP
              ]
            : CasterType.innate
    }

    const spellcastingValue = getOptionKey(
        stats.spellcasting?.value,
        Options.none,
    )
    const spellcastingTradition =
        spellcastingValue === Options.none
            ? Options.none
            : getTraditionKey(stats.spellcasting?.tradition)
    const spellcastingType =
        spellcastingValue === Options.none
            ? Options.none
            : getCasterTypeKey(stats.spellcasting?.type)

    // Direct mapping from custom roadmap structure to internal roadmap
    return {
        // Ability Scores
        [Statistics.str]: getOptionKey(stats.abilityScores?.strength),
        [Statistics.dex]: getOptionKey(stats.abilityScores?.dexterity),
        [Statistics.con]: getOptionKey(stats.abilityScores?.constitution),
        [Statistics.int]: getOptionKey(stats.abilityScores?.intelligence),
        [Statistics.wis]: getOptionKey(stats.abilityScores?.wisdom),
        [Statistics.cha]: getOptionKey(stats.abilityScores?.charisma),

        // Defense and Perception
        [Statistics.hp]: getOptionKey(stats.defenseAndPerception?.hitPoints),
        [Statistics.per]: getOptionKey(stats.defenseAndPerception?.perception),
        [Statistics.ac]: getOptionKey(stats.defenseAndPerception?.armorClass),
        [Statistics.fort]: getOptionKey(stats.defenseAndPerception?.fortitude),
        [Statistics.ref]: getOptionKey(stats.defenseAndPerception?.reflex),
        [Statistics.wil]: getOptionKey(stats.defenseAndPerception?.will),

        // Strikes
        [Statistics.strikeBonus]: getOptionKey(stats.strikes?.strikeBonus),
        [Statistics.strikeDamage]: getOptionKey(stats.strikes?.strikeDamage),

        // Spellcasting
        [Statistics.spellcasting]: spellcastingValue,
        [Statistics.spellcastingTradition]: spellcastingTradition,
        [Statistics.spellcastingType]: spellcastingType,

        // Skills
        [Statistics.acrobatics]: getOptionKey(
            stats.skills?.acrobatics,
            Options.none,
        ),
        [Statistics.arcana]: getOptionKey(stats.skills?.arcana, Options.none),
        [Statistics.athletics]: getOptionKey(
            stats.skills?.athletics,
            Options.none,
        ),
        [Statistics.crafting]: getOptionKey(
            stats.skills?.crafting,
            Options.none,
        ),
        [Statistics.deception]: getOptionKey(
            stats.skills?.deception,
            Options.none,
        ),
        [Statistics.diplomacy]: getOptionKey(
            stats.skills?.diplomacy,
            Options.none,
        ),
        [Statistics.intimidation]: getOptionKey(
            stats.skills?.intimidation,
            Options.none,
        ),
        [Statistics.medicine]: getOptionKey(
            stats.skills?.medicine,
            Options.none,
        ),
        [Statistics.nature]: getOptionKey(stats.skills?.nature, Options.none),
        [Statistics.occultism]: getOptionKey(
            stats.skills?.occultism,
            Options.none,
        ),
        [Statistics.performance]: getOptionKey(
            stats.skills?.performance,
            Options.none,
        ),
        [Statistics.religion]: getOptionKey(
            stats.skills?.religion,
            Options.none,
        ),
        [Statistics.society]: getOptionKey(stats.skills?.society, Options.none),
        [Statistics.stealth]: getOptionKey(stats.skills?.stealth, Options.none),
        [Statistics.survival]: getOptionKey(
            stats.skills?.survival,
            Options.none,
        ),
        [Statistics.thievery]: getOptionKey(
            stats.skills?.thievery,
            Options.none,
        ),
    }
}

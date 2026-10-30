import {
    CasterType,
    MagicalTradition,
    Options,
    type Roadmap,
    type RoadmapValue,
    Statistics,
    skillSlug,
} from '@/Keys'
import {
    CASTER_TYPE_TRANSLATION_MAP,
    type CustomRoadmap,
    OPTION_TRANSLATION_MAP,
    TRADITION_TRANSLATION_MAP,
} from '@/roadmaps/model/roadMapSchemas'
import { getCreatureSystem } from '@/systems/getCreatureSystem'

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

        ...skillRoadmap(stats.skills, getOptionKey),
    }
}

function skillRoadmap(
    skills: CustomRoadmap['stats']['skills'],
    getOptionKey: (value?: string, defaultValue?: Options) => RoadmapValue,
): Roadmap {
    const values = (skills ?? {}) as Record<string, string | undefined>
    const roadmap: Roadmap = {}
    for (const skill of getCreatureSystem().skills()) {
        const slug = skillSlug(skill)
        roadmap[skill] = getOptionKey(values[slug], Options.none)
    }
    return roadmap
}

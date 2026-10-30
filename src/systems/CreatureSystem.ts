import {
    type CreatureStatisticCategory,
    DefaultCreatureStatistics,
    KeyPrefix,
    type Options,
    RoadMaps,
    type RoadmapCollection,
    Skills,
    Statistics,
} from '@/Keys'
import type { SpellListCollection } from '@/spellcasting/model/spellList'
import { FALLBACK_CREATURE_TRAITS } from '@/systems/fallbackCreatureTraits'
import { statisticValues } from '@/Values'

const CREATURE_ROLE_KEYS = [
    'PF2EMONSTERMAKER.brute',
    'PF2EMONSTERMAKER.magicalStriker',
    'PF2EMONSTERMAKER.skirmisher',
    'PF2EMONSTERMAKER.sniper',
    'PF2EMONSTERMAKER.soldier',
    'PF2EMONSTERMAKER.spellcaster',
] as const

const ABILITY_STATS = new Set<string>([
    Statistics.str,
    Statistics.dex,
    Statistics.con,
    Statistics.int,
    Statistics.wis,
    Statistics.cha,
])

export function creatureRoleRoadmaps(): RoadmapCollection {
    const roadmaps: RoadmapCollection = {}
    for (const key of CREATURE_ROLE_KEYS) {
        roadmaps[key] = RoadMaps[key]
    }
    return roadmaps
}

export function isCreatureRoleRoadmap(key: string): boolean {
    return (CREATURE_ROLE_KEYS as readonly string[]).includes(key)
}

/**
 * System-specific creature-building content.
 * Shared tables, actor paths, and creature-role roadmaps stay here.
 * Subclasses supply only the values that differ between Pathfinder and Starfinder.
 */
export abstract class CreatureSystem {
    abstract readonly id: 'pf2e' | 'sf2e'
    abstract readonly spellsCompendium: string

    protected abstract classRoadmaps(): RoadmapCollection

    protected abstract extraSkills(): Statistics[]

    abstract spellLists(): SpellListCollection

    skills(): Statistics[] {
        return [...Skills, ...this.extraSkills()]
    }

    roadmaps(): RoadmapCollection {
        return { ...creatureRoleRoadmaps(), ...this.classRoadmaps() }
    }

    /**
     * Extreme ability modifiers at levels 22 and 23 differ in Starfinder.
     * The shared table is the Pathfinder value. Subclasses override the cell.
     */
    adjustAbilityModifier(
        _level: string,
        _option: string,
        value: number,
    ): number {
        return value
    }

    /**
     * Table value for a statistic, with the system ability-modifier override applied.
     * Non-numeric values, such as strike damage formulas, are returned unchanged.
     */
    displayValue(
        stat: string,
        level: string,
        option: string,
        raw: string,
    ): string {
        if (!ABILITY_STATS.has(stat)) return raw
        const parsed = Number(raw)
        if (!Number.isInteger(parsed)) return raw
        return String(this.adjustAbilityModifier(level, option, parsed))
    }

    numericValue(
        stat: string,
        level: string,
        option: string,
    ): number | undefined {
        const raw =
            statisticValues[stat as Statistics]?.[level]?.[option as Options]
        if (raw === undefined) return undefined
        const displayed = this.displayValue(stat, level, option, String(raw))
        const parsed = Number(displayed)
        return Number.isNaN(parsed) ? undefined : parsed
    }

    creatureStatistics(): CreatureStatisticCategory[] {
        const stats = JSON.parse(
            JSON.stringify(DefaultCreatureStatistics),
        ) as CreatureStatisticCategory[]
        for (const category of stats) {
            if (category.name !== `${KeyPrefix}.skills`) continue
            category.statisticEntries = this.skills().map((name) => ({
                name,
            }))
        }
        return stats
    }

    /**
     * Trait slugs from the active Foundry system.
     * The SF2e build keeps the CONFIG.PF2E name and fills it with Starfinder traits.
     */
    traitSuggestions(): string[] {
        const traits = (
            globalThis as {
                CONFIG?: { PF2E?: { creatureTraits?: Record<string, unknown> } }
            }
        ).CONFIG?.PF2E?.creatureTraits
        if (traits && Object.keys(traits).length > 0) {
            return Object.keys(traits).sort()
        }
        return this.fallbackTraitSuggestions()
    }

    /**
     * Used when the running system has not published creature traits.
     * Pathfinder keeps its built-in list. Starfinder does not reuse that list.
     */
    protected fallbackTraitSuggestions(): string[] {
        return FALLBACK_CREATURE_TRAITS
    }
}

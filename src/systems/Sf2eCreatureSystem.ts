import { CasterType, Options, type RoadmapCollection, Statistics } from '@/Keys'
import type { SpellListCollection } from '@/spellcasting/model/spellList'
import { CreatureSystem } from '@/systems/CreatureSystem'

/**
 * Starfinder GM Core class roadmaps.
 * The Soldier class uses its own key so it does not replace the Soldier creature role.
 */
export class Sf2eCreatureSystem extends CreatureSystem {
    readonly id = 'sf2e' as const
    readonly spellsCompendium = 'sf2e.spells'

    protected classRoadmaps(): RoadmapCollection {
        return {
            'pf2e-creature-builder.form.roadmap.envoy': {
                [Statistics.per]: Options.high,
                [Statistics.deception]: Options.high,
                [Statistics.diplomacy]: Options.high,
                [Statistics.intimidation]: Options.high,
                [Statistics.performance]: Options.high,
                [Statistics.cha]: Options.high,
                [Statistics.fort]: Options.low,
                [Statistics.wil]: Options.high,
                [Statistics.hp]: Options.moderate,
                [Statistics.strikeBonus]: Options.moderate,
                [Statistics.strikeDamage]: Options.moderate,
            },
            'pf2e-creature-builder.form.roadmap.mystic': {
                [Statistics.per]: Options.high,
                [Statistics.occultism]: Options.high,
                [Statistics.wis]: Options.high,
                [Statistics.fort]: Options.low,
                [Statistics.wil]: Options.high,
                [Statistics.hp]: Options.moderate,
                [Statistics.strikeBonus]: Options.low,
                [Statistics.strikeDamage]: Options.low,
                [Statistics.spellcasting]: Options.high,
                [Statistics.spellcastingType]: CasterType.spontaneous,
            },
            'pf2e-creature-builder.form.roadmap.operative': {
                [Statistics.per]: Options.high,
                [Statistics.acrobatics]: Options.high,
                [Statistics.stealth]: Options.high,
                [Statistics.thievery]: Options.high,
                [Statistics.piloting]: Options.high,
                [Statistics.dex]: Options.high,
                [Statistics.ac]: Options.moderate,
                [Statistics.fort]: Options.low,
                [Statistics.ref]: Options.high,
                [Statistics.hp]: Options.moderate,
                [Statistics.strikeBonus]: Options.high,
                [Statistics.strikeDamage]: Options.moderate,
            },
            'pf2e-creature-builder.form.roadmap.solarian': {
                [Statistics.per]: Options.high,
                [Statistics.athletics]: Options.high,
                [Statistics.str]: Options.high,
                [Statistics.ac]: Options.high,
                [Statistics.ref]: Options.high,
                [Statistics.wil]: Options.high,
                [Statistics.strikeBonus]: Options.moderate,
                [Statistics.strikeDamage]: Options.high,
            },
            'pf2e-creature-builder.form.roadmap.soldier-class': {
                [Statistics.athletics]: Options.high,
                [Statistics.intimidation]: Options.high,
                [Statistics.con]: Options.high,
                [Statistics.ac]: Options.moderate,
                [Statistics.fort]: Options.high,
                [Statistics.wil]: Options.high,
                [Statistics.hp]: Options.high,
                [Statistics.strikeBonus]: Options.moderate,
                [Statistics.strikeDamage]: Options.high,
            },
            'pf2e-creature-builder.form.roadmap.witchwarper': {
                [Statistics.per]: Options.low,
                [Statistics.arcana]: Options.high,
                [Statistics.computers]: Options.high,
                [Statistics.int]: Options.high,
                [Statistics.ac]: Options.low,
                [Statistics.fort]: Options.low,
                [Statistics.wil]: Options.high,
                [Statistics.hp]: Options.low,
                [Statistics.strikeBonus]: Options.low,
                [Statistics.strikeDamage]: Options.low,
                [Statistics.spellcasting]: Options.high,
                [Statistics.spellcastingType]: CasterType.spontaneous,
            },
        }
    }

    protected extraSkills(): Statistics[] {
        return [Statistics.computers, Statistics.piloting]
    }

    spellLists(): SpellListCollection {
        return {}
    }

    protected override fallbackTraitSuggestions(): string[] {
        return []
    }

    override adjustAbilityModifier(
        level: string,
        option: string,
        value: number,
    ): number {
        if ((level === '22' || level === '23') && option === Options.extreme) {
            return 12
        }
        return value
    }
}

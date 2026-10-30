import { afterEach, describe, expect, it, vi } from 'vitest'
import { Options, Statistics } from '@/Keys'
import {
    type CustomRoadmap,
    customRoadmapSchema,
} from '@/roadmaps/model/roadMapSchemas'
import { transformCustomRoadmap } from '@/roadmaps/roadMapTransformer'
import { getCreatureSystem } from '@/systems/getCreatureSystem'
import { Pf2eCreatureSystem } from '@/systems/Pf2eCreatureSystem'
import { Sf2eCreatureSystem } from '@/systems/Sf2eCreatureSystem'

describe('CreatureSystem', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('uses Pathfinder when no system is active', () => {
        const system = getCreatureSystem()
        expect(system).toBeInstanceOf(Pf2eCreatureSystem)
        expect(system.spellsCompendium).toBe('pf2e.spells-srd')
    })

    it('selects Starfinder from game.system.id', () => {
        vi.stubGlobal('game', { system: { id: 'sf2e' } })
        const system = getCreatureSystem()
        expect(system).toBeInstanceOf(Sf2eCreatureSystem)
        expect(system.id).toBe('sf2e')
        expect(system.spellsCompendium).toBe('sf2e.spells')
    })

    it('keeps Pathfinder class roadmaps and themed spell lists on pf2e', () => {
        const system = new Pf2eCreatureSystem()
        expect(system.roadmaps()['PF2EMONSTERMAKER.wizard']).toBeDefined()
        expect(system.roadmaps()['PF2EMONSTERMAKER.brute']).toBeDefined()
        expect(
            system.roadmaps()['pf2e-creature-builder.form.roadmap.envoy'],
        ).toBeUndefined()
        expect(system.skills()).not.toContain(Statistics.computers)
        expect(system.skills()).not.toContain(Statistics.piloting)
        expect(Object.keys(system.spellLists()).length).toBeGreaterThan(0)
        expect(system.adjustAbilityModifier('22', Options.extreme, 11)).toBe(11)
    })

    it('uses Starfinder class roadmaps', () => {
        const roadmaps = new Sf2eCreatureSystem().roadmaps()
        expect(roadmaps['PF2EMONSTERMAKER.brute']).toBeDefined()
        expect(roadmaps['PF2EMONSTERMAKER.soldier']).toBeDefined()
        expect(roadmaps['PF2EMONSTERMAKER.wizard']).toBeUndefined()
        expect(
            roadmaps['pf2e-creature-builder.form.roadmap.envoy'],
        ).toBeDefined()
        expect(
            roadmaps['pf2e-creature-builder.form.roadmap.soldier-class'],
        ).toBeDefined()
        expect(
            roadmaps['pf2e-creature-builder.form.roadmap.witchwarper'],
        ).toBeDefined()
        expect(new Sf2eCreatureSystem().spellLists()).toEqual({})
    })

    it('adds Computers and Piloting on Starfinder', () => {
        const system = new Sf2eCreatureSystem()
        expect(system.skills()).toContain(Statistics.computers)
        expect(system.skills()).toContain(Statistics.piloting)
        const skillEntries = system
            .creatureStatistics()
            .find(
                (category) => category.name === 'PF2EMONSTERMAKER.skills',
            )?.statisticEntries
        expect(skillEntries).toEqual(
            expect.arrayContaining([
                { name: Statistics.computers },
                { name: Statistics.piloting },
            ]),
        )
    })

    it('raises extreme ability modifiers at levels 22 and 23 on Starfinder', () => {
        const system = new Sf2eCreatureSystem()
        expect(system.adjustAbilityModifier('22', Options.extreme, 11)).toBe(12)
        expect(system.adjustAbilityModifier('23', Options.extreme, 11)).toBe(12)
        expect(system.adjustAbilityModifier('21', Options.extreme, 11)).toBe(11)
        expect(system.adjustAbilityModifier('22', Options.high, 10)).toBe(10)
        expect(system.numericValue(Statistics.str, '22', Options.extreme)).toBe(
            12,
        )
    })

    it('formats displayed statistic values', () => {
        const system = new Sf2eCreatureSystem()
        expect(
            system.displayValue(Statistics.hp, '1', Options.high, '25'),
        ).toBe('25')
        expect(
            system.displayValue(Statistics.str, '22', Options.extreme, '11'),
        ).toBe('12')
        expect(
            system.displayValue(Statistics.str, '22', Options.extreme, '1.5'),
        ).toBe('1.5')
        expect(
            system.numericValue(Statistics.hp, '1', Options.extreme),
        ).toBeUndefined()
        expect(
            system.numericValue(Statistics.strikeDamage, '1', Options.moderate),
        ).toBeUndefined()
    })

    it('reads trait suggestions from CONFIG.PF2E.creatureTraits', () => {
        vi.stubGlobal('CONFIG', {
            PF2E: { creatureTraits: { robot: 'Robot', vesk: 'Vesk' } },
        })
        expect(new Sf2eCreatureSystem().traitSuggestions()).toEqual([
            'robot',
            'vesk',
        ])
    })

    it('uses the built-in trait list when the Pathfinder config is empty', () => {
        vi.stubGlobal('CONFIG', { PF2E: { creatureTraits: {} } })
        const suggestions = new Pf2eCreatureSystem().traitSuggestions()
        expect(suggestions).toContain('humanoid')
        expect(suggestions).toContain('aberration')
    })

    it('does not suggest Pathfinder traits when the Starfinder config is empty', () => {
        vi.stubGlobal('CONFIG', { PF2E: { creatureTraits: {} } })
        expect(new Sf2eCreatureSystem().traitSuggestions()).toEqual([])
    })

    it('maps Computers and Piloting on custom Starfinder roadmaps', () => {
        vi.stubGlobal('game', { system: { id: 'sf2e' } })
        const roadmap = transformCustomRoadmap({
            name: 'Pilot',
            stats: {
                skills: {
                    computers: 'high',
                    piloting: 'extreme',
                    acrobatics: 'low',
                },
            },
        } as CustomRoadmap)
        expect(roadmap[Statistics.computers]).toBe(Options.high)
        expect(roadmap[Statistics.piloting]).toBe(Options.extreme)
        expect(roadmap[Statistics.acrobatics]).toBe(Options.low)
    })

    it('rejects an invalid Computers or Piloting option', () => {
        const result = customRoadmapSchema.safeParse({
            name: 'Pilot',
            stats: {
                skills: {
                    piloting: 'hgh',
                },
            },
        })
        expect(result.success).toBe(false)
    })
})

import { afterEach, describe, expect, it } from 'vitest'
import {
    actorHasIwr,
    availableIwrModifiers,
    availableIwrTypes,
    defaultIwrValue,
    iwrActorUpdate,
    iwrChoices,
    iwrCollapsedSummary,
    iwrDoubleVsSummary,
    iwrExceptionSummary,
    iwrFromControls,
    iwrTypeLabel,
    readActorIwr,
    recommendedIwrText,
    resistanceWeaknessRange,
    scaleIwrValue,
} from './iwr'

afterEach(() => {
    delete (globalThis as { CONFIG?: unknown }).CONFIG
    delete (globalThis as { game?: unknown }).game
})

describe('resistance and weakness ranges', () => {
    it('follows GM Core Table 2–8', () => {
        expect(resistanceWeaknessRange('-1')).toEqual({ min: 1, max: 1 })
        expect(resistanceWeaknessRange('0')).toEqual({ min: 1, max: 3 })
        expect(resistanceWeaknessRange('1')).toEqual({ min: 2, max: 3 })
        expect(resistanceWeaknessRange('5')).toEqual({ min: 4, max: 8 })
        expect(resistanceWeaknessRange('17')).toEqual({ min: 10, max: 19 })
        expect(resistanceWeaknessRange('24')).toEqual({ min: 13, max: 26 })
        expect(resistanceWeaknessRange('99')).toEqual({ min: 1, max: 1 })
    })

    it('starts a weakness at the high end and a resistance at the low end', () => {
        expect(defaultIwrValue('weakness', '3')).toBe(6)
        expect(defaultIwrValue('resistance', '3')).toBe(3)
        expect(recommendedIwrText('3')).toBe('Recommended 3–6')
    })

    it('moves an existing value with the level table', () => {
        expect(scaleIwrValue('weakness', '1', '5', 3)).toBe(8)
        expect(scaleIwrValue('weakness', '1', '5', 9)).toBe(14)
        expect(scaleIwrValue('resistance', '1', '5', 2)).toBe(4)
        expect(scaleIwrValue('resistance', '1', '5', 5)).toBe(7)
        expect(scaleIwrValue('resistance', '5', '5', 4)).toBe(4)
        expect(scaleIwrValue('resistance', '5', '1', 0)).toBe(0)
    })

    it('uses a translated recommendation when the system provides one', () => {
        ;(globalThis as { game?: unknown }).game = {
            i18n: {
                localize: (key: string) =>
                    key === 'pf2e-creature-builder.form.iwr.recommended'
                        ? 'Range {min} to {max}'
                        : key,
            },
        }
        expect(recommendedIwrText('0')).toBe('Range 1 to 3')
    })
})

describe('iwr catalogs', () => {
    it('keeps immunity, weakness, and resistance types distinct', () => {
        const immunity = iwrChoices('immunity').map((choice) => choice.slug)
        const weakness = iwrChoices('weakness').map((choice) => choice.slug)
        const resistance = iwrChoices('resistance').map((choice) => choice.slug)

        expect(immunity).toContain('disease')
        expect(immunity).toContain('paralyzed')
        expect(immunity).not.toContain('all-damage')
        expect(immunity).not.toContain('custom')
        expect(weakness).toContain('all-damage')
        expect(weakness).toContain('vampire-weaknesses')
        expect(weakness).not.toContain('disease')
        expect(weakness).not.toContain('custom')
        expect(resistance).toContain('all-damage')
        expect(resistance).toContain('damage-from-spells')
        expect(resistance).not.toContain('vampire-weaknesses')
        expect(iwrTypeLabel('immunity', 'cold-iron')).toBe('Cold Iron')
    })

    it('sorts labels from the running system and skips custom', () => {
        ;(globalThis as { CONFIG?: unknown }).CONFIG = {
            PF2E: {
                immunityTypes: {
                    fire: 'PF2E.Damage.RollFlavor.fire',
                    custom: '',
                    '': 'ignored',
                    cold: 12,
                },
                weaknessTypes: { custom: '' },
            },
        }
        ;(globalThis as { game?: unknown }).game = {
            i18n: {
                localize: (key: string) => {
                    if (key === 'PF2E.Damage.RollFlavor.fire') return 'Fire'
                    throw new Error(`missing ${key}`)
                },
            },
        }
        expect(iwrChoices('immunity')).toEqual([
            { slug: 'cold', label: 'Cold' },
            { slug: 'fire', label: 'Fire' },
        ])
        expect(
            iwrChoices('weakness').some((choice) => choice.slug === 'fire'),
        ).toBe(true)
        expect(
            availableIwrTypes('immunity', ['fire']).map(
                (choice) => choice.slug,
            ),
        ).toEqual(['cold'])
        expect(
            availableIwrModifiers('immunity', 'fire', ['cold']).map(
                (choice) => choice.slug,
            ),
        ).toEqual([])
    })

    it('localizes summaries and falls back when translation is missing', () => {
        ;(globalThis as { game?: unknown }).game = {
            i18n: {
                localize: (key: string) => key,
            },
        }
        expect(iwrExceptionSummary('immunity', [])).toBe('')
        expect(iwrExceptionSummary('immunity', ['fire', 'cold-iron'])).toBe(
            'except: Fire, Cold Iron',
        )
        expect(iwrDoubleVsSummary('resistance', [])).toBe('')
        expect(iwrDoubleVsSummary('resistance', ['silver'])).toBe(
            'double vs: Silver',
        )
        expect(iwrCollapsedSummary('resistance', [], [])).toBe('')
        expect(iwrCollapsedSummary('immunity', ['air'], [])).toBe(
            '(except: Air)',
        )
        expect(iwrCollapsedSummary('resistance', ['air'], ['fire'])).toBe(
            '(except: Air; double vs: Fire)',
        )
    })
})

describe('actor iwr', () => {
    it('reads authored source data and preserves entries the form cannot edit', () => {
        const actor = {
            _source: {
                system: {
                    attributes: {
                        immunities: [
                            {
                                type: 'fire',
                                exceptions: ['cold', 'fire', 'cold'],
                            },
                            { type: 'fire', exceptions: [] },
                            { type: 'custom', custom: 'Dreams' },
                            'not-an-entry',
                        ],
                        resistances: [
                            {
                                type: 'physical',
                                value: 5.4,
                                exceptions: ['adamantine'],
                                doubleVs: ['silver', 'adamantine'],
                            },
                            { type: 'fire' },
                        ],
                        weaknesses: [
                            { type: 'cold', value: 3, doubleVs: ['fire'] },
                        ],
                    },
                },
            },
            system: {
                attributes: {
                    immunities: [{ type: 'poison' }],
                },
            },
        }
        const iwr = readActorIwr(actor)
        expect(iwr.immunities).toEqual([
            { type: 'fire', exceptions: ['cold'], doubleVs: [] },
        ])
        expect(iwr.resistances).toEqual([
            {
                type: 'physical',
                value: 5,
                exceptions: ['adamantine'],
                doubleVs: ['silver'],
            },
        ])
        expect(iwr.weaknesses).toEqual([])
        expect(iwr.preserved.immunities).toEqual([
            { type: 'fire', exceptions: [] },
            { type: 'custom', custom: 'Dreams' },
            'not-an-entry',
        ])
        expect(iwr.preserved.resistances).toEqual([{ type: 'fire' }])
        expect(iwr.preserved.weaknesses).toEqual([
            { type: 'cold', value: 3, doubleVs: ['fire'] },
        ])
        const varied = readActorIwr({
            _source: {
                system: {
                    attributes: {
                        resistances: [
                            { type: 'fire', value: 5 },
                            { type: 'fire', value: 5 },
                            {
                                type: 'fire',
                                value: 10,
                                exceptions: ['cold'],
                            },
                        ],
                    },
                },
            },
        })
        expect(varied.resistances).toEqual([
            { type: 'fire', value: 5, exceptions: [], doubleVs: [] },
            {
                type: 'fire',
                value: 10,
                exceptions: ['cold'],
                doubleVs: [],
            },
        ])
        const duplicateWeakness = readActorIwr({
            _source: {
                system: {
                    attributes: {
                        weaknesses: [
                            { type: 'fire', value: 5 },
                            {
                                type: 'fire',
                                value: 10,
                                applyOnce: true,
                                source: 'Bestiary',
                            },
                            {
                                type: 'cold',
                                value: 4,
                                definition: ['item:trait:magical'],
                            },
                        ],
                    },
                },
            },
        })
        expect(duplicateWeakness.weaknesses).toEqual([
            { type: 'fire', value: 5, exceptions: [], doubleVs: [] },
        ])
        expect(duplicateWeakness.preserved.weaknesses).toEqual([
            { type: 'fire', value: 10, applyOnce: true, source: 'Bestiary' },
            {
                type: 'cold',
                value: 4,
                definition: ['item:trait:magical'],
            },
        ])
        expect(
            readActorIwr({
                system: {
                    attributes: {
                        immunities: [{ type: 'fire', doubleVs: { bad: true } }],
                    },
                },
            }).preserved.immunities,
        ).toEqual([{ type: 'fire', doubleVs: { bad: true } }])
        const circular: Record<string, unknown> = { type: 'custom' }
        circular.self = circular
        const dropped = readActorIwr({
            system: { attributes: { immunities: [circular] } },
        })
        expect(dropped.preserved.immunities).toEqual([])
        expect(() => JSON.stringify(dropped.preserved)).not.toThrow()
        expect(actorHasIwr(actor)).toBe(true)
        expect(actorHasIwr({ system: {} })).toBe(false)
    })

    it('falls back to derived lists when the actor has no source attributes', () => {
        expect(
            readActorIwr({
                system: {
                    attributes: {
                        immunities: [{ type: 'mental' }],
                    },
                },
            }).immunities,
        ).toEqual([{ type: 'mental', exceptions: [], doubleVs: [] }])
    })

    it('ignores derived lists once source attributes exist', () => {
        expect(
            readActorIwr({
                _source: { system: { attributes: { hp: { max: 20 } } } },
                system: {
                    attributes: { immunities: [{ type: 'poison' }] },
                },
            }).immunities,
        ).toEqual([])
    })

    it('writes form rows and appends preserved entries', () => {
        expect(iwrFromControls(null)).toBeNull()
        expect(iwrFromControls({ 'immunity-0-type': 'fire' })).toBeNull()
        expect(iwrActorUpdate({})).toBeNull()
        expect(
            iwrActorUpdate({
                iwrPresent: true,
                'immunity-1-type': 'cold',
                'immunity-1-exceptions': ['sonic', 'cold', ''],
                'immunity-0-type': 'fire',
                'immunity-0-exceptions': 'mental, mental',
                'immunity-2-type': 'fire',
                'resistance-0-type': 'physical',
                'resistance-0-value': '4.2',
                'resistance-0-exceptions': 'adamantine',
                'resistance-0-doubleVs': 'silver,adamantine',
                'resistance-1-type': 'custom',
                'weakness-0-type': 'fire',
                'weakness-0-value': 'nope',
                'weakness-0-doubleVs': 'water',
                iwrPreserved: JSON.stringify({
                    immunities: [{ type: 'custom' }],
                    weaknesses: 'nope',
                }),
            }),
        ).toEqual({
            'system.attributes.immunities': [
                { type: 'fire', exceptions: ['mental'] },
                { type: 'cold', exceptions: ['sonic'] },
                { type: 'fire' },
                { type: 'custom' },
            ],
            'system.attributes.resistances': [
                {
                    type: 'physical',
                    value: 4,
                    exceptions: ['adamantine'],
                    doubleVs: ['silver'],
                },
            ],
            'system.attributes.weaknesses': [{ type: 'fire', value: 0 }],
        })
        expect(
            iwrActorUpdate({
                iwrPresent: 'true',
                'resistance-0-type': 'fire',
                'resistance-0-value': '5',
                'resistance-1-type': 'fire',
                'resistance-1-value': '5',
                'resistance-2-type': 'fire',
                'resistance-2-value': '5',
                'resistance-2-exceptions': 'cold',
                'resistance-3-type': 'fire',
                'resistance-3-value': '10',
                'immunity-0-type': 'fire',
                'immunity-1-type': 'fire',
                'immunity-1-exceptions': 'cold',
            }),
        ).toMatchObject({
            'system.attributes.resistances': [
                { type: 'fire', value: 5 },
                { type: 'fire', value: 5, exceptions: ['cold'] },
                { type: 'fire', value: 10 },
            ],
            'system.attributes.immunities': [
                { type: 'fire' },
                { type: 'fire', exceptions: ['cold'] },
            ],
        })
    })

    it('clamps a negative resistance or weakness to zero on submit', () => {
        expect(
            iwrActorUpdate({
                iwrPresent: 'true',
                'resistance-0-type': 'fire',
                'resistance-0-value': '-3',
                'weakness-0-type': 'cold',
                'weakness-0-value': -1.2,
            }),
        ).toEqual({
            'system.attributes.immunities': [],
            'system.attributes.resistances': [{ type: 'fire', value: 0 }],
            'system.attributes.weaknesses': [{ type: 'cold', value: 0 }],
        })
    })

    it('clears the lists when the section is submitted empty', () => {
        expect(
            iwrActorUpdate({
                iwrPresent: 'true',
                iwrPreserved: '{',
            }),
        ).toEqual({
            'system.attributes.immunities': [],
            'system.attributes.resistances': [],
            'system.attributes.weaknesses': [],
        })
    })

    it('keeps a second weakness of the same type and ignores a non-string type', () => {
        expect(
            iwrActorUpdate({
                iwrPresent: 'true',
                'weakness-0-type': 'fire',
                'weakness-0-value': 5,
                'weakness-1-type': 'fire',
                'weakness-1-value': 10,
                'weakness-1-exceptions': 'cold',
                'immunity-0-type': 4,
            }),
        ).toEqual({
            'system.attributes.immunities': [],
            'system.attributes.resistances': [],
            'system.attributes.weaknesses': [
                { type: 'fire', value: 5 },
                { type: 'fire', value: 10, exceptions: ['cold'] },
            ],
        })
    })

    it('rejects preserved values that are not objects', () => {
        expect(
            iwrFromControls({
                iwrPresent: 'true',
                iwrPreserved: 'null',
            })?.preserved,
        ).toEqual({
            immunities: [],
            resistances: [],
            weaknesses: [],
        })
    })
})

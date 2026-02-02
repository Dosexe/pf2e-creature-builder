import { describe, it, expect, beforeEach } from 'vitest'
import {
    getTraditionValue,
    getCasterTypeValue,
    getAttributeValue,
    generateSpellSlots,
    buildSpellcastingName,
    buildSpellcastingEntry,
    parseSpellcastingFormData,
} from './CreatureBuilderSpellcasting'
import {
    MagicalTradition,
    CasterType,
    SpellcastingAttribute,
    Statistics,
} from './Keys'

// Mock the global game object
beforeEach(() => {
    ;(globalThis as any).game = {
        i18n: {
            localize: (key: string) => `loc:${key}`,
        },
    }
})

describe('CreatureBuilderSpellcasting', () => {
    describe('getTraditionValue', () => {
        it.each([
            [MagicalTradition.arcane, 'arcane'],
            [MagicalTradition.divine, 'divine'],
            [MagicalTradition.occult, 'occult'],
            [MagicalTradition.primal, 'primal'],
        ])('returns %s for %s tradition', (input, expected) => {
            expect(getTraditionValue(input)).toBe(expected)
        })

        it('defaults to arcane for unknown value', () => {
            expect(getTraditionValue('unknown')).toBe('arcane')
        })
    })

    describe('getCasterTypeValue', () => {
        it.each([
            [CasterType.innate, 'innate'],
            [CasterType.prepared, 'prepared'],
            [CasterType.spontaneous, 'spontaneous'],
        ])('returns %s for %s caster type', (input, expected) => {
            expect(getCasterTypeValue(input)).toBe(expected)
        })

        it('defaults to innate for unknown value', () => {
            expect(getCasterTypeValue('unknown')).toBe('innate')
        })
    })

    describe('getAttributeValue', () => {
        it.each([
            [SpellcastingAttribute.str, 'str'],
            [SpellcastingAttribute.dex, 'dex'],
            [SpellcastingAttribute.con, 'con'],
            [SpellcastingAttribute.int, 'int'],
            [SpellcastingAttribute.wis, 'wis'],
            [SpellcastingAttribute.cha, 'cha'],
        ])('returns %s for %s attribute', (input, expected) => {
            expect(getAttributeValue(input)).toBe(expected)
        })

        it('defaults to cha for unknown value', () => {
            expect(getAttributeValue('unknown')).toBe('cha')
        })
    })

    describe('generateSpellSlots', () => {
        describe('innate casters', () => {
            it('returns empty slots for innate casters', () => {
                const slots = generateSpellSlots('innate', '5')

                for (let i = 0; i <= 11; i++) {
                    expect(slots[`slot${i}`]).toEqual({
                        max: 0,
                        value: 0,
                        prepared: [],
                    })
                }
            })
        })

        describe('prepared casters', () => {
            it('generates correct slots for level 1 prepared caster', () => {
                const slots = generateSpellSlots('prepared', '1')

                // Level 1: 5 cantrips, 2 first level
                expect(slots.slot0.max).toBe(5)
                expect(slots.slot0.prepared).toHaveLength(5)
                expect(slots.slot1.max).toBe(2)
                expect(slots.slot1.prepared).toHaveLength(2)
                expect(slots.slot2.max).toBe(0)
                expect(slots.slot2.prepared).toHaveLength(0)
            })

            it('generates correct slots for level 5 prepared caster', () => {
                const slots = generateSpellSlots('prepared', '5')

                // Level 5: 5 cantrips, 3/3/2 for levels 1-3
                expect(slots.slot0.max).toBe(5)
                expect(slots.slot1.max).toBe(3)
                expect(slots.slot2.max).toBe(3)
                expect(slots.slot3.max).toBe(2)
                expect(slots.slot4.max).toBe(0)
            })

            it('generates correct slots for level 20 prepared caster', () => {
                const slots = generateSpellSlots('prepared', '20')

                // Level 20: 5 cantrips, 3/3/3/3/3/3/3/3/3/1 for levels 1-10
                expect(slots.slot0.max).toBe(5)
                expect(slots.slot9.max).toBe(3)
                expect(slots.slot10.max).toBe(1)
                expect(slots.slot11.max).toBe(0)
            })

            it('has prepared array with correct structure', () => {
                const slots = generateSpellSlots('prepared', '1')

                expect(slots.slot0.prepared[0]).toEqual({
                    id: null,
                    expended: false,
                })
                expect(slots.slot1.prepared[0]).toEqual({
                    id: null,
                    expended: false,
                })
            })

            it('defaults to level 1 for unknown level', () => {
                const slots = generateSpellSlots('prepared', '999')

                expect(slots.slot0.max).toBe(5)
                expect(slots.slot1.max).toBe(2)
            })
        })

        describe('spontaneous casters', () => {
            it('generates correct slots for level 1 spontaneous caster', () => {
                const slots = generateSpellSlots('spontaneous', '1')

                // Level 1: 5 cantrips, 3 first level
                expect(slots.slot0.max).toBe(5)
                expect(slots.slot0.prepared).toHaveLength(0)
                expect(slots.slot1.max).toBe(3)
                expect(slots.slot1.prepared).toHaveLength(0)
                expect(slots.slot2.max).toBe(0)
            })

            it('generates correct slots for level 5 spontaneous caster', () => {
                const slots = generateSpellSlots('spontaneous', '5')

                // Level 5: 5 cantrips, 4/4/3 for levels 1-3
                expect(slots.slot0.max).toBe(5)
                expect(slots.slot1.max).toBe(4)
                expect(slots.slot2.max).toBe(4)
                expect(slots.slot3.max).toBe(3)
                expect(slots.slot4.max).toBe(0)
            })

            it('generates correct slots for level 20 spontaneous caster', () => {
                const slots = generateSpellSlots('spontaneous', '20')

                // Level 20: 5 cantrips, 4/4/4/4/4/4/4/4/4/1 for levels 1-10
                expect(slots.slot0.max).toBe(5)
                expect(slots.slot9.max).toBe(4)
                expect(slots.slot10.max).toBe(1)
                expect(slots.slot11.max).toBe(0)
            })

            it('has empty prepared arrays for all slots', () => {
                const slots = generateSpellSlots('spontaneous', '5')

                for (let i = 0; i <= 11; i++) {
                    expect(slots[`slot${i}`].prepared).toHaveLength(0)
                }
            })
        })

        describe('edge cases', () => {
            it('handles negative levels', () => {
                const slots = generateSpellSlots('prepared', '-1')

                expect(slots.slot0.max).toBe(5)
                expect(slots.slot1.max).toBe(1)
            })

            it('handles level 0', () => {
                const slots = generateSpellSlots('prepared', '0')

                expect(slots.slot0.max).toBe(5)
                expect(slots.slot1.max).toBe(1)
            })

            it('handles high levels (24)', () => {
                const slots = generateSpellSlots('prepared', '24')

                expect(slots.slot0.max).toBe(5)
                expect(slots.slot10.max).toBe(1)
            })
        })
    })

    describe('buildSpellcastingName', () => {
        it('builds correct name with capitalization', () => {
            const name = buildSpellcastingName('arcane', 'prepared', 'Spells')

            expect(name).toBe('Arcane Prepared Spells')
        })

        it('handles different traditions and types', () => {
            expect(buildSpellcastingName('divine', 'innate', 'Spells')).toBe(
                'Divine Innate Spells',
            )
            expect(
                buildSpellcastingName('occult', 'spontaneous', 'Spells'),
            ).toBe('Occult Spontaneous Spells')
            expect(buildSpellcastingName('primal', 'prepared', 'Spells')).toBe(
                'Primal Prepared Spells',
            )
        })

        it('uses provided spells label', () => {
            const name = buildSpellcastingName('arcane', 'innate', 'Заклинания')

            expect(name).toBe('Arcane Innate Заклинания')
        })
    })

    describe('buildSpellcastingEntry', () => {
        it('builds complete spellcasting entry object', () => {
            const entry = buildSpellcastingEntry({
                tradition: 'arcane',
                casterType: 'prepared',
                keyAttribute: 'int',
                spellcastingBonus: 15,
                level: '5',
            })

            expect(entry).toMatchObject({
                name: 'Arcane Prepared loc:PF2EMONSTERMAKER.spells',
                type: 'spellcastingEntry',
                system: {
                    spelldc: {
                        value: 15,
                        dc: 23,
                    },
                    tradition: {
                        value: 'arcane',
                    },
                    prepared: {
                        value: 'prepared',
                    },
                    ability: {
                        value: 'int',
                    },
                    showUnpreparedSpells: { value: true },
                },
            })
        })

        it('includes spell slots in the entry', () => {
            const entry = buildSpellcastingEntry({
                tradition: 'divine',
                casterType: 'spontaneous',
                keyAttribute: 'cha',
                spellcastingBonus: 10,
                level: '3',
            }) as any

            expect(entry.system.slots).toBeDefined()
            expect(entry.system.slots.slot0.max).toBe(5)
            expect(entry.system.slots.slot1.max).toBe(4)
            expect(entry.system.slots.slot2.max).toBe(3)
        })

        it('calculates DC correctly (bonus + 8)', () => {
            const entry = buildSpellcastingEntry({
                tradition: 'primal',
                casterType: 'innate',
                keyAttribute: 'wis',
                spellcastingBonus: 20,
                level: '10',
            }) as any

            expect(entry.system.spelldc.value).toBe(20)
            expect(entry.system.spelldc.dc).toBe(28)
        })
    })

    describe('parseSpellcastingFormData', () => {
        it('parses form data with all values set', () => {
            const formData = {
                [Statistics.spellcastingTradition]: MagicalTradition.divine,
                [Statistics.spellcastingType]: CasterType.prepared,
                [Statistics.spellcastingAttribute]: SpellcastingAttribute.wis,
            }

            const result = parseSpellcastingFormData(formData)

            expect(result).toEqual({
                tradition: 'divine',
                casterType: 'prepared',
                keyAttribute: 'wis',
            })
        })

        it('uses defaults for missing values', () => {
            const formData = {}

            const result = parseSpellcastingFormData(formData)

            expect(result).toEqual({
                tradition: 'arcane',
                casterType: 'innate',
                keyAttribute: 'cha',
            })
        })

        it('handles partial form data', () => {
            const formData = {
                [Statistics.spellcastingTradition]: MagicalTradition.occult,
            }

            const result = parseSpellcastingFormData(formData)

            expect(result.tradition).toBe('occult')
            expect(result.casterType).toBe('innate')
            expect(result.keyAttribute).toBe('cha')
        })
    })
})

import { beforeEach, describe, expect, it } from 'vitest'
import {
    buildSpellcastingEntry,
    buildSpellcastingName,
    detectSpellcasting,
    expandPreparedSlotsPreservingSpells,
    expandSpontaneousSlotsPreservingValues,
    generateSpellSlots,
    getAttributeValue,
    getCasterTypeValue,
    getTraditionValue,
    parseSpellcastingFormData,
} from './CreatureBuilderSpellcasting'
import {
    CasterType,
    MagicalTradition,
    Options,
    SpellcastingAttribute,
    Statistics,
} from './Keys'

// Mock the global game object and foundry utilities
beforeEach(() => {
    ;(globalThis as any).game = {
        i18n: {
            localize: (key: string) => `loc:${key}`,
        },
    }
    ;(globalThis as any).foundry = {
        utils: {
            getProperty: (obj: object, path: string) => {
                const parts = path.split('.')
                let current: unknown = obj
                for (const part of parts) {
                    if (current === null || current === undefined)
                        return undefined
                    current = (current as Record<string, unknown>)[part]
                }
                return current
            },
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
            ['unknown', 'arcane'],
        ])('returns %s for %s tradition', (input, expected) => {
            expect(getTraditionValue(input)).toBe(expected)
        })
    })

    describe('getCasterTypeValue', () => {
        it.each([
            [CasterType.innate, 'innate'],
            [CasterType.prepared, 'prepared'],
            [CasterType.spontaneous, 'spontaneous'],
            ['unknown', 'innate'],
        ])('returns %s for %s caster type', (input, expected) => {
            expect(getCasterTypeValue(input)).toBe(expected)
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
            ['unknown', 'cha'],
        ])('returns %s for %s attribute', (input, expected) => {
            expect(getAttributeValue(input)).toBe(expected)
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

        describe('expandPreparedSlotsPreservingSpells', () => {
            it('keeps existing slots with prepared spells entirely unchanged', () => {
                const currentSlots = {
                    slot0: {
                        max: 7, // custom value, not from table
                        value: 7,
                        prepared: [
                            { id: 'spell-a', expended: false },
                            { id: 'spell-b', expended: true },
                        ],
                    },
                    slot1: {
                        max: 4, // custom value, not from table
                        value: 4,
                        prepared: [
                            { id: 'spell-c', expended: false },
                            { id: null, expended: false },
                        ],
                    },
                }
                const result = expandPreparedSlotsPreservingSpells(
                    currentSlots,
                    '7',
                )
                // Existing slots are kept entirely unchanged (max, value, prepared)
                expect(result.slot0.max).toBe(7) // preserved, not overridden
                expect(result.slot0.value).toBe(7)
                expect(result.slot0.prepared).toEqual([
                    { id: 'spell-a', expended: false },
                    { id: 'spell-b', expended: true },
                ])
                expect(result.slot1.max).toBe(4) // preserved, not overridden
                expect(result.slot1.prepared).toEqual([
                    { id: 'spell-c', expended: false },
                    { id: null, expended: false },
                ])
            })

            it('uses empty prepared for new slot levels', () => {
                const currentSlots = {
                    slot0: { max: 5, value: 5, prepared: [] },
                }
                const result = expandPreparedSlotsPreservingSpells(
                    currentSlots,
                    '7',
                )
                expect(result.slot4).toBeDefined()
                expect(result.slot4.max).toBe(2)
                expect(result.slot4.prepared).toHaveLength(2)
                expect(result.slot4.prepared).toEqual([
                    { id: null, expended: false },
                    { id: null, expended: false },
                ])
            })

            it('preserves existing slots entirely unchanged when cloning at same level', () => {
                // A caster with custom slot counts that differ from the table:
                // slot0: 7 cantrips (table says 5), slot1: 4 spells (table says 3), slot2: 3 spells (table says 2)
                const currentSlots = {
                    slot0: {
                        max: 7,
                        value: 7,
                        prepared: [
                            { id: 'cantrip-1', expended: false },
                            { id: 'cantrip-2', expended: false },
                            { id: 'cantrip-3', expended: false },
                            { id: 'cantrip-4', expended: false },
                            { id: 'cantrip-5', expended: false },
                            { id: 'cantrip-6', expended: false },
                            { id: 'cantrip-7', expended: false },
                        ],
                    },
                    slot1: {
                        max: 4,
                        value: 4,
                        prepared: [
                            { id: 'spell-1a', expended: false },
                            { id: 'spell-1b', expended: false },
                            { id: 'spell-1c', expended: true },
                            { id: 'spell-1d', expended: false },
                        ],
                    },
                    slot2: {
                        max: 3,
                        value: 3,
                        prepared: [
                            { id: 'spell-2a', expended: false },
                            { id: 'spell-2b', expended: false },
                            { id: 'spell-2c', expended: false },
                        ],
                    },
                }

                // Level 3 table: [5, 3, 2, 0, ...]
                // Existing slots with prepared spells are kept ENTIRELY UNCHANGED
                const result = expandPreparedSlotsPreservingSpells(
                    currentSlots,
                    '3',
                )

                // slot0: kept unchanged (max=7, not overridden to 5)
                expect(result.slot0.max).toBe(7) // preserved
                expect(result.slot0.value).toBe(7)
                expect(result.slot0.prepared).toHaveLength(7)
                expect(result.slot0.prepared[0].id).toBe('cantrip-1')
                expect(result.slot0.prepared[6].id).toBe('cantrip-7')

                // slot1: kept unchanged (max=4, not overridden to 3)
                expect(result.slot1.max).toBe(4) // preserved
                expect(result.slot1.value).toBe(4)
                expect(result.slot1.prepared).toHaveLength(4)
                expect(result.slot1.prepared[0].id).toBe('spell-1a')
                expect(result.slot1.prepared[2].expended).toBe(true)

                // slot2: kept unchanged (max=3, not overridden to 2)
                expect(result.slot2.max).toBe(3) // preserved
                expect(result.slot2.value).toBe(3)
                expect(result.slot2.prepared).toHaveLength(3)
                expect(result.slot2.prepared[0].id).toBe('spell-2a')
            })

            it('when raising level: preserves existing slots unchanged, adds new slots from table', () => {
                // A level 3 caster with slots 0-2 populated
                const currentSlots = {
                    slot0: {
                        max: 5,
                        value: 5,
                        prepared: [
                            { id: 'cantrip-1', expended: false },
                            { id: 'cantrip-2', expended: false },
                            { id: 'cantrip-3', expended: false },
                            { id: 'cantrip-4', expended: false },
                            { id: 'cantrip-5', expended: false },
                        ],
                    },
                    slot1: {
                        max: 3,
                        value: 3,
                        prepared: [
                            { id: 'spell-1a', expended: false },
                            { id: 'spell-1b', expended: false },
                            { id: 'spell-1c', expended: false },
                        ],
                    },
                    slot2: {
                        max: 2,
                        value: 2,
                        prepared: [
                            { id: 'spell-2a', expended: false },
                            { id: 'spell-2b', expended: true },
                        ],
                    },
                }

                // Raise to level 5: table [5, 3, 3, 2, 0, ...]
                // Existing slots with prepared spells are kept UNCHANGED
                // NEW slots (slot3) are added from table
                const result = expandPreparedSlotsPreservingSpells(
                    currentSlots,
                    '5',
                )

                // slot0: kept entirely unchanged
                expect(result.slot0.max).toBe(5)
                expect(result.slot0.value).toBe(5)
                expect(result.slot0.prepared).toHaveLength(5)
                expect(result.slot0.prepared.map((p) => p.id)).toEqual([
                    'cantrip-1',
                    'cantrip-2',
                    'cantrip-3',
                    'cantrip-4',
                    'cantrip-5',
                ])

                // slot1: kept entirely unchanged
                expect(result.slot1.max).toBe(3)
                expect(result.slot1.value).toBe(3)
                expect(result.slot1.prepared).toHaveLength(3)
                expect(result.slot1.prepared.map((p) => p.id)).toEqual([
                    'spell-1a',
                    'spell-1b',
                    'spell-1c',
                ])

                // slot2: kept entirely unchanged (max stays 2, NOT changed to 3)
                expect(result.slot2.max).toBe(2) // preserved, not changed to 3
                expect(result.slot2.value).toBe(2)
                expect(result.slot2.prepared).toHaveLength(2)
                expect(result.slot2.prepared[0].id).toBe('spell-2a')
                expect(result.slot2.prepared[1].id).toBe('spell-2b')
                expect(result.slot2.prepared[1].expended).toBe(true)

                // slot3: NEW slot at level 5 - added from table (max=2)
                expect(result.slot3.max).toBe(2)
                expect(result.slot3.value).toBe(2)
                expect(result.slot3.prepared).toHaveLength(2)
                expect(result.slot3.prepared).toEqual([
                    { id: null, expended: false },
                    { id: null, expended: false },
                ])

                // slot4+: from table (max=0, empty)
                expect(result.slot4.max).toBe(0)
                expect(result.slot4.prepared).toHaveLength(0)
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

            describe('expandSpontaneousSlotsPreservingValues', () => {
                it('keeps existing slots with max > 0 entirely unchanged', () => {
                    // A spontaneous caster with custom slot counts that differ from the table
                    //  for level 5: [5, 4, 4, 3, 0, ...]
                    const currentSlots = {
                        slot0: { max: 7, value: 7, prepared: [] }, // custom: 7 cantrips (table says 5)
                        slot1: { max: 6, value: 6, prepared: [] }, // custom: 6 slots (table says 4)
                        slot2: { max: 5, value: 5, prepared: [] }, // custom: 5 slots (table says 4)
                    }

                    const result = expandSpontaneousSlotsPreservingValues(
                        currentSlots,
                        '5',
                    )

                    // Existing slots are kept entirely unchanged
                    expect(result.slot0.max).toBe(7) // preserved, not overridden to 5
                    expect(result.slot0.value).toBe(7)
                    expect(result.slot1.max).toBe(6) // preserved, not overridden to 4
                    expect(result.slot1.value).toBe(6)
                    expect(result.slot2.max).toBe(5) // preserved, not overridden to 4
                    expect(result.slot2.value).toBe(5)
                })

                it('preserves existing slots entirely unchanged when cloning at same level', () => {
                    // A level 3 spontaneous caster with custom slot counts
                    // Table for level 3: [5, 4, 3, 0, ...]
                    const currentSlots = {
                        slot0: { max: 8, value: 8, prepared: [] }, // 8 cantrips (table says 5)
                        slot1: { max: 5, value: 5, prepared: [] }, // 5 slots (table says 4)
                        slot2: { max: 4, value: 4, prepared: [] }, // 4 slots (table says 3)
                    }

                    const result = expandSpontaneousSlotsPreservingValues(
                        currentSlots,
                        '3',
                    )

                    // All existing slots kept unchanged
                    expect(result.slot0.max).toBe(8) // preserved
                    expect(result.slot0.value).toBe(8)
                    expect(result.slot1.max).toBe(5) // preserved
                    expect(result.slot1.value).toBe(5)
                    expect(result.slot2.max).toBe(4) // preserved
                    expect(result.slot2.value).toBe(4)

                    // slot3+ from table (max=0)
                    expect(result.slot3.max).toBe(0)
                })

                it('when raising level: preserves existing slots unchanged, adds new slots from table', () => {
                    // A level 3 spontaneous caster with slots 0-2 populated
                    // Table for level 3: [5, 4, 3, 0, ...]
                    const currentSlots = {
                        slot0: { max: 5, value: 5, prepared: [] },
                        slot1: { max: 4, value: 4, prepared: [] },
                        slot2: { max: 3, value: 3, prepared: [] },
                    }

                    // Raise to level 5: table [5, 4, 4, 3, 0, ...]
                    const result = expandSpontaneousSlotsPreservingValues(
                        currentSlots,
                        '5',
                    )

                    // Existing slots kept entirely unchanged
                    expect(result.slot0.max).toBe(5) // preserved
                    expect(result.slot0.value).toBe(5)
                    expect(result.slot1.max).toBe(4) // preserved
                    expect(result.slot1.value).toBe(4)
                    expect(result.slot2.max).toBe(3) // preserved, NOT changed to 4
                    expect(result.slot2.value).toBe(3)

                    // slot3: NEW slot at level 5 - added from table (max=3)
                    expect(result.slot3.max).toBe(3)
                    expect(result.slot3.value).toBe(3)
                    expect(result.slot3.prepared).toHaveLength(0)

                    // slot4+: from table (max=0)
                    expect(result.slot4.max).toBe(0)
                })

                it('uses table values for slots with max=0', () => {
                    // A caster with some empty slots (max=0)
                    const currentSlots = {
                        slot0: { max: 5, value: 5, prepared: [] },
                        slot1: { max: 0, value: 0, prepared: [] }, // empty slot
                        slot2: { max: 0, value: 0, prepared: [] }, // empty slot
                    }

                    // Level 5 table: [5, 4, 4, 3, 0, ...]
                    const result = expandSpontaneousSlotsPreservingValues(
                        currentSlots,
                        '5',
                    )

                    // slot0: preserved (max > 0)
                    expect(result.slot0.max).toBe(5)

                    // slot1, slot2: were empty, now use table values
                    expect(result.slot1.max).toBe(4) // from table
                    expect(result.slot2.max).toBe(4) // from table

                    // slot3: from table
                    expect(result.slot3.max).toBe(3)
                })
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

        it('uses existingSlots when provided instead of generating new ones', () => {
            const customSlots = {
                slot0: { max: 7, value: 7, prepared: [] },
                slot1: { max: 5, value: 5, prepared: [] },
                slot2: { max: 4, value: 4, prepared: [] },
                slot3: { max: 2, value: 2, prepared: [] },
            }

            const entry = buildSpellcastingEntry({
                tradition: 'arcane',
                casterType: 'spontaneous',
                keyAttribute: 'cha',
                spellcastingBonus: 15,
                level: '5',
                slots: customSlots,
            }) as any

            // Should use the custom slots, not the generated ones for level 5 spontaneous
            expect(entry.system.slots).toBe(customSlots)
            expect(entry.system.slots.slot0.max).toBe(7) // Custom value, not 5
            expect(entry.system.slots.slot1.max).toBe(5) // Custom value, not 4
            expect(entry.system.slots.slot3.max).toBe(2) // Custom value, not 3
        })

        it('generates slots when existingSlots is undefined', () => {
            const entry = buildSpellcastingEntry({
                tradition: 'divine',
                casterType: 'prepared',
                keyAttribute: 'wis',
                spellcastingBonus: 10,
                level: '5',
                slots: undefined,
            }) as any

            // Should use generated slots for level 5 prepared
            expect(entry.system.slots.slot0.max).toBe(5)
            expect(entry.system.slots.slot1.max).toBe(3)
            expect(entry.system.slots.slot2.max).toBe(3)
            expect(entry.system.slots.slot3.max).toBe(2)
        })

        it('preserves creature-specific slot configuration with existingSlots', () => {
            // Simulate a creature with unusual slot distribution (e.g., a boss monster)
            const bossSlots = {
                slot0: { max: 5, value: 5, prepared: [] },
                slot1: { max: 0, value: 0, prepared: [] }, // No 1st level slots
                slot2: { max: 0, value: 0, prepared: [] }, // No 2nd level slots
                slot3: { max: 6, value: 6, prepared: [] }, // Many 3rd level slots
                slot4: { max: 6, value: 6, prepared: [] }, // Many 4th level slots
            }

            const entry = buildSpellcastingEntry({
                tradition: 'occult',
                casterType: 'spontaneous',
                keyAttribute: 'cha',
                spellcastingBonus: 18,
                level: '10',
                slots: bossSlots,
            }) as any

            // Should preserve the unusual distribution
            expect(entry.system.slots.slot1.max).toBe(0)
            expect(entry.system.slots.slot2.max).toBe(0)
            expect(entry.system.slots.slot3.max).toBe(6)
            expect(entry.system.slots.slot4.max).toBe(6)
        })
    })

    describe('parseSpellcastingFormData', () => {
        it('parses form data with all values set', () => {
            const formData = {
                [Statistics.spellcastingTradition]: MagicalTradition.divine,
                [Statistics.spellcastingType]: CasterType.prepared,
            }

            const result = parseSpellcastingFormData(formData)

            expect(result).toEqual({
                tradition: 'divine',
                casterType: 'prepared',
                keyAttribute: 'cha', // Always defaults to charisma
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

    describe('detectSpellcasting', () => {
        it('detects spellcasting level, tradition, and caster type', () => {
            const items = [
                {
                    type: 'spellcastingEntry',
                    system: {
                        spelldc: { dc: 22 },
                        tradition: { value: 'divine' },
                        prepared: { value: 'prepared' },
                    },
                },
            ]

            const result = detectSpellcasting(items as Iterable<Item>, '5')

            expect(result.spellcastingLevel).toBe(Options.high)
            expect(result.tradition).toBe(MagicalTradition.divine)
            expect(result.casterType).toBe(CasterType.prepared)
        })

        it('returns empty object when no spellcasting entries exist', () => {
            const items = [
                { type: 'weapon', system: {} },
                { type: 'armor', system: {} },
            ]

            const result = detectSpellcasting(items as Iterable<Item>, '5')

            expect(result.spellcastingLevel).toBeUndefined()
            expect(result.tradition).toBeUndefined()
            expect(result.casterType).toBeUndefined()
        })

        it('returns empty object for empty items', () => {
            const result = detectSpellcasting([], '5')

            expect(result.spellcastingLevel).toBeUndefined()
            expect(result.tradition).toBeUndefined()
            expect(result.casterType).toBeUndefined()
        })

        it('uses first spellcasting entry when multiple exist', () => {
            const items = [
                {
                    type: 'spellcastingEntry',
                    system: {
                        spelldc: { dc: 17 },
                        tradition: { value: 'arcane' },
                        prepared: { value: 'innate' },
                    },
                },
                {
                    type: 'spellcastingEntry',
                    system: {
                        spelldc: { dc: 22 },
                        tradition: { value: 'divine' },
                        prepared: { value: 'prepared' },
                    },
                },
            ]

            const result = detectSpellcasting(items as Iterable<Item>, '1')

            expect(result.tradition).toBe(MagicalTradition.arcane)
            expect(result.casterType).toBe(CasterType.innate)
        })

        it('handles spellcasting entry without tradition or caster type', () => {
            const items = [
                {
                    type: 'spellcastingEntry',
                    system: {
                        spelldc: { dc: 17 },
                    },
                },
            ]

            const result = detectSpellcasting(items as Iterable<Item>, '1')

            expect(result.spellcastingLevel).toBe(Options.high)
            expect(result.tradition).toBeUndefined()
            expect(result.casterType).toBeUndefined()
        })

        it('detects spell slots from spellcasting entry', () => {
            const slots = {
                slot0: { max: 5, value: 5, prepared: [] },
                slot1: { max: 3, value: 3, prepared: [] },
                slot2: { max: 2, value: 2, prepared: [] },
            }
            const items = [
                {
                    type: 'spellcastingEntry',
                    system: {
                        spelldc: { dc: 17 },
                        tradition: { value: 'arcane' },
                        prepared: { value: 'spontaneous' },
                        slots: slots,
                    },
                },
            ]

            const result = detectSpellcasting(items as Iterable<Item>, '1')

            expect(result.slots).toEqual(slots)
        })

        it('handles spellcasting entry without slots', () => {
            const items = [
                {
                    type: 'spellcastingEntry',
                    system: {
                        spelldc: { dc: 17 },
                        tradition: { value: 'arcane' },
                        prepared: { value: 'innate' },
                    },
                },
            ]

            const result = detectSpellcasting(items as Iterable<Item>, '1')

            expect(result.slots).toBeUndefined()
        })

        it('detects all tradition types', () => {
            const traditions = ['arcane', 'divine', 'occult', 'primal']
            const expectedEnums = [
                MagicalTradition.arcane,
                MagicalTradition.divine,
                MagicalTradition.occult,
                MagicalTradition.primal,
            ]

            traditions.forEach((tradition, index) => {
                const items = [
                    {
                        type: 'spellcastingEntry',
                        system: {
                            spelldc: { dc: 17 },
                            tradition: { value: tradition },
                            prepared: { value: 'innate' },
                        },
                    },
                ]

                const result = detectSpellcasting(items as Iterable<Item>, '1')
                expect(result.tradition).toBe(expectedEnums[index])
            })
        })

        it('detects all caster types', () => {
            const casterTypes = ['innate', 'prepared', 'spontaneous']
            const expectedEnums = [
                CasterType.innate,
                CasterType.prepared,
                CasterType.spontaneous,
            ]

            casterTypes.forEach((casterType, index) => {
                const items = [
                    {
                        type: 'spellcastingEntry',
                        system: {
                            spelldc: { dc: 17 },
                            tradition: { value: 'arcane' },
                            prepared: { value: casterType },
                        },
                    },
                ]

                const result = detectSpellcasting(items as Iterable<Item>, '1')
                expect(result.casterType).toBe(expectedEnums[index])
            })
        })

        it('detects spells with their slot assignments', () => {
            const spellcastingEntryId = 'entry123'
            const spell1Id = 'spell1'
            const spell2Id = 'spell2'

            const items = [
                {
                    id: spellcastingEntryId,
                    type: 'spellcastingEntry',
                    system: {
                        spelldc: { dc: 17 },
                        tradition: { value: 'arcane' },
                        prepared: { value: 'prepared' },
                        slots: {
                            slot0: {
                                max: 5,
                                value: 5,
                                prepared: [{ id: spell1Id, expended: false }],
                            },
                            slot1: {
                                max: 3,
                                value: 3,
                                prepared: [{ id: spell2Id, expended: false }],
                            },
                        },
                    },
                },
                {
                    id: spell1Id,
                    type: 'spell',
                    name: 'Daze',
                    system: {
                        location: { value: spellcastingEntryId },
                        level: { value: 1 },
                    },
                },
                {
                    id: spell2Id,
                    type: 'spell',
                    name: 'Magic Missile',
                    system: {
                        location: { value: spellcastingEntryId },
                        level: { value: 1 },
                    },
                },
            ]

            const result = detectSpellcasting(items as Iterable<Item>, '1')

            expect(result.spellcastingEntryId).toBe(spellcastingEntryId)
            expect(result.spells).toHaveLength(2)

            const dazeSpell = result.spells?.find(
                (s) => s.originalId === spell1Id,
            )
            expect(dazeSpell).toBeDefined()
            expect(dazeSpell?.slotKey).toBe('slot0')
            expect(dazeSpell?.slotIndex).toBe(0)
            expect(dazeSpell?.spellData.name).toBe('Daze')

            const mmSpell = result.spells?.find(
                (s) => s.originalId === spell2Id,
            )
            expect(mmSpell).toBeDefined()
            expect(mmSpell?.slotKey).toBe('slot1')
            expect(mmSpell?.slotIndex).toBe(0)
            expect(mmSpell?.spellData.name).toBe('Magic Missile')
        })

        it('detects same spell in multiple slots (prepared caster)', () => {
            const spellcastingEntryId = 'entry123'
            const fireballId = 'fireball'

            const items = [
                {
                    id: spellcastingEntryId,
                    type: 'spellcastingEntry',
                    system: {
                        spelldc: { dc: 17 },
                        tradition: { value: 'arcane' },
                        prepared: { value: 'prepared' },
                        slots: {
                            slot3: {
                                max: 3,
                                value: 3,
                                prepared: [
                                    { id: fireballId, expended: false },
                                    { id: fireballId, expended: false },
                                    { id: null, expended: false },
                                ],
                            },
                        },
                    },
                },
                {
                    id: fireballId,
                    type: 'spell',
                    name: 'Fireball',
                    system: {
                        location: { value: spellcastingEntryId },
                        level: { value: 3 },
                    },
                },
            ]

            const result = detectSpellcasting(items as Iterable<Item>, '1')

            expect(result.spellcastingEntryId).toBe(spellcastingEntryId)
            expect(result.spells).toHaveLength(2)

            const slot0 = result.spells?.find(
                (s) => s.slotKey === 'slot3' && s.slotIndex === 0,
            )
            const slot1 = result.spells?.find(
                (s) => s.slotKey === 'slot3' && s.slotIndex === 1,
            )
            expect(slot0).toBeDefined()
            expect(slot1).toBeDefined()
            expect(slot0?.originalId).toBe(fireballId)
            expect(slot1?.originalId).toBe(fireballId)
            expect(slot0?.spellData.name).toBe('Fireball')
            expect(slot1?.spellData.name).toBe('Fireball')
        })

        it('ignores spells not in slots', () => {
            const spellcastingEntryId = 'entry123'
            const spellInSlotId = 'spell1'
            const spellNotInSlotId = 'spell2'

            const items = [
                {
                    id: spellcastingEntryId,
                    type: 'spellcastingEntry',
                    system: {
                        spelldc: { dc: 17 },
                        tradition: { value: 'arcane' },
                        prepared: { value: 'prepared' },
                        slots: {
                            slot0: {
                                max: 5,
                                value: 5,
                                prepared: [
                                    { id: spellInSlotId, expended: false },
                                ],
                            },
                        },
                    },
                },
                {
                    id: spellInSlotId,
                    type: 'spell',
                    name: 'Daze',
                    system: {
                        location: { value: spellcastingEntryId },
                    },
                },
                {
                    id: spellNotInSlotId,
                    type: 'spell',
                    name: 'Unused Spell',
                    system: {
                        location: { value: spellcastingEntryId },
                    },
                },
            ]

            const result = detectSpellcasting(items as Iterable<Item>, '1')

            expect(result.spells).toHaveLength(1)
            expect(result.spells?.[0].originalId).toBe(spellInSlotId)
        })

        it('ignores spells belonging to different spellcasting entry', () => {
            const spellcastingEntryId = 'entry123'
            const otherEntryId = 'otherEntry'
            const spellId = 'spell1'

            const items = [
                {
                    id: spellcastingEntryId,
                    type: 'spellcastingEntry',
                    system: {
                        spelldc: { dc: 17 },
                        tradition: { value: 'arcane' },
                        prepared: { value: 'prepared' },
                        slots: {
                            slot0: {
                                max: 5,
                                value: 5,
                                prepared: [],
                            },
                        },
                    },
                },
                {
                    id: spellId,
                    type: 'spell',
                    name: 'Other Entry Spell',
                    system: {
                        location: { value: otherEntryId },
                    },
                },
            ]

            const result = detectSpellcasting(items as Iterable<Item>, '1')

            expect(result.spells).toBeUndefined()
        })
    })
})

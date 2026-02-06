import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InnateSpellCopyStrategy } from '@/spellcasting/InnateSpellCopyStrategy'
import type { SpellSlot } from '@/spellcasting/model/spellcasting'
import { PreparedSpellCopyStrategy } from '@/spellcasting/PreparedSpellCopyStrategy'
import { SpontaneousSpellCopyStrategy } from '@/spellcasting/SpontaneousSpellCopyStrategy'
import { createSpellCopyStrategy } from './SpellCopyStrategies'

describe('SpellCopyStrategies', () => {
    const mockParent = {} as any

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('createSpellCopyStrategy', () => {
        it('returns PreparedSpellCopyStrategy for prepared caster', () => {
            const strategy = createSpellCopyStrategy('prepared', mockParent)
            expect(strategy).toBeInstanceOf(PreparedSpellCopyStrategy)
        })

        it('returns SpontaneousSpellCopyStrategy for spontaneous caster', () => {
            const strategy = createSpellCopyStrategy('spontaneous', mockParent)
            expect(strategy).toBeInstanceOf(SpontaneousSpellCopyStrategy)
        })

        it('returns InnateSpellCopyStrategy for innate caster', () => {
            const strategy = createSpellCopyStrategy('innate', mockParent)
            expect(strategy).toBeInstanceOf(InnateSpellCopyStrategy)
        })

        it('returns null for unknown caster type', () => {
            const strategy = createSpellCopyStrategy('focus' as any, mockParent)
            expect(strategy).toBeNull()
        })
    })

    describe('PreparedSpellCopyStrategy', () => {
        it('buildInitialSlots preserves structure but clears IDs', () => {
            const strategy = new PreparedSpellCopyStrategy(mockParent)
            const detectedSlots: Record<string, SpellSlot> = {
                slot0: {
                    max: 5,
                    value: 5,
                    prepared: [
                        { id: 'spell1', expended: false },
                        { id: 'spell2', expended: true },
                    ],
                },
                slot1: {
                    max: 3,
                    value: 2,
                    prepared: [
                        { id: 'spell3', expended: false },
                        { id: null, expended: false },
                        { id: 'spell4', expended: false },
                    ],
                },
            }

            const result = strategy.buildInitialSlots(detectedSlots, '5')

            expect(result.slot0.max).toBe(5)
            expect(result.slot0.value).toBe(5)
            expect(result.slot0.prepared).toHaveLength(2)
            expect(result.slot0.prepared[0].id).toBeNull()
            expect(result.slot0.prepared[1].id).toBeNull()

            expect(result.slot1.max).toBe(3)
            expect(result.slot1.value).toBe(2)
            expect(result.slot1.prepared).toHaveLength(3)
            result.slot1.prepared.forEach((p) => {
                expect(p.id).toBeNull()
                expect(p.expended).toBe(false)
            })
        })
    })

    describe('SpontaneousSpellCopyStrategy', () => {
        it('buildInitialSlots generates fresh slots based on level', () => {
            const strategy = new SpontaneousSpellCopyStrategy(mockParent)
            const detectedSlots: Record<string, SpellSlot> = {
                slot0: { max: 10, value: 10, prepared: [] },
                slot1: { max: 10, value: 10, prepared: [] },
            }

            const result = strategy.buildInitialSlots(detectedSlots, '5')

            // Level 5 spontaneous: [5, 4, 4, 3, 0, ...]
            expect(result.slot0.max).toBe(5) // cantrips
            expect(result.slot1.max).toBe(4) // 1st level
            expect(result.slot2.max).toBe(4) // 2nd level
            expect(result.slot3.max).toBe(3) // 3rd level
            expect(result.slot4.max).toBe(0) // 4th level (not available at level 5)

            // Spontaneous prepared arrays should be empty
            expect(result.slot0.prepared).toEqual([])
            expect(result.slot1.prepared).toEqual([])
        })
    })

    describe('InnateSpellCopyStrategy', () => {
        it('buildInitialSlots generates innate slots (all zeros)', () => {
            const strategy = new InnateSpellCopyStrategy(mockParent)
            const detectedSlots: Record<string, SpellSlot> = {
                slot0: { max: 10, value: 10, prepared: [] },
                slot1: { max: 10, value: 10, prepared: [] },
            }

            const result = strategy.buildInitialSlots(detectedSlots, '5')

            // Innate slots are all zeros
            expect(result.slot0.max).toBe(0)
            expect(result.slot1.max).toBe(0)
            expect(result.slot2.max).toBe(0)

            // Innate prepared arrays should be empty
            expect(result.slot0.prepared).toEqual([])
            expect(result.slot1.prepared).toEqual([])
        })
    })
})

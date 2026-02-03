import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DetectedSpell, SpellSlot } from '@/model/spellcasting'
import { PreparedSpellCopyStrategy } from '@/spellcasting/PreparedSpellCopyStrategy'
import { SpontaneousSpellCopyStrategy } from '@/spellcasting/SpontaneousSpellCopyStrategy'
import { createSpellCopyStrategy } from './SpellCopyStrategies'

// Mock foundry globals
const mockFromUuid = vi.fn()
const mockItemCreate = vi.fn()

vi.stubGlobal('fromUuid', mockFromUuid)
vi.stubGlobal('Item', {
    create: mockItemCreate,
})

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

        it('returns null for innate caster', () => {
            const strategy = createSpellCopyStrategy('innate', mockParent)
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

        it('requiresSlotUpdate returns true', () => {
            const strategy = new PreparedSpellCopyStrategy(mockParent)
            expect(strategy.requiresSlotUpdate()).toBe(true)
        })

        it('handles spell with slot index out of bounds', async () => {
            const strategy = new PreparedSpellCopyStrategy(mockParent)

            mockItemCreate.mockResolvedValue({ id: 'newSpell1' })

            const detectedSpells: DetectedSpell[] = [
                {
                    originalId: 'oldSpell1',
                    slotKey: 'slot1',
                    slotIndex: 99, // Out of bounds index
                    spellData: { name: 'Orphan Spell', system: {} },
                },
            ]

            const detectedSlots: Record<string, SpellSlot> = {
                slot1: {
                    max: 2,
                    value: 2,
                    prepared: [{ id: 'oldSpell1', expended: false }], // Only 1 entry, but spell references index 99
                },
            }

            const result = await strategy.processSpells({
                detectedSpells,
                detectedSlots,
                newEntryId: 'newEntry123',
                level: '5',
            })

            // Spell is created but not assigned to slot (index out of bounds)
            expect(result.createdSpells).toHaveLength(1)
            expect(result.updatedSlots!.slot1.prepared[0].id).toBeNull()
        })

        it('handles spell referencing non-existent slot', async () => {
            const strategy = new PreparedSpellCopyStrategy(mockParent)

            mockItemCreate.mockResolvedValue({ id: 'newSpell1' })

            const detectedSpells: DetectedSpell[] = [
                {
                    originalId: 'oldSpell1',
                    slotKey: 'slot99', // Non-existent slot
                    slotIndex: 0,
                    spellData: { name: 'Lost Spell', system: {} },
                },
            ]

            const detectedSlots: Record<string, SpellSlot> = {
                slot1: {
                    max: 2,
                    value: 2,
                    prepared: [{ id: null, expended: false }],
                },
            }

            const result = await strategy.processSpells({
                detectedSpells,
                detectedSlots,
                newEntryId: 'newEntry123',
                level: '5',
            })

            // Spell is created but slot99 doesn't exist, so no assignment
            expect(result.createdSpells).toHaveLength(1)
            expect(result.updatedSlots!.slot1.prepared[0].id).toBeNull()
            expect(result.updatedSlots!.slot99).toBeUndefined()
        })

        it('processSpells creates spells and returns updated slots', async () => {
            const strategy = new PreparedSpellCopyStrategy(mockParent)

            mockItemCreate
                .mockResolvedValueOnce({ id: 'newSpell1' })
                .mockResolvedValueOnce({ id: 'newSpell2' })

            const detectedSpells: DetectedSpell[] = [
                {
                    originalId: 'oldSpell1',
                    slotKey: 'slot1',
                    slotIndex: 0,
                    spellData: { name: 'Fireball', system: {} },
                },
                {
                    originalId: 'oldSpell2',
                    slotKey: 'slot1',
                    slotIndex: 1,
                    spellData: { name: 'Magic Missile', system: {} },
                },
            ]

            const detectedSlots: Record<string, SpellSlot> = {
                slot0: { max: 5, value: 5, prepared: [] },
                slot1: {
                    max: 3,
                    value: 3,
                    prepared: [
                        { id: 'oldSpell1', expended: false },
                        { id: 'oldSpell2', expended: false },
                        { id: null, expended: false },
                    ],
                },
            }

            const result = await strategy.processSpells({
                detectedSpells,
                detectedSlots,
                newEntryId: 'newEntry123',
                level: '5',
            })

            expect(result.createdSpells).toHaveLength(2)
            expect(result.createdSpells[0].newId).toBe('newSpell1')
            expect(result.createdSpells[0].slotKey).toBe('slot1')
            expect(result.createdSpells[0].slotIndex).toBe(0)

            expect(result.updatedSlots).toBeDefined()
            expect(result.updatedSlots!.slot1.prepared[0].id).toBe('newSpell1')
            expect(result.updatedSlots!.slot1.prepared[1].id).toBe('newSpell2')
            expect(result.updatedSlots!.slot1.prepared[2].id).toBeNull()
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

        it('requiresSlotUpdate returns false', () => {
            const strategy = new SpontaneousSpellCopyStrategy(mockParent)
            expect(strategy.requiresSlotUpdate()).toBe(false)
        })

        it('processSpells creates spells without slot updates', async () => {
            const strategy = new SpontaneousSpellCopyStrategy(mockParent)

            mockItemCreate
                .mockResolvedValueOnce({ id: 'newSpell1' })
                .mockResolvedValueOnce({ id: 'newSpell2' })

            const detectedSpells: DetectedSpell[] = [
                {
                    originalId: 'oldSpell1',
                    slotKey: 'slot1',
                    slotIndex: 0,
                    spellData: { name: 'Fireball', system: {} },
                },
                {
                    originalId: 'oldSpell2',
                    slotKey: 'slot2',
                    slotIndex: 0,
                    spellData: { name: 'Invisibility', system: {} },
                },
            ]

            const detectedSlots: Record<string, SpellSlot> = {
                slot1: { max: 4, value: 4, prepared: [] },
                slot2: { max: 4, value: 4, prepared: [] },
            }

            const result = await strategy.processSpells({
                detectedSpells,
                detectedSlots,
                newEntryId: 'newEntry123',
                level: '5',
            })

            expect(result.createdSpells).toHaveLength(2)
            expect(result.updatedSlots).toBeUndefined()
        })

        it('processSpells deduplicates spells by compendium source', async () => {
            const strategy = new SpontaneousSpellCopyStrategy(mockParent)

            mockItemCreate.mockResolvedValue({ id: 'newSpell1' })

            const detectedSpells: DetectedSpell[] = [
                {
                    originalId: 'oldSpell1',
                    slotKey: 'slot1',
                    slotIndex: 0,
                    spellData: { name: 'Fireball', system: {} },
                    compendiumSource: 'Compendium.pf2e.spells.fireball',
                },
                {
                    originalId: 'oldSpell2',
                    slotKey: 'slot1',
                    slotIndex: 1,
                    spellData: { name: 'Fireball', system: {} },
                    compendiumSource: 'Compendium.pf2e.spells.fireball',
                },
            ]

            const detectedSlots: Record<string, SpellSlot> = {
                slot1: { max: 4, value: 4, prepared: [] },
            }

            const result = await strategy.processSpells({
                detectedSpells,
                detectedSlots,
                newEntryId: 'newEntry123',
                level: '5',
            })

            // Should only create one spell since both have the same compendium source
            expect(mockItemCreate).toHaveBeenCalledTimes(1)
            expect(result.createdSpells).toHaveLength(1)
        })

        it('processSpells deduplicates spells by name when no compendium source', async () => {
            const strategy = new SpontaneousSpellCopyStrategy(mockParent)

            mockItemCreate.mockResolvedValue({ id: 'newSpell1' })

            const detectedSpells: DetectedSpell[] = [
                {
                    originalId: 'oldSpell1',
                    slotKey: 'slot1',
                    slotIndex: 0,
                    spellData: { name: 'Fireball', system: {} },
                },
                {
                    originalId: 'oldSpell2',
                    slotKey: 'slot1',
                    slotIndex: 1,
                    spellData: { name: 'Fireball', system: {} },
                },
            ]

            const detectedSlots: Record<string, SpellSlot> = {
                slot1: { max: 4, value: 4, prepared: [] },
            }

            const result = await strategy.processSpells({
                detectedSpells,
                detectedSlots,
                newEntryId: 'newEntry123',
                level: '5',
            })

            // Should only create one spell since both have the same name
            expect(mockItemCreate).toHaveBeenCalledTimes(1)
            expect(result.createdSpells).toHaveLength(1)
        })
    })

    describe('spell creation from compendium', () => {
        it('uses compendium source when available with toObject method', async () => {
            const strategy = new PreparedSpellCopyStrategy(mockParent)

            const mockCompendiumSpell = {
                toObject: () => ({
                    name: 'Compendium Fireball',
                    system: { level: { value: 3 } },
                }),
            }
            mockFromUuid.mockResolvedValue(mockCompendiumSpell)
            mockItemCreate.mockResolvedValue({ id: 'newSpell1' })

            const detectedSpells: DetectedSpell[] = [
                {
                    originalId: 'oldSpell1',
                    slotKey: 'slot3',
                    slotIndex: 0,
                    spellData: { name: 'Fireball', system: {} },
                    compendiumSource: 'Compendium.pf2e.spells.fireball',
                },
            ]

            const detectedSlots: Record<string, SpellSlot> = {
                slot3: {
                    max: 2,
                    value: 2,
                    prepared: [{ id: 'oldSpell1', expended: false }],
                },
            }

            await strategy.processSpells({
                detectedSpells,
                detectedSlots,
                newEntryId: 'newEntry123',
                level: '5',
            })

            expect(mockFromUuid).toHaveBeenCalledWith(
                'Compendium.pf2e.spells.fireball',
            )
            expect(mockItemCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Compendium Fireball',
                    system: expect.objectContaining({
                        location: { value: 'newEntry123' },
                    }),
                }),
                expect.anything(),
            )
        })

        it('uses compendium spell directly when toObject is not available', async () => {
            const strategy = new PreparedSpellCopyStrategy(mockParent)

            // Compendium spell without toObject method
            const mockCompendiumSpell = {
                name: 'Direct Compendium Spell',
                system: { level: { value: 2 } },
            }
            mockFromUuid.mockResolvedValue(mockCompendiumSpell)
            mockItemCreate.mockResolvedValue({ id: 'newSpell1' })

            const detectedSpells: DetectedSpell[] = [
                {
                    originalId: 'oldSpell1',
                    slotKey: 'slot2',
                    slotIndex: 0,
                    spellData: { name: 'Fallback', system: {} },
                    compendiumSource: 'Compendium.pf2e.spells.spell',
                },
            ]

            const detectedSlots: Record<string, SpellSlot> = {
                slot2: {
                    max: 2,
                    value: 2,
                    prepared: [{ id: 'oldSpell1', expended: false }],
                },
            }

            await strategy.processSpells({
                detectedSpells,
                detectedSlots,
                newEntryId: 'newEntry123',
                level: '5',
            })

            expect(mockItemCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Direct Compendium Spell',
                    system: expect.objectContaining({
                        location: { value: 'newEntry123' },
                    }),
                }),
                expect.anything(),
            )
        })

        it('falls back to detected data when compendium returns null', async () => {
            const strategy = new PreparedSpellCopyStrategy(mockParent)

            mockFromUuid.mockResolvedValue(null)
            mockItemCreate.mockResolvedValue({ id: 'newSpell1' })

            const detectedSpells: DetectedSpell[] = [
                {
                    originalId: 'oldSpell1',
                    slotKey: 'slot3',
                    slotIndex: 0,
                    spellData: {
                        name: 'Local Spell',
                        system: { damage: '4d6' },
                    },
                    compendiumSource: 'Compendium.pf2e.spells.missing',
                },
            ]

            const detectedSlots: Record<string, SpellSlot> = {
                slot3: {
                    max: 2,
                    value: 2,
                    prepared: [{ id: 'oldSpell1', expended: false }],
                },
            }

            await strategy.processSpells({
                detectedSpells,
                detectedSlots,
                newEntryId: 'newEntry123',
                level: '5',
            })

            expect(mockItemCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Local Spell',
                    system: expect.objectContaining({
                        damage: '4d6',
                        location: { value: 'newEntry123' },
                    }),
                }),
                expect.anything(),
            )
        })

        it('falls back to detected data when compendium fetch fails', async () => {
            const strategy = new PreparedSpellCopyStrategy(mockParent)

            mockFromUuid.mockRejectedValue(new Error('Not found'))
            mockItemCreate.mockResolvedValue({ id: 'newSpell1' })

            const detectedSpells: DetectedSpell[] = [
                {
                    originalId: 'oldSpell1',
                    slotKey: 'slot3',
                    slotIndex: 0,
                    spellData: {
                        name: 'Local Fireball',
                        system: { damage: '6d6' },
                    },
                    compendiumSource: 'Compendium.pf2e.spells.fireball',
                },
            ]

            const detectedSlots: Record<string, SpellSlot> = {
                slot3: {
                    max: 2,
                    value: 2,
                    prepared: [{ id: 'oldSpell1', expended: false }],
                },
            }

            await strategy.processSpells({
                detectedSpells,
                detectedSlots,
                newEntryId: 'newEntry123',
                level: '5',
            })

            expect(mockItemCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Local Fireball',
                    system: expect.objectContaining({
                        damage: '6d6',
                        location: { value: 'newEntry123' },
                    }),
                }),
                expect.anything(),
            )
        })

        it('uses detected data when no compendium source exists', async () => {
            const strategy = new PreparedSpellCopyStrategy(mockParent)

            mockItemCreate.mockResolvedValue({ id: 'newSpell1' })

            const detectedSpells: DetectedSpell[] = [
                {
                    originalId: 'oldSpell1',
                    slotKey: 'slot1',
                    slotIndex: 0,
                    spellData: {
                        name: 'Custom Spell',
                        system: { custom: true },
                    },
                    // No compendiumSource
                },
            ]

            const detectedSlots: Record<string, SpellSlot> = {
                slot1: {
                    max: 2,
                    value: 2,
                    prepared: [{ id: 'oldSpell1', expended: false }],
                },
            }

            await strategy.processSpells({
                detectedSpells,
                detectedSlots,
                newEntryId: 'newEntry123',
                level: '5',
            })

            // Should NOT call fromUuid
            expect(mockFromUuid).not.toHaveBeenCalled()
            expect(mockItemCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Custom Spell',
                    system: expect.objectContaining({
                        custom: true,
                        location: { value: 'newEntry123' },
                    }),
                }),
                expect.anything(),
            )
        })

        it('handles Item.create returning null', async () => {
            const strategy = new PreparedSpellCopyStrategy(mockParent)

            mockItemCreate.mockResolvedValue(null)

            const detectedSpells: DetectedSpell[] = [
                {
                    originalId: 'oldSpell1',
                    slotKey: 'slot1',
                    slotIndex: 0,
                    spellData: { name: 'Failed Spell', system: {} },
                },
            ]

            const detectedSlots: Record<string, SpellSlot> = {
                slot1: {
                    max: 2,
                    value: 2,
                    prepared: [{ id: 'oldSpell1', expended: false }],
                },
            }

            const result = await strategy.processSpells({
                detectedSpells,
                detectedSlots,
                newEntryId: 'newEntry123',
                level: '5',
            })

            // Should not include failed spell in results
            expect(result.createdSpells).toHaveLength(0)
            // Slot should still have null ID
            expect(result.updatedSlots!.slot1.prepared[0].id).toBeNull()
        })
    })

    describe('SpontaneousSpellCopyStrategy deduplication edge cases', () => {
        it('deduplicates by name when no compendiumSource but name exists', async () => {
            const strategy = new SpontaneousSpellCopyStrategy(mockParent)

            mockItemCreate.mockResolvedValue({ id: 'newSpell1' })

            const detectedSpells: DetectedSpell[] = [
                {
                    originalId: 'spell1',
                    slotKey: 'slot1',
                    slotIndex: 0,
                    spellData: { name: 'Magic Missile', system: {} },
                    // No compendiumSource - will use name
                },
                {
                    originalId: 'spell2', // Different originalId
                    slotKey: 'slot1',
                    slotIndex: 1,
                    spellData: { name: 'Magic Missile', system: {} }, // Same name
                    // No compendiumSource - will use name
                },
            ]

            const detectedSlots: Record<string, SpellSlot> = {
                slot1: { max: 4, value: 4, prepared: [] },
            }

            const result = await strategy.processSpells({
                detectedSpells,
                detectedSlots,
                newEntryId: 'newEntry123',
                level: '5',
            })

            // Should only create one spell since both have the same name (no compendium source)
            expect(mockItemCreate).toHaveBeenCalledTimes(1)
            expect(result.createdSpells).toHaveLength(1)
        })

        it('deduplicates by originalId when no name or compendiumSource', async () => {
            const strategy = new SpontaneousSpellCopyStrategy(mockParent)

            mockItemCreate.mockResolvedValue({ id: 'newSpell1' })

            const detectedSpells: DetectedSpell[] = [
                {
                    originalId: 'uniqueId123',
                    slotKey: 'slot1',
                    slotIndex: 0,
                    spellData: { system: {} }, // No name
                },
                {
                    originalId: 'uniqueId123', // Same originalId
                    slotKey: 'slot1',
                    slotIndex: 1,
                    spellData: { system: {} },
                },
            ]

            const detectedSlots: Record<string, SpellSlot> = {
                slot1: { max: 4, value: 4, prepared: [] },
            }

            const result = await strategy.processSpells({
                detectedSpells,
                detectedSlots,
                newEntryId: 'newEntry123',
                level: '5',
            })

            // Should only create one spell since both have the same originalId
            expect(mockItemCreate).toHaveBeenCalledTimes(1)
            expect(result.createdSpells).toHaveLength(1)
        })

        it('handles Item.create returning null for spontaneous', async () => {
            const strategy = new SpontaneousSpellCopyStrategy(mockParent)

            mockItemCreate.mockResolvedValue(null)

            const detectedSpells: DetectedSpell[] = [
                {
                    originalId: 'oldSpell1',
                    slotKey: 'slot1',
                    slotIndex: 0,
                    spellData: { name: 'Failed Spell', system: {} },
                },
            ]

            const detectedSlots: Record<string, SpellSlot> = {
                slot1: { max: 4, value: 4, prepared: [] },
            }

            const result = await strategy.processSpells({
                detectedSpells,
                detectedSlots,
                newEntryId: 'newEntry123',
                level: '5',
            })

            // Should not include failed spell in results
            expect(result.createdSpells).toHaveLength(0)
            expect(result.updatedSlots).toBeUndefined()
        })
    })
})

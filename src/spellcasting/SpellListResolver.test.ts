import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MagicalTradition } from '@/Keys'
import type { SpellSlot } from '@/spellcasting/model/spellcasting'
import type { SpellList } from '@/spellcasting/model/spellList'
import {
    collectRequiredSlugs,
    getAvailableSpellLevels,
    resolveAndApplySpellList,
} from './SpellListResolver'

function makeSlot(
    max: number,
    prepared: { id: string | null; expended: boolean }[] = [],
): SpellSlot {
    return { max, value: max, prepared }
}

const testSpellList: SpellList = {
    name: 'Test List',
    tradition: MagicalTradition.arcane,
    levels: [
        {
            level: 0,
            spells: [{ slug: 'detect-magic' }, { slug: 'light' }],
        },
        {
            level: 1,
            spells: [{ slug: 'magic-missile' }, { slug: 'burning-hands' }],
        },
        {
            level: 2,
            spells: [{ slug: 'fireball', label: 'Fireball (Modified)' }],
        },
        {
            level: 3,
            spells: [{ slug: 'haste' }],
        },
    ],
}

describe('SpellListResolver', () => {
    describe('getAvailableSpellLevels', () => {
        it('returns levels with max > 0', () => {
            const slots: Record<string, SpellSlot> = {
                slot0: makeSlot(5),
                slot1: makeSlot(3),
                slot2: makeSlot(0),
                slot3: makeSlot(0),
            }
            const available = getAvailableSpellLevels(slots)
            expect(available).toEqual(new Set([0, 1]))
        })

        it('returns empty set for all-zero slots', () => {
            const slots: Record<string, SpellSlot> = {
                slot0: makeSlot(0),
                slot1: makeSlot(0),
            }
            const available = getAvailableSpellLevels(slots)
            expect(available.size).toBe(0)
        })

        it('handles full prepared caster slots', () => {
            const slots: Record<string, SpellSlot> = {
                slot0: makeSlot(5),
                slot1: makeSlot(3),
                slot2: makeSlot(3),
                slot3: makeSlot(2),
                slot4: makeSlot(0),
            }
            const available = getAvailableSpellLevels(slots)
            expect(available).toEqual(new Set([0, 1, 2, 3]))
        })

        it('ignores non-slot keys', () => {
            const slots = {
                slot0: makeSlot(5),
                slot1: makeSlot(2),
                other: makeSlot(10),
            } as Record<string, SpellSlot>
            const available = getAvailableSpellLevels(slots)
            expect(available).toEqual(new Set([0, 1]))
        })
    })

    describe('collectRequiredSlugs', () => {
        it('collects slugs only for available levels', () => {
            const available = new Set([0, 1])
            const slugs = collectRequiredSlugs(testSpellList, available)
            expect(slugs).toEqual(
                new Set([
                    'detect-magic',
                    'light',
                    'magic-missile',
                    'burning-hands',
                ]),
            )
        })

        it('returns empty set when no levels are available', () => {
            const available = new Set<number>()
            const slugs = collectRequiredSlugs(testSpellList, available)
            expect(slugs.size).toBe(0)
        })

        it('deduplicates slugs across levels', () => {
            const list: SpellList = {
                name: 'Dedup Test',
                tradition: MagicalTradition.arcane,
                levels: [
                    { level: 0, spells: [{ slug: 'light' }] },
                    { level: 1, spells: [{ slug: 'light' }, { slug: 'heal' }] },
                ],
            }
            const available = new Set([0, 1])
            const slugs = collectRequiredSlugs(list, available)
            expect(slugs).toEqual(new Set(['light', 'heal']))
        })

        it('includes all levels when all are available', () => {
            const available = new Set([0, 1, 2, 3])
            const slugs = collectRequiredSlugs(testSpellList, available)
            expect(slugs).toEqual(
                new Set([
                    'detect-magic',
                    'light',
                    'magic-missile',
                    'burning-hands',
                    'fireball',
                    'haste',
                ]),
            )
        })
    })

    describe('resolveAndApplySpellList', () => {
        let mockActor: any
        let mockPack: any
        let mockGetDocument: ReturnType<typeof vi.fn>
        let mockGetIndex: ReturnType<typeof vi.fn>
        let mockCreateEmbeddedDocuments: ReturnType<typeof vi.fn>

        beforeEach(() => {
            mockGetDocument = vi.fn()
            mockGetIndex = vi.fn()
            mockCreateEmbeddedDocuments = vi.fn().mockResolvedValue([])

            mockPack = {
                getIndex: mockGetIndex,
                getDocument: mockGetDocument,
            }

            mockActor = {
                items: [],
                createEmbeddedDocuments: mockCreateEmbeddedDocuments,
            }

            ;(globalThis as any).game = {
                packs: {
                    get: vi.fn().mockReturnValue(mockPack),
                },
            }
            ;(globalThis as any).foundry = {
                utils: {
                    deepClone: (obj: any) => JSON.parse(JSON.stringify(obj)),
                },
            }
        })

        it('does nothing when compendium pack is not found', async () => {
            ;(globalThis as any).game.packs.get = vi.fn().mockReturnValue(null)

            const slots = { slot0: makeSlot(5), slot1: makeSlot(2) }
            await resolveAndApplySpellList(
                testSpellList,
                slots,
                'entry-1',
                'spontaneous',
                mockActor,
            )

            expect(mockCreateEmbeddedDocuments).not.toHaveBeenCalled()
        })

        it('does nothing when no levels have available slots', async () => {
            const slots = { slot0: makeSlot(0), slot1: makeSlot(0) }
            await resolveAndApplySpellList(
                testSpellList,
                slots,
                'entry-1',
                'spontaneous',
                mockActor,
            )

            expect(mockGetIndex).not.toHaveBeenCalled()
        })

        it('resolves spells from compendium and creates items on actor', async () => {
            const slots = { slot0: makeSlot(5), slot1: makeSlot(2) }

            mockGetIndex.mockResolvedValue([
                {
                    _id: 'id-dm',
                    name: 'Detect Magic',
                    system: { slug: 'detect-magic' },
                },
                { _id: 'id-li', name: 'Light', system: { slug: 'light' } },
                {
                    _id: 'id-mm',
                    name: 'Magic Missile',
                    system: { slug: 'magic-missile' },
                },
                {
                    _id: 'id-bh',
                    name: 'Burning Hands',
                    system: { slug: 'burning-hands' },
                },
            ])

            const makeDoc = (id: string, name: string, slug: string) => ({
                toObject: () => ({
                    _id: id,
                    name,
                    type: 'spell',
                    system: { slug, location: { value: '' } },
                }),
            })

            mockGetDocument.mockImplementation((id: string) => {
                const docs: Record<string, any> = {
                    'id-dm': makeDoc('id-dm', 'Detect Magic', 'detect-magic'),
                    'id-li': makeDoc('id-li', 'Light', 'light'),
                    'id-mm': makeDoc('id-mm', 'Magic Missile', 'magic-missile'),
                    'id-bh': makeDoc('id-bh', 'Burning Hands', 'burning-hands'),
                }
                return Promise.resolve(docs[id] ?? null)
            })

            await resolveAndApplySpellList(
                testSpellList,
                slots,
                'entry-1',
                'spontaneous',
                mockActor,
            )

            expect(mockCreateEmbeddedDocuments).toHaveBeenCalledTimes(1)
            const [docType, items] = mockCreateEmbeddedDocuments.mock.calls[0]
            expect(docType).toBe('Item')
            expect(items).toHaveLength(4)
            expect(
                items.every(
                    (item: any) => item.system.location.value === 'entry-1',
                ),
            ).toBe(true)
            expect(items.every((item: any) => item._id === undefined)).toBe(
                true,
            )
        })

        it('applies label override when entry has a label', async () => {
            const slots = {
                slot0: makeSlot(0),
                slot1: makeSlot(0),
                slot2: makeSlot(1),
            }

            mockGetIndex.mockResolvedValue([
                {
                    _id: 'id-fb',
                    name: 'Fireball',
                    system: { slug: 'fireball' },
                },
            ])

            mockGetDocument.mockResolvedValue({
                toObject: () => ({
                    _id: 'id-fb',
                    name: 'Fireball',
                    type: 'spell',
                    system: { slug: 'fireball', location: { value: '' } },
                }),
            })

            await resolveAndApplySpellList(
                testSpellList,
                slots,
                'entry-1',
                'spontaneous',
                mockActor,
            )

            const [, items] = mockCreateEmbeddedDocuments.mock.calls[0]
            expect(items).toHaveLength(1)
            expect(items[0].name).toBe('Fireball (Modified)')
        })

        it('skips spells whose slug is not found in the compendium', async () => {
            const slots = { slot0: makeSlot(5) }

            mockGetIndex.mockResolvedValue([
                {
                    _id: 'id-dm',
                    name: 'Detect Magic',
                    system: { slug: 'detect-magic' },
                },
            ])

            mockGetDocument.mockResolvedValue({
                toObject: () => ({
                    _id: 'id-dm',
                    name: 'Detect Magic',
                    type: 'spell',
                    system: { slug: 'detect-magic', location: { value: '' } },
                }),
            })

            await resolveAndApplySpellList(
                testSpellList,
                slots,
                'entry-1',
                'spontaneous',
                mockActor,
            )

            const [, items] = mockCreateEmbeddedDocuments.mock.calls[0]
            expect(items).toHaveLength(1)
            expect(items[0].name).toBe('Detect Magic')
        })

        it('assigns prepared slots for prepared casters', async () => {
            const slots: Record<string, SpellSlot> = {
                slot0: makeSlot(5, [
                    { id: null, expended: false },
                    { id: null, expended: false },
                ]),
                slot1: makeSlot(2, [
                    { id: null, expended: false },
                    { id: null, expended: false },
                ]),
            }

            mockGetIndex.mockResolvedValue([
                {
                    _id: 'id-dm',
                    name: 'Detect Magic',
                    system: { slug: 'detect-magic' },
                },
                { _id: 'id-li', name: 'Light', system: { slug: 'light' } },
                {
                    _id: 'id-mm',
                    name: 'Magic Missile',
                    system: { slug: 'magic-missile' },
                },
                {
                    _id: 'id-bh',
                    name: 'Burning Hands',
                    system: { slug: 'burning-hands' },
                },
            ])

            const makeDoc = (id: string, name: string, slug: string) => ({
                toObject: () => ({
                    _id: id,
                    name,
                    type: 'spell',
                    system: { slug, location: { value: '' } },
                }),
            })

            mockGetDocument.mockImplementation((id: string) => {
                const docs: Record<string, any> = {
                    'id-dm': makeDoc('id-dm', 'Detect Magic', 'detect-magic'),
                    'id-li': makeDoc('id-li', 'Light', 'light'),
                    'id-mm': makeDoc('id-mm', 'Magic Missile', 'magic-missile'),
                    'id-bh': makeDoc('id-bh', 'Burning Hands', 'burning-hands'),
                }
                return Promise.resolve(docs[id] ?? null)
            })

            const createdItems = [
                { id: 'new-dm', name: 'Detect Magic' },
                { id: 'new-li', name: 'Light' },
                { id: 'new-mm', name: 'Magic Missile' },
                { id: 'new-bh', name: 'Burning Hands' },
            ]
            mockCreateEmbeddedDocuments.mockResolvedValue(createdItems)

            const mockUpdateEmbedded = vi.fn().mockResolvedValue([])
            mockActor.updateEmbeddedDocuments = mockUpdateEmbedded
            mockActor.items = [{ type: 'spellcastingEntry', id: 'entry-1' }]

            await resolveAndApplySpellList(
                testSpellList,
                slots,
                'entry-1',
                'prepared',
                mockActor,
            )

            expect(mockUpdateEmbedded).toHaveBeenCalledTimes(1)
            const [updateType, updates] = mockUpdateEmbedded.mock.calls[0]
            expect(updateType).toBe('Item')
            expect(updates[0]._id).toBe('entry-1')

            const updatedSlots = updates[0]['system.slots']
            expect(updatedSlots.slot0.prepared[0].id).toBe('new-dm')
            expect(updatedSlots.slot0.prepared[1].id).toBe('new-li')
            expect(updatedSlots.slot1.prepared[0].id).toBe('new-mm')
            expect(updatedSlots.slot1.prepared[1].id).toBe('new-bh')
        })

        it('skips index entries without system or slug', async () => {
            const slots = { slot0: makeSlot(5) }

            mockGetIndex.mockResolvedValue([
                { _id: 'id-no-system', name: 'No System' },
                { _id: 'id-no-slug', name: 'No Slug', system: {} },
                {
                    _id: 'id-dm',
                    name: 'Detect Magic',
                    system: { slug: 'detect-magic' },
                },
            ])

            mockGetDocument.mockResolvedValue({
                toObject: () => ({
                    _id: 'id-dm',
                    name: 'Detect Magic',
                    type: 'spell',
                    system: { slug: 'detect-magic', location: { value: '' } },
                }),
            })

            await resolveAndApplySpellList(
                testSpellList,
                slots,
                'entry-1',
                'spontaneous',
                mockActor,
            )

            const [, items] = mockCreateEmbeddedDocuments.mock.calls[0]
            expect(items).toHaveLength(1)
            expect(items[0].name).toBe('Detect Magic')
        })

        it('skips spells when getDocument returns null', async () => {
            const slots = { slot0: makeSlot(5) }

            mockGetIndex.mockResolvedValue([
                {
                    _id: 'id-dm',
                    name: 'Detect Magic',
                    system: { slug: 'detect-magic' },
                },
                { _id: 'id-li', name: 'Light', system: { slug: 'light' } },
            ])

            mockGetDocument.mockImplementation((id: string) => {
                if (id === 'id-dm') {
                    return Promise.resolve({
                        toObject: () => ({
                            _id: 'id-dm',
                            name: 'Detect Magic',
                            type: 'spell',
                            system: {
                                slug: 'detect-magic',
                                location: { value: '' },
                            },
                        }),
                    })
                }
                return Promise.resolve(null)
            })

            await resolveAndApplySpellList(
                testSpellList,
                slots,
                'entry-1',
                'spontaneous',
                mockActor,
            )

            const [, items] = mockCreateEmbeddedDocuments.mock.calls[0]
            expect(items).toHaveLength(1)
            expect(items[0].name).toBe('Detect Magic')
        })

        it('handles spell data without system property', async () => {
            const slots = { slot0: makeSlot(5) }

            mockGetIndex.mockResolvedValue([
                {
                    _id: 'id-dm',
                    name: 'Detect Magic',
                    system: { slug: 'detect-magic' },
                },
            ])

            mockGetDocument.mockResolvedValue({
                toObject: () => ({
                    _id: 'id-dm',
                    name: 'Detect Magic',
                    type: 'spell',
                }),
            })

            await resolveAndApplySpellList(
                testSpellList,
                slots,
                'entry-1',
                'spontaneous',
                mockActor,
            )

            const [, items] = mockCreateEmbeddedDocuments.mock.calls[0]
            expect(items).toHaveLength(1)
            expect(items[0].system).toBeUndefined()
        })

        it('logs and returns when all slugs resolve but no templates match', async () => {
            const singleSlugList: SpellList = {
                name: 'Empty Resolve',
                tradition: MagicalTradition.arcane,
                levels: [{ level: 0, spells: [{ slug: 'nonexistent-spell' }] }],
            }
            const slots = { slot0: makeSlot(5) }

            mockGetIndex.mockResolvedValue([])

            await resolveAndApplySpellList(
                singleSlugList,
                slots,
                'entry-1',
                'spontaneous',
                mockActor,
            )

            expect(mockCreateEmbeddedDocuments).not.toHaveBeenCalled()
        })

        it('does not update slots when spellcasting entry is not found on actor', async () => {
            const slots: Record<string, SpellSlot> = {
                slot0: makeSlot(5, [
                    { id: null, expended: false },
                    { id: null, expended: false },
                ]),
            }

            mockGetIndex.mockResolvedValue([
                {
                    _id: 'id-dm',
                    name: 'Detect Magic',
                    system: { slug: 'detect-magic' },
                },
                { _id: 'id-li', name: 'Light', system: { slug: 'light' } },
            ])

            const makeDoc = (id: string, name: string, slug: string) => ({
                toObject: () => ({
                    _id: id,
                    name,
                    type: 'spell',
                    system: { slug, location: { value: '' } },
                }),
            })

            mockGetDocument.mockImplementation((id: string) => {
                const docs: Record<string, any> = {
                    'id-dm': makeDoc('id-dm', 'Detect Magic', 'detect-magic'),
                    'id-li': makeDoc('id-li', 'Light', 'light'),
                }
                return Promise.resolve(docs[id] ?? null)
            })

            mockCreateEmbeddedDocuments.mockResolvedValue([
                { id: 'new-dm', name: 'Detect Magic' },
                { id: 'new-li', name: 'Light' },
            ])

            const mockUpdateEmbedded = vi.fn().mockResolvedValue([])
            mockActor.updateEmbeddedDocuments = mockUpdateEmbedded
            mockActor.items = [{ type: 'melee', id: 'strike-1' }]

            await resolveAndApplySpellList(
                testSpellList,
                slots,
                'entry-1',
                'prepared',
                mockActor,
            )

            expect(mockUpdateEmbedded).not.toHaveBeenCalled()
        })

        it('handles prepared slots without prepared array', async () => {
            const slots: Record<string, SpellSlot> = {
                slot0: { max: 5, value: 5, prepared: [] },
                slot1: makeSlot(2, [
                    { id: null, expended: false },
                    { id: null, expended: false },
                ]),
            }

            mockGetIndex.mockResolvedValue([
                {
                    _id: 'id-dm',
                    name: 'Detect Magic',
                    system: { slug: 'detect-magic' },
                },
                { _id: 'id-li', name: 'Light', system: { slug: 'light' } },
                {
                    _id: 'id-mm',
                    name: 'Magic Missile',
                    system: { slug: 'magic-missile' },
                },
                {
                    _id: 'id-bh',
                    name: 'Burning Hands',
                    system: { slug: 'burning-hands' },
                },
            ])

            const makeDoc = (id: string, name: string, slug: string) => ({
                toObject: () => ({
                    _id: id,
                    name,
                    type: 'spell',
                    system: { slug, location: { value: '' } },
                }),
            })

            mockGetDocument.mockImplementation((id: string) => {
                const docs: Record<string, any> = {
                    'id-dm': makeDoc('id-dm', 'Detect Magic', 'detect-magic'),
                    'id-li': makeDoc('id-li', 'Light', 'light'),
                    'id-mm': makeDoc('id-mm', 'Magic Missile', 'magic-missile'),
                    'id-bh': makeDoc('id-bh', 'Burning Hands', 'burning-hands'),
                }
                return Promise.resolve(docs[id] ?? null)
            })

            const createdItems = [
                { id: 'new-dm', name: 'Detect Magic' },
                { id: 'new-li', name: 'Light' },
                { id: 'new-mm', name: 'Magic Missile' },
                { id: 'new-bh', name: 'Burning Hands' },
            ]
            mockCreateEmbeddedDocuments.mockResolvedValue(createdItems)

            const mockUpdateEmbedded = vi.fn().mockResolvedValue([])
            mockActor.updateEmbeddedDocuments = mockUpdateEmbedded
            mockActor.items = [{ type: 'spellcastingEntry', id: 'entry-1' }]

            await resolveAndApplySpellList(
                testSpellList,
                slots,
                'entry-1',
                'prepared',
                mockActor,
            )

            expect(mockUpdateEmbedded).toHaveBeenCalledTimes(1)
            const updatedSlots =
                mockUpdateEmbedded.mock.calls[0][1][0]['system.slots']
            expect(updatedSlots.slot0.prepared).toHaveLength(0)
            expect(updatedSlots.slot1.prepared[0].id).toBe('new-mm')
            expect(updatedSlots.slot1.prepared[1].id).toBe('new-bh')
        })

        it('skips prepared slot assignment when slot key is missing from slots record', async () => {
            const listWithGap: SpellList = {
                name: 'Gap List',
                tradition: MagicalTradition.arcane,
                levels: [
                    {
                        level: 0,
                        spells: [{ slug: 'detect-magic' }],
                    },
                    {
                        level: 5,
                        spells: [{ slug: 'haste' }],
                    },
                ],
            }

            const slots: Record<string, SpellSlot> = {
                slot0: makeSlot(5, [{ id: null, expended: false }]),
                slot5: makeSlot(2, [{ id: null, expended: false }]),
            }

            mockGetIndex.mockResolvedValue([
                {
                    _id: 'id-dm',
                    name: 'Detect Magic',
                    system: { slug: 'detect-magic' },
                },
                { _id: 'id-ha', name: 'Haste', system: { slug: 'haste' } },
            ])

            const makeDoc = (id: string, name: string, slug: string) => ({
                toObject: () => ({
                    _id: id,
                    name,
                    type: 'spell',
                    system: { slug, location: { value: '' } },
                }),
            })

            mockGetDocument.mockImplementation((id: string) => {
                const docs: Record<string, any> = {
                    'id-dm': makeDoc('id-dm', 'Detect Magic', 'detect-magic'),
                    'id-ha': makeDoc('id-ha', 'Haste', 'haste'),
                }
                return Promise.resolve(docs[id] ?? null)
            })

            mockCreateEmbeddedDocuments.mockResolvedValue([
                { id: 'new-dm', name: 'Detect Magic' },
                { id: 'new-ha', name: 'Haste' },
            ])

            const mockUpdateEmbedded = vi.fn().mockResolvedValue([])
            mockActor.updateEmbeddedDocuments = mockUpdateEmbedded
            mockActor.items = [{ type: 'spellcastingEntry', id: 'entry-1' }]

            await resolveAndApplySpellList(
                listWithGap,
                slots,
                'entry-1',
                'prepared',
                mockActor,
            )

            expect(mockUpdateEmbedded).toHaveBeenCalledTimes(1)
            const updatedSlots =
                mockUpdateEmbedded.mock.calls[0][1][0]['system.slots']
            expect(updatedSlots.slot0.prepared[0].id).toBe('new-dm')
            expect(updatedSlots.slot5.prepared[0].id).toBe('new-ha')
        })

        it('handles more spells in list than created items available', async () => {
            const bigList: SpellList = {
                name: 'Big List',
                tradition: MagicalTradition.arcane,
                levels: [
                    {
                        level: 0,
                        spells: [
                            { slug: 'detect-magic' },
                            { slug: 'light' },
                            { slug: 'detect-magic' },
                        ],
                    },
                ],
            }

            const slots: Record<string, SpellSlot> = {
                slot0: makeSlot(5, [
                    { id: null, expended: false },
                    { id: null, expended: false },
                    { id: null, expended: false },
                ]),
            }

            mockGetIndex.mockResolvedValue([
                {
                    _id: 'id-dm',
                    name: 'Detect Magic',
                    system: { slug: 'detect-magic' },
                },
                { _id: 'id-li', name: 'Light', system: { slug: 'light' } },
            ])

            const makeDoc = (id: string, name: string, slug: string) => ({
                toObject: () => ({
                    _id: id,
                    name,
                    type: 'spell',
                    system: { slug, location: { value: '' } },
                }),
            })

            mockGetDocument.mockImplementation((id: string) => {
                const docs: Record<string, any> = {
                    'id-dm': makeDoc('id-dm', 'Detect Magic', 'detect-magic'),
                    'id-li': makeDoc('id-li', 'Light', 'light'),
                }
                return Promise.resolve(docs[id] ?? null)
            })

            mockCreateEmbeddedDocuments.mockResolvedValue([
                { id: 'new-dm1', name: 'Detect Magic' },
                { id: 'new-li', name: 'Light' },
            ])

            const mockUpdateEmbedded = vi.fn().mockResolvedValue([])
            mockActor.updateEmbeddedDocuments = mockUpdateEmbedded
            mockActor.items = [{ type: 'spellcastingEntry', id: 'entry-1' }]

            await resolveAndApplySpellList(
                bigList,
                slots,
                'entry-1',
                'prepared',
                mockActor,
            )

            expect(mockUpdateEmbedded).toHaveBeenCalledTimes(1)
            const updatedSlots =
                mockUpdateEmbedded.mock.calls[0][1][0]['system.slots']
            expect(updatedSlots.slot0.prepared[0].id).toBe('new-dm1')
            expect(updatedSlots.slot0.prepared[1].id).toBe('new-li')
            expect(updatedSlots.slot0.prepared[2].id).toBe('new-dm1')
        })

        it('skips prepared slot when slot object is undefined after clone', async () => {
            const singleLevelList: SpellList = {
                name: 'Single',
                tradition: MagicalTradition.arcane,
                levels: [
                    {
                        level: 0,
                        spells: [{ slug: 'detect-magic' }],
                    },
                ],
            }

            const slots: Record<string, SpellSlot> = {
                slot0: makeSlot(5, [{ id: null, expended: false }]),
            }

            mockGetIndex.mockResolvedValue([
                {
                    _id: 'id-dm',
                    name: 'Detect Magic',
                    system: { slug: 'detect-magic' },
                },
            ])

            mockGetDocument.mockResolvedValue({
                toObject: () => ({
                    _id: 'id-dm',
                    name: 'Detect Magic',
                    type: 'spell',
                    system: {
                        slug: 'detect-magic',
                        location: { value: '' },
                    },
                }),
            })

            mockCreateEmbeddedDocuments.mockResolvedValue([
                { id: 'new-dm', name: 'Detect Magic' },
            ])

            const mockUpdateEmbedded = vi.fn().mockResolvedValue([])
            mockActor.updateEmbeddedDocuments = mockUpdateEmbedded
            mockActor.items = [{ type: 'spellcastingEntry', id: 'entry-1' }]

            const originalDeepClone = (globalThis as any).foundry.utils
                .deepClone
            ;(globalThis as any).foundry.utils.deepClone = (obj: any) => {
                const cloned = originalDeepClone(obj)
                delete cloned.slot0
                return cloned
            }

            await resolveAndApplySpellList(
                singleLevelList,
                slots,
                'entry-1',
                'prepared',
                mockActor,
            )

            ;(globalThis as any).foundry.utils.deepClone = originalDeepClone

            expect(mockUpdateEmbedded).toHaveBeenCalledTimes(1)
            const updatedSlots =
                mockUpdateEmbedded.mock.calls[0][1][0]['system.slots']
            expect(updatedSlots.slot0).toBeUndefined()
        })

        it('assigns prepared slots correctly when some slugs are unresolved', async () => {
            const listWithUnresolved: SpellList = {
                name: 'Partial Resolve',
                tradition: MagicalTradition.arcane,
                levels: [
                    {
                        level: 0,
                        spells: [
                            { slug: 'detect-magic' },
                            { slug: 'missing-cantrip' },
                        ],
                    },
                    {
                        level: 1,
                        spells: [{ slug: 'magic-missile' }],
                    },
                ],
            }

            const slots: Record<string, SpellSlot> = {
                slot0: makeSlot(5, [
                    { id: null, expended: false },
                    { id: null, expended: false },
                ]),
                slot1: makeSlot(2, [{ id: null, expended: false }]),
            }

            mockGetIndex.mockResolvedValue([
                {
                    _id: 'id-dm',
                    name: 'Detect Magic',
                    system: { slug: 'detect-magic' },
                },
                {
                    _id: 'id-mm',
                    name: 'Magic Missile',
                    system: { slug: 'magic-missile' },
                },
            ])

            const makeDoc = (id: string, name: string, slug: string) => ({
                toObject: () => ({
                    _id: id,
                    name,
                    type: 'spell',
                    system: { slug, location: { value: '' } },
                }),
            })

            mockGetDocument.mockImplementation((id: string) => {
                const docs: Record<string, any> = {
                    'id-dm': makeDoc('id-dm', 'Detect Magic', 'detect-magic'),
                    'id-mm': makeDoc('id-mm', 'Magic Missile', 'magic-missile'),
                }
                return Promise.resolve(docs[id] ?? null)
            })

            mockCreateEmbeddedDocuments.mockResolvedValue([
                { id: 'new-dm', name: 'Detect Magic' },
                { id: 'new-mm', name: 'Magic Missile' },
            ])

            const mockUpdateEmbedded = vi.fn().mockResolvedValue([])
            mockActor.updateEmbeddedDocuments = mockUpdateEmbedded
            mockActor.items = [{ type: 'spellcastingEntry', id: 'entry-1' }]

            await resolveAndApplySpellList(
                listWithUnresolved,
                slots,
                'entry-1',
                'prepared',
                mockActor,
            )

            expect(mockUpdateEmbedded).toHaveBeenCalledTimes(1)
            const updatedSlots =
                mockUpdateEmbedded.mock.calls[0][1][0]['system.slots']

            expect(updatedSlots.slot0.prepared[0].id).toBe('new-dm')
            expect(updatedSlots.slot0.prepared[1]).toEqual({
                id: null,
                expended: false,
            })
            expect(updatedSlots.slot1.prepared[0].id).toBe('new-mm')
        })

        it('applies label override for prepared casters', async () => {
            const labelList: SpellList = {
                name: 'Label Test',
                tradition: MagicalTradition.arcane,
                levels: [
                    {
                        level: 1,
                        spells: [
                            {
                                slug: 'elemental-form',
                                label: 'Elemental Form (Fire Only)',
                            },
                        ],
                    },
                ],
            }

            const slots: Record<string, SpellSlot> = {
                slot1: makeSlot(2, [{ id: null, expended: false }]),
            }

            mockGetIndex.mockResolvedValue([
                {
                    _id: 'id-ef',
                    name: 'Elemental Form',
                    system: { slug: 'elemental-form' },
                },
            ])

            mockGetDocument.mockResolvedValue({
                toObject: () => ({
                    _id: 'id-ef',
                    name: 'Elemental Form',
                    type: 'spell',
                    system: {
                        slug: 'elemental-form',
                        location: { value: '' },
                    },
                }),
            })

            mockCreateEmbeddedDocuments.mockResolvedValue([
                { id: 'new-ef', name: 'Elemental Form (Fire Only)' },
            ])

            const mockUpdateEmbedded = vi.fn().mockResolvedValue([])
            mockActor.updateEmbeddedDocuments = mockUpdateEmbedded
            mockActor.items = [{ type: 'spellcastingEntry', id: 'entry-1' }]

            await resolveAndApplySpellList(
                labelList,
                slots,
                'entry-1',
                'prepared',
                mockActor,
            )

            const [, items] = mockCreateEmbeddedDocuments.mock.calls[0]
            expect(items).toHaveLength(1)
            expect(items[0].name).toBe('Elemental Form (Fire Only)')
        })

        it('returns early when no spells resolve for prepared casters', async () => {
            const emptyList: SpellList = {
                name: 'Empty Prepared',
                tradition: MagicalTradition.arcane,
                levels: [
                    {
                        level: 0,
                        spells: [{ slug: 'nonexistent' }],
                    },
                ],
            }

            const slots: Record<string, SpellSlot> = {
                slot0: makeSlot(5, [{ id: null, expended: false }]),
            }

            mockGetIndex.mockResolvedValue([])

            mockActor.items = [{ type: 'spellcastingEntry', id: 'entry-1' }]

            await resolveAndApplySpellList(
                emptyList,
                slots,
                'entry-1',
                'prepared',
                mockActor,
            )

            expect(mockCreateEmbeddedDocuments).not.toHaveBeenCalled()
        })

        it('deduplicates spells for spontaneous casters across levels', async () => {
            const dupList: SpellList = {
                name: 'Dup Spontaneous',
                tradition: MagicalTradition.arcane,
                levels: [
                    { level: 1, spells: [{ slug: 'breathe-fire' }] },
                    {
                        level: 2,
                        spells: [
                            { slug: 'blazing-bolt' },
                            { slug: 'breathe-fire' },
                        ],
                    },
                ],
            }

            const slots = { slot1: makeSlot(2), slot2: makeSlot(2) }

            mockGetIndex.mockResolvedValue([
                {
                    _id: 'id-bf',
                    name: 'Breathe Fire',
                    system: { slug: 'breathe-fire' },
                },
                {
                    _id: 'id-bb',
                    name: 'Blazing Bolt',
                    system: { slug: 'blazing-bolt' },
                },
            ])

            const makeDoc = (
                id: string,
                name: string,
                slug: string,
                level: number,
            ) => ({
                toObject: () => ({
                    _id: id,
                    name,
                    type: 'spell',
                    system: {
                        slug,
                        level: { value: level },
                        location: { value: '' },
                    },
                }),
            })

            mockGetDocument.mockImplementation((id: string) => {
                const docs: Record<string, any> = {
                    'id-bf': makeDoc(
                        'id-bf',
                        'Breathe Fire',
                        'breathe-fire',
                        1,
                    ),
                    'id-bb': makeDoc(
                        'id-bb',
                        'Blazing Bolt',
                        'blazing-bolt',
                        2,
                    ),
                }
                return Promise.resolve(docs[id] ?? null)
            })

            await resolveAndApplySpellList(
                dupList,
                slots,
                'entry-1',
                'spontaneous',
                mockActor,
            )

            expect(mockCreateEmbeddedDocuments).toHaveBeenCalledTimes(1)
            const [docType, items] = mockCreateEmbeddedDocuments.mock.calls[0]
            expect(docType).toBe('Item')
            expect(items).toHaveLength(2)

            const breatheFire = items.find(
                (i: any) => i.system.slug === 'breathe-fire',
            )
            const blazingBolt = items.find(
                (i: any) => i.system.slug === 'blazing-bolt',
            )

            expect(breatheFire).toBeDefined()
            expect(blazingBolt).toBeDefined()

            // breathe-fire keeps its base rank (1) — spontaneous heightening is implicit
            expect(breatheFire.system.level.value).toBe(1)
            expect(blazingBolt.system.level.value).toBe(2)

            // both are linked to the spellcasting entry
            expect(breatheFire.system.location.value).toBe('entry-1')
            expect(blazingBolt.system.location.value).toBe('entry-1')

            // _id is stripped so Foundry creates new documents
            expect(breatheFire._id).toBeUndefined()
            expect(blazingBolt._id).toBeUndefined()
        })

        it('deduplicates spells for prepared casters and reuses IDs across slots', async () => {
            const dupList: SpellList = {
                name: 'Dup Prepared',
                tradition: MagicalTradition.arcane,
                levels: [
                    { level: 1, spells: [{ slug: 'breathe-fire' }] },
                    {
                        level: 2,
                        spells: [
                            { slug: 'blazing-bolt' },
                            { slug: 'breathe-fire' },
                        ],
                    },
                ],
            }

            const slots: Record<string, SpellSlot> = {
                slot1: makeSlot(2, [{ id: null, expended: false }]),
                slot2: makeSlot(2, [
                    { id: null, expended: false },
                    { id: null, expended: false },
                ]),
            }

            mockGetIndex.mockResolvedValue([
                {
                    _id: 'id-bf',
                    name: 'Breathe Fire',
                    system: { slug: 'breathe-fire' },
                },
                {
                    _id: 'id-bb',
                    name: 'Blazing Bolt',
                    system: { slug: 'blazing-bolt' },
                },
            ])

            const makeDoc = (id: string, name: string, slug: string) => ({
                toObject: () => ({
                    _id: id,
                    name,
                    type: 'spell',
                    system: { slug, location: { value: '' } },
                }),
            })

            mockGetDocument.mockImplementation((id: string) => {
                const docs: Record<string, any> = {
                    'id-bf': makeDoc('id-bf', 'Breathe Fire', 'breathe-fire'),
                    'id-bb': makeDoc('id-bb', 'Blazing Bolt', 'blazing-bolt'),
                }
                return Promise.resolve(docs[id] ?? null)
            })

            mockCreateEmbeddedDocuments.mockResolvedValue([
                { id: 'new-bf', name: 'Breathe Fire' },
                { id: 'new-bb', name: 'Blazing Bolt' },
            ])

            const mockUpdateEmbedded = vi.fn().mockResolvedValue([])
            mockActor.updateEmbeddedDocuments = mockUpdateEmbedded
            mockActor.items = [{ type: 'spellcastingEntry', id: 'entry-1' }]

            await resolveAndApplySpellList(
                dupList,
                slots,
                'entry-1',
                'prepared',
                mockActor,
            )

            expect(mockCreateEmbeddedDocuments).toHaveBeenCalledTimes(1)
            const [, items] = mockCreateEmbeddedDocuments.mock.calls[0]
            expect(items).toHaveLength(2)

            expect(mockUpdateEmbedded).toHaveBeenCalledTimes(1)
            const updatedSlots =
                mockUpdateEmbedded.mock.calls[0][1][0]['system.slots']
            expect(updatedSlots.slot1.prepared[0].id).toBe('new-bf')
            expect(updatedSlots.slot2.prepared[0].id).toBe('new-bb')
            expect(updatedSlots.slot2.prepared[1].id).toBe('new-bf')
        })

        it('creates separate spell documents per level for innate casters with heightenedLevel and uses', async () => {
            const innateList: SpellList = {
                name: 'Innate Fire',
                tradition: MagicalTradition.primal,
                levels: [
                    {
                        level: 0,
                        spells: [{ slug: 'detect-magic' }],
                    },
                    {
                        level: 1,
                        spells: [{ slug: 'breathe-fire' }],
                    },
                    {
                        level: 2,
                        spells: [
                            { slug: 'blazing-bolt' },
                            { slug: 'breathe-fire' },
                        ],
                    },
                ],
            }

            const slots = {
                slot0: makeSlot(5),
                slot1: makeSlot(2),
                slot2: makeSlot(2),
            }

            mockGetIndex.mockResolvedValue([
                {
                    _id: 'id-dm',
                    name: 'Detect Magic',
                    system: { slug: 'detect-magic' },
                },
                {
                    _id: 'id-bf',
                    name: 'Breathe Fire',
                    system: { slug: 'breathe-fire' },
                },
                {
                    _id: 'id-bb',
                    name: 'Blazing Bolt',
                    system: { slug: 'blazing-bolt' },
                },
            ])

            const makeDoc = (
                id: string,
                name: string,
                slug: string,
                level: number,
            ) => ({
                toObject: () => ({
                    _id: id,
                    name,
                    type: 'spell',
                    system: {
                        slug,
                        level: { value: level },
                        location: { value: '' },
                    },
                }),
            })

            mockGetDocument.mockImplementation((id: string) => {
                const docs: Record<string, any> = {
                    'id-dm': makeDoc(
                        'id-dm',
                        'Detect Magic',
                        'detect-magic',
                        0,
                    ),
                    'id-bf': makeDoc(
                        'id-bf',
                        'Breathe Fire',
                        'breathe-fire',
                        1,
                    ),
                    'id-bb': makeDoc(
                        'id-bb',
                        'Blazing Bolt',
                        'blazing-bolt',
                        2,
                    ),
                }
                return Promise.resolve(docs[id] ?? null)
            })

            await resolveAndApplySpellList(
                innateList,
                slots,
                'entry-1',
                'innate',
                mockActor,
            )

            expect(mockCreateEmbeddedDocuments).toHaveBeenCalledTimes(1)
            const [docType, items] = mockCreateEmbeddedDocuments.mock.calls[0]
            expect(docType).toBe('Item')
            // 4 items: detect-magic@0, breathe-fire@1, blazing-bolt@2, breathe-fire@2
            expect(items).toHaveLength(4)

            const detectMagic = items[0]
            expect(detectMagic.system.slug).toBe('detect-magic')
            expect(detectMagic.system.location.value).toBe('entry-1')
            expect(detectMagic.system.location.heightenedLevel).toBe(0)
            expect(detectMagic.system.location.uses).toBeUndefined()
            expect(detectMagic._id).toBeUndefined()

            const breatheFireL1 = items[1]
            expect(breatheFireL1.system.slug).toBe('breathe-fire')
            expect(breatheFireL1.system.location.heightenedLevel).toBe(1)
            expect(breatheFireL1.system.location.uses).toEqual({
                value: 1,
                max: 1,
            })

            const blazingBolt = items[2]
            expect(blazingBolt.system.slug).toBe('blazing-bolt')
            expect(blazingBolt.system.location.heightenedLevel).toBe(2)
            expect(blazingBolt.system.location.uses).toEqual({
                value: 1,
                max: 1,
            })

            const breatheFireL2 = items[3]
            expect(breatheFireL2.system.slug).toBe('breathe-fire')
            expect(breatheFireL2.system.location.heightenedLevel).toBe(2)
            expect(breatheFireL2.system.location.uses).toEqual({
                value: 1,
                max: 1,
            })
        })

        it('applies label override for innate casters', async () => {
            const innateList: SpellList = {
                name: 'Innate Label',
                tradition: MagicalTradition.arcane,
                levels: [
                    {
                        level: 5,
                        spells: [
                            {
                                slug: 'elemental-form',
                                label: 'Elemental Form (Fire Only)',
                            },
                        ],
                    },
                ],
            }

            const slots = { slot5: makeSlot(2) }

            mockGetIndex.mockResolvedValue([
                {
                    _id: 'id-ef',
                    name: 'Elemental Form',
                    system: { slug: 'elemental-form' },
                },
            ])

            mockGetDocument.mockResolvedValue({
                toObject: () => ({
                    _id: 'id-ef',
                    name: 'Elemental Form',
                    type: 'spell',
                    system: {
                        slug: 'elemental-form',
                        location: { value: '' },
                    },
                }),
            })

            await resolveAndApplySpellList(
                innateList,
                slots,
                'entry-1',
                'innate',
                mockActor,
            )

            const [, items] = mockCreateEmbeddedDocuments.mock.calls[0]
            expect(items).toHaveLength(1)
            expect(items[0].name).toBe('Elemental Form (Fire Only)')
            expect(items[0].system.location.heightenedLevel).toBe(5)
            expect(items[0].system.location.uses).toEqual({
                value: 1,
                max: 1,
            })
        })

        it('returns early when no spells resolve for innate casters', async () => {
            const emptyList: SpellList = {
                name: 'Empty Innate',
                tradition: MagicalTradition.arcane,
                levels: [{ level: 1, spells: [{ slug: 'nonexistent' }] }],
            }

            const slots = { slot1: makeSlot(2) }

            mockGetIndex.mockResolvedValue([])

            await resolveAndApplySpellList(
                emptyList,
                slots,
                'entry-1',
                'innate',
                mockActor,
            )

            expect(mockCreateEmbeddedDocuments).not.toHaveBeenCalled()
        })
    })
})

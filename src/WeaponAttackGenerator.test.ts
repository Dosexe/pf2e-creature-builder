import { beforeEach, describe, expect, it, vi } from 'vitest'
import { globalLog } from '@/utils'
import {
    attacksFromWeapon,
    GENERATE_ATTACKS_FROM_WEAPONS,
    isGenerateAttacksEnabled,
    type NpcAttackContext,
} from './WeaponAttackGenerator'

vi.mock('@/utils', () => ({ globalLog: vi.fn() }))

const attackContext = (
    overrides: Partial<NpcAttackContext> = {},
): NpcAttackContext => ({
    level: 1,
    strength: 0,
    dexterity: 0,
    ...overrides,
})

describe('isGenerateAttacksEnabled', () => {
    it('accepts the checked checkbox values', () => {
        expect(
            isGenerateAttacksEnabled({
                [GENERATE_ATTACKS_FROM_WEAPONS]: true,
            }),
        ).toBe(true)
        expect(
            isGenerateAttacksEnabled({
                [GENERATE_ATTACKS_FROM_WEAPONS]: 'true',
            }),
        ).toBe(true)
        expect(
            isGenerateAttacksEnabled({
                [GENERATE_ATTACKS_FROM_WEAPONS]: 'on',
            }),
        ).toBe(true)
    })

    it('rejects missing and unchecked values', () => {
        expect(isGenerateAttacksEnabled({})).toBe(false)
        expect(
            isGenerateAttacksEnabled({
                [GENERATE_ATTACKS_FROM_WEAPONS]: false,
            }),
        ).toBe(false)
        expect(
            isGenerateAttacksEnabled({
                [GENERATE_ATTACKS_FROM_WEAPONS]: 'false',
            }),
        ).toBe(false)
        expect(
            isGenerateAttacksEnabled({
                [GENERATE_ATTACKS_FROM_WEAPONS]: 1,
            }),
        ).toBe(false)
    })
})

describe('PF2E generate attack values', () => {
    it('matches a level 10 sickle generated from the NPC sheet button', () => {
        const [attack] = attacksFromWeapon(
            {
                source: {
                    name: 'Sickle',
                    system: {
                        damage: { dice: 1, die: 'd4', damageType: 'slashing' },
                    },
                },
            },
            attackContext({ level: 10, strength: 5 }),
        )

        expect(attack.system).toMatchObject({
            bonus: { value: 22 },
            damageRolls: {
                strikeDamageID: {
                    damage: '3d4+8',
                    damageType: 'slashing',
                },
            },
        })
    })

    it('uses dexterity for ranged weapons and strength for thrown weapons', () => {
        const [bow] = attacksFromWeapon(
            {
                source: {
                    name: 'Shortbow',
                    system: {
                        range: 60,
                        damage: { die: 'd6', damageType: 'piercing' },
                    },
                },
            },
            attackContext({ level: 10, strength: 5, dexterity: 2 }),
        )
        expect(bow.system).toMatchObject({
            bonus: { value: 22 },
            damageRolls: { strikeDamageID: { damage: '3d6+5' } },
        })

        const [thrown] = attacksFromWeapon(
            {
                source: {
                    name: 'Dagger',
                    system: {
                        range: 10,
                        damage: { die: 'd4', damageType: 'piercing' },
                        traits: { value: ['thrown-10', 'agile'] },
                    },
                },
            },
            attackContext({ level: 2, strength: 4, dexterity: 1 }),
        )
        expect(thrown.system).toMatchObject({
            bonus: { value: 10 },
            damageRolls: { strikeDamageID: { damage: '1d4+5' } },
        })
    })

    it('omits a zero modifier and keeps a penalty', () => {
        const [plain] = attacksFromWeapon(
            {
                source: {
                    name: 'Fist',
                    system: {
                        damage: { die: 'd4', damageType: 'bludgeoning' },
                    },
                },
            },
            attackContext(),
        )
        expect(plain.system).toMatchObject({
            bonus: { value: 9 },
            damageRolls: { strikeDamageID: { damage: '1d4' } },
        })

        const [weak] = attacksFromWeapon(
            {
                source: {
                    name: 'Fist',
                    system: { damage: { die: 'd4' } },
                },
            },
            attackContext({ strength: -2 }),
        )
        expect(weak.system).toMatchObject({
            damageRolls: { strikeDamageID: { damage: '1d4-2' } },
        })
    })
})

describe('attacksFromWeapon', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    const longsword = {
        name: 'Longsword',
        type: 'weapon',
        img: 'icons/longsword.svg',
        system: {
            damage: { dice: 1, die: 'd8', damageType: 'slashing' },
            traits: { value: ['agile', 'artifact', ''] },
        },
    }

    it('builds a strike from weapon data when PF2E generation is unavailable', () => {
        const [attack] = attacksFromWeapon(
            {
                source: longsword,
                document: { id: 'weapon-1' },
            },
            attackContext(),
        )

        expect(attack).toMatchObject({
            name: 'Longsword',
            type: 'melee',
            img: 'icons/longsword.svg',
            flags: { pf2e: { linkedWeapon: 'weapon-1' } },
            system: {
                slug: 'longsword',
                bonus: { value: 9 },
                damageRolls: {
                    strikeDamageID: {
                        damage: '1d8',
                        damageType: 'slashing',
                        category: null,
                    },
                },
                traits: { value: ['agile'] },
            },
        })
    })

    it('fills defaults when the weapon has no attack details', () => {
        const [blank] = attacksFromWeapon(
            { source: { name: '   ', img: '' } },
            attackContext(),
        )
        expect(blank).toMatchObject({
            name: 'Strike',
            system: {
                slug: 'strike',
                damageRolls: {
                    strikeDamageID: { damageType: 'bludgeoning' },
                },
            },
        })
        expect(blank).not.toHaveProperty('img')
        expect(blank).not.toHaveProperty('flags')
        expect(blank.system).not.toHaveProperty('traits')

        const [symbolic] = attacksFromWeapon(
            { source: { name: "Orc's Horn (+1)" } },
            attackContext(),
        )
        expect(symbolic.system).toMatchObject({ slug: 'orcs-horn-1' })

        const [marks] = attacksFromWeapon(
            { source: { name: '!!!' } },
            attackContext(),
        )
        expect(marks.system).not.toHaveProperty('slug')

        const [trimmed] = attacksFromWeapon(
            { source: { name: ' Sword! ' } },
            attackContext(),
        )
        expect(trimmed).toMatchObject({
            name: 'Sword!',
            system: { slug: 'sword' },
        })
    })

    it('keeps a fixed attack bonus and the weapon damage die', () => {
        const [attack] = attacksFromWeapon(
            {
                source: {
                    name: 'Dagger',
                    flags: { pf2e: { fixedAttack: 4 } },
                    system: {
                        damage: { dice: 0, die: ' D4 ', damageType: '' },
                    },
                },
            },
            attackContext(),
        )
        expect(attack.system).toMatchObject({
            bonus: { value: 4 },
            damageRolls: {
                strikeDamageID: { damage: '1d4', damageType: 'bludgeoning' },
            },
        })

        const [numericDie] = attacksFromWeapon(
            {
                source: {
                    name: 'Bow',
                    flags: { pf2e: { fixedAttack: 6 } },
                    system: { damage: { dice: 2, die: '8' } },
                },
            },
            attackContext(),
        )
        expect(numericDie.system).toMatchObject({
            damageRolls: { strikeDamageID: { damage: '2d8' } },
        })

        const [unreadable] = attacksFromWeapon(
            {
                source: {
                    name: 'Club',
                    flags: { pf2e: { fixedAttack: 'high' } },
                    system: { damage: { die: 'sword' } },
                },
            },
            attackContext(),
        )
        expect(unreadable.system).toMatchObject({
            bonus: { value: 9 },
            damageRolls: { strikeDamageID: { damage: '1' } },
        })

        const [fixedBadDie] = attacksFromWeapon(
            {
                source: {
                    name: 'Gauntlet',
                    flags: { pf2e: { fixedAttack: 3 } },
                    system: { damage: { die: 'sword', damageType: 'fire' } },
                },
            },
            attackContext(),
        )
        expect(fixedBadDie.system).toMatchObject({
            bonus: { value: 3 },
            damageRolls: {
                strikeDamageID: {
                    damage: '1',
                    damageType: 'fire',
                },
            },
        })

        const [fixedNoDie] = attacksFromWeapon(
            {
                source: {
                    name: 'Fist',
                    flags: { pf2e: { fixedAttack: 2 } },
                    system: { damage: {} },
                },
            },
            attackContext(),
        )
        expect(fixedNoDie.system).toMatchObject({
            bonus: { value: 2 },
            damageRolls: { strikeDamageID: { damage: '1' } },
        })
    })

    it('copies ranged and reload traits without duplicates', () => {
        const [attack] = attacksFromWeapon(
            {
                source: {
                    name: 'Shortbow',
                    system: {
                        range: 60,
                        reload: { value: ' 1 ' },
                        traits: {
                            value: [
                                'agile',
                                'agile',
                                'cursed',
                                'range-increment-60',
                                3,
                            ],
                        },
                    },
                },
            },
            attackContext(),
        )
        expect(attack.system).toMatchObject({
            traits: { value: ['agile', 'range-increment-60', 'reload-1'] },
        })

        const [addedRange] = attacksFromWeapon(
            {
                source: {
                    name: 'Crossbow',
                    system: {
                        range: 30,
                        reload: { value: 0 },
                        traits: { value: 'agile' },
                    },
                },
            },
            attackContext(),
        )
        expect(addedRange.system).toMatchObject({
            traits: { value: ['range-increment-30', 'reload-0'] },
        })

        const [otherRange] = attacksFromWeapon(
            {
                source: {
                    name: 'Sling',
                    system: {
                        range: 20,
                        reload: { value: '   ' },
                        traits: { value: ['range-20', 'reload-0'] },
                    },
                },
            },
            attackContext(),
        )
        expect(otherRange.system).toMatchObject({
            traits: { value: ['range-20', 'reload-0'] },
        })

        const [melee] = attacksFromWeapon(
            {
                source: {
                    name: 'Spear',
                    system: { range: 0, reload: { value: null } },
                },
                document: { id: 12 },
            },
            attackContext(),
        )
        expect(melee.system).not.toHaveProperty('traits')
        expect(melee).not.toHaveProperty('flags')
    })

    it('scales attacks produced by PF2E toNPCAttacks', () => {
        const [baseMissing, categorized, plain] = attacksFromWeapon(
            {
                source: { name: 'Longsword', img: 'icons/longsword.svg' },
                document: {
                    id: 'weapon-1',
                    toNPCAttacks: () => [
                        null,
                        4,
                        { toObject: () => null },
                        { toObject: () => ['not-an-attack'] },
                        {
                            toObject: () => ({
                                _id: 'generated-1',
                                name: 'Longsword',
                                type: 'melee',
                                system: {},
                                flags: { pf2e: { linkedWeapon: 'weapon-1' } },
                            }),
                        },
                        {
                            toObject: () => ({
                                _id: null,
                                name: 'Longsword',
                                type: 'melee',
                                system: {
                                    bonus: { value: 99 },
                                    damageRolls: {
                                        splash: {
                                            damage: '1',
                                            damageType: 'fire',
                                            category: 'splash',
                                        },
                                        base: {
                                            damage: '9d9+9',
                                            damageType: 'slashing',
                                            category: null,
                                        },
                                    },
                                    traits: { value: ['agile'] },
                                },
                            }),
                        },
                        {
                            _id: 'plain-id',
                            name: 'Thrown Longsword',
                            type: 'melee',
                            system: {
                                bonus: { value: 3 },
                                damageRolls: {
                                    only: {
                                        damage: '1',
                                        damageType: 'piercing',
                                        category: 'persistent',
                                    },
                                },
                            },
                        },
                    ],
                },
            },
            attackContext(),
        )

        expect(baseMissing).toMatchObject({
            name: 'Longsword',
            flags: { pf2e: { linkedWeapon: 'weapon-1' } },
            system: {},
        })
        expect(baseMissing).not.toHaveProperty('_id')
        expect(categorized.system).toMatchObject({
            bonus: { value: 99 },
            damageRolls: {
                splash: { damage: '1', category: 'splash' },
                base: {
                    damage: '9d9+9',
                    damageType: 'slashing',
                    category: null,
                },
            },
            traits: { value: ['agile'] },
        })
        expect(categorized).not.toHaveProperty('_id')
        expect(plain).toMatchObject({
            name: 'Thrown Longsword',
            system: {
                bonus: { value: 3 },
                damageRolls: {
                    only: {
                        damage: '1',
                        damageType: 'piercing',
                        category: 'persistent',
                    },
                },
            },
        })
        expect(plain).not.toHaveProperty('_id')
    })

    it('keeps a fixed PF2E attack instead of the strike table', () => {
        const [attack] = attacksFromWeapon(
            {
                source: {
                    name: 'Flame Tongue',
                    flags: { pf2e: { fixedAttack: 14 } },
                },
                document: {
                    toNPCAttacks: () => [
                        {
                            toObject: () => ({
                                _id: 'fixed-id',
                                name: 'Flame Tongue',
                                type: 'melee',
                                system: {
                                    bonus: { value: 14 },
                                    damageRolls: {
                                        base: {
                                            damage: '2d8+4',
                                            damageType: 'fire',
                                        },
                                    },
                                },
                            }),
                        },
                    ],
                },
            },
            attackContext(),
        )
        expect(attack).toMatchObject({
            system: {
                bonus: { value: 14 },
                damageRolls: { base: { damage: '2d8+4' } },
            },
        })
        expect(attack).not.toHaveProperty('_id')
    })

    it('falls back when PF2E generation returns nothing or throws', () => {
        const empty = attacksFromWeapon(
            {
                source: { name: 'Longsword', type: 'weapon' },
                document: { toNPCAttacks: () => [] },
            },
            attackContext(),
        )
        expect(empty).toHaveLength(1)
        expect(empty[0].name).toBe('Longsword')

        const notArray = attacksFromWeapon(
            {
                source: { name: 'Longsword' },
                document: { toNPCAttacks: () => null },
            },
            attackContext(),
        )
        expect(notArray[0].type).toBe('melee')

        const thrown = attacksFromWeapon(
            {
                source: { name: '  ' },
                document: {
                    id: '',
                    toNPCAttacks: () => {
                        throw new Error('not an npc')
                    },
                },
            },
            attackContext(),
        )
        expect(thrown[0].name).toBe('Strike')
        expect(globalLog).toHaveBeenCalledWith(
            true,
            'Failed to generate attack from "Strike"',
            expect.any(Error),
        )
    })
})

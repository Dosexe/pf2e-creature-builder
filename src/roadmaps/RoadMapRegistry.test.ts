import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
    CasterType,
    MagicalTradition,
    Options,
    RoadMaps,
    Statistics,
} from '@/Keys'

vi.mock('@/utils', () => ({ globalLog: vi.fn() }))

import type { CustomRoadmap } from '@/roadmaps/model/roadMapSchemas'
// Import after mocking
import { globalLog } from '@/utils'
import { RoadMapRegistry } from './RoadMapRegistry'

describe('RoadMapRegistry', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        RoadMapRegistry.resetInstance()
        // Clear global mocks
        vi.unstubAllGlobals()
    })

    describe('Singleton Pattern', () => {
        it('returns the same instance on multiple calls', () => {
            const instance1 = RoadMapRegistry.getInstance()
            const instance2 = RoadMapRegistry.getInstance()
            expect(instance1).toBe(instance2)
        })

        it('creates a new instance after reset', () => {
            const instance1 = RoadMapRegistry.getInstance()
            RoadMapRegistry.resetInstance()
            const instance2 = RoadMapRegistry.getInstance()
            expect(instance1).not.toBe(instance2)
        })
    })

    describe('Built-in Roadmaps', () => {
        it('returns built-in roadmaps immediately', () => {
            const registry = RoadMapRegistry.getInstance()
            const builtIn = registry.getBuiltInRoadmaps()

            expect(Object.keys(builtIn).length).toBeGreaterThan(0)
            expect(builtIn['PF2EMONSTERMAKER.brute']).toBeDefined()
            expect(builtIn['PF2EMONSTERMAKER.soldier']).toBeDefined()
        })

        it('returns a copy of built-in roadmaps to prevent mutation', () => {
            const registry = RoadMapRegistry.getInstance()
            const builtIn1 = registry.getBuiltInRoadmaps()
            const builtIn2 = registry.getBuiltInRoadmaps()

            expect(builtIn1).not.toBe(builtIn2)
            expect(builtIn1).toEqual(builtIn2)
        })

        it('correctly identifies built-in roadmaps', () => {
            const registry = RoadMapRegistry.getInstance()

            expect(registry.isBuiltIn('PF2EMONSTERMAKER.brute')).toBe(true)
            expect(registry.isBuiltIn('PF2EMONSTERMAKER.soldier')).toBe(true)
            expect(registry.isBuiltIn('PF2EMONSTERMAKER.custom.tank')).toBe(
                false,
            )
            expect(registry.isBuiltIn('nonexistent')).toBe(false)
        })

        it('getRoadmap returns correct roadmap for built-in key', () => {
            const registry = RoadMapRegistry.getInstance()
            const brute = registry.getRoadmap('PF2EMONSTERMAKER.brute')

            expect(brute).toBeDefined()
            expect(brute).toEqual(RoadMaps['PF2EMONSTERMAKER.brute'])
        })

        it('getRoadmap returns undefined for nonexistent key', () => {
            const registry = RoadMapRegistry.getInstance()
            const result = registry.getRoadmap('nonexistent')

            expect(result).toBeUndefined()
        })
    })

    describe('Custom Roadmaps Loading', () => {
        it('sets isReady to false initially', () => {
            const registry = RoadMapRegistry.getInstance()
            expect(registry.isReady).toBe(false)
        })

        it('sets isReady to true after loading when FilePicker is not available', async () => {
            const registry = RoadMapRegistry.getInstance()

            await registry.loadCustomRoadmaps()

            expect(registry.isReady).toBe(true)
            expect(globalLog).toHaveBeenCalledWith(
                false,
                'FilePicker not available, skipping custom roadmaps',
            )
        })

        it('does not reload if already ready', async () => {
            const registry = RoadMapRegistry.getInstance()

            await registry.loadCustomRoadmaps()
            vi.clearAllMocks()
            await registry.loadCustomRoadmaps()

            expect(globalLog).toHaveBeenCalledWith(
                false,
                'Custom roadmaps already loaded',
            )
        })

        it('handles missing custom roadmaps folder gracefully', async () => {
            vi.stubGlobal('FilePicker', {
                browse: vi
                    .fn()
                    .mockRejectedValue(new Error('Folder not found')),
            })

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            expect(registry.isReady).toBe(true)
            expect(registry.getCustomRoadmaps()).toEqual({})
            expect(globalLog).toHaveBeenCalledWith(
                false,
                expect.stringContaining('Custom roadmaps folder not found'),
            )
        })

        it('handles empty custom roadmaps folder', async () => {
            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({ files: [] }),
            })

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            expect(registry.isReady).toBe(true)
            expect(registry.getCustomRoadmaps()).toEqual({})
            expect(globalLog).toHaveBeenCalledWith(
                false,
                'No custom roadmap files found',
            )
        })

        it('loads a single custom roadmap from JSON file', async () => {
            const customRoadmap: CustomRoadmap = {
                name: 'Tank',
                stats: {
                    abilityScores: {
                        strength: 'high',
                        constitution: 'extreme',
                    },
                    defenseAndPerception: {
                        armorClass: 'high',
                    },
                },
            }

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: ['pf2e-creature-builder/custom-roadmaps/tank.json'],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmap),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            const custom = registry.getCustomRoadmaps()
            expect(Object.keys(custom)).toHaveLength(1)
            expect(custom['PF2EMONSTERMAKER.custom.tank']).toBeDefined()
            expect(custom['PF2EMONSTERMAKER.custom.tank'][Statistics.str]).toBe(
                Options.high,
            )
            expect(custom['PF2EMONSTERMAKER.custom.tank'][Statistics.con]).toBe(
                Options.extreme,
            )
            expect(custom['PF2EMONSTERMAKER.custom.tank'][Statistics.ac]).toBe(
                Options.high,
            )
        })

        it('loads multiple roadmaps from array JSON file', async () => {
            const customRoadmaps = [
                {
                    name: 'Glass Cannon',
                    stats: {
                        abilityScores: {
                            strength: 'extreme',
                        },
                        defenceAndPerception: {
                            hitPoints: 'low',
                        },
                    },
                },
                {
                    name: 'Defender',
                    stats: {
                        defenceAndPerception: {
                            armorClass: 'extreme',
                            fortitude: 'high',
                        },
                    },
                },
            ]

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: [
                        'pf2e-creature-builder/custom-roadmaps/presets.json',
                    ],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmaps),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            const custom = registry.getCustomRoadmaps()
            expect(Object.keys(custom)).toHaveLength(2)
            expect(custom['PF2EMONSTERMAKER.custom.glass_cannon']).toBeDefined()
            expect(custom['PF2EMONSTERMAKER.custom.defender']).toBeDefined()
        })

        it('filters non-JSON files', async () => {
            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: [
                        'pf2e-creature-builder/custom-roadmaps/readme.txt',
                        'pf2e-creature-builder/custom-roadmaps/tank.json',
                    ],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            name: 'Tank',
                            stats: {
                                abilityScores: { strength: 'high' },
                            },
                        }),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            // Should only fetch the JSON file
            expect(fetch).toHaveBeenCalledTimes(1)
            expect(fetch).toHaveBeenCalledWith(
                'pf2e-creature-builder/custom-roadmaps/tank.json',
            )
        })

        it('handles fetch errors gracefully', async () => {
            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: [
                        'pf2e-creature-builder/custom-roadmaps/broken.json',
                    ],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: false,
                    status: 404,
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            expect(registry.isReady).toBe(true)
            expect(registry.getCustomRoadmaps()).toEqual({})
            expect(globalLog).toHaveBeenCalledWith(
                true,
                expect.stringContaining('Failed to fetch'),
            )
        })

        it('handles JSON parse errors gracefully', async () => {
            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: [
                        'pf2e-creature-builder/custom-roadmaps/invalid.json',
                    ],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.reject(new Error('Invalid JSON')),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            expect(registry.isReady).toBe(true)
            expect(registry.getCustomRoadmaps()).toEqual({})
            expect(globalLog).toHaveBeenCalledWith(
                true,
                expect.stringContaining('Error loading roadmap file'),
                expect.any(Error),
            )
        })

        it('logs unexpected errors during loading', async () => {
            const registry = RoadMapRegistry.getInstance()
            ;(
                globalLog as unknown as { mockImplementationOnce: (x) => void }
            ).mockImplementationOnce(() => {
                throw new Error('boom')
            })

            await registry.loadCustomRoadmaps()

            expect(globalLog).toHaveBeenCalledWith(
                true,
                'Error loading custom roadmaps:',
                expect.any(Error),
            )
            expect(registry.isReady).toBe(true)
        })
    })

    describe('Roadmap Translation', () => {
        it('translates all ability score keys correctly', async () => {
            const customRoadmap = {
                name: 'Ability Test',
                stats: {
                    abilityScores: {
                        strength: 'high',
                        dexterity: 'moderate',
                        constitution: 'extreme',
                        intelligence: 'low',
                        wisdom: 'terrible',
                        charisma: 'abysmal',
                    },
                },
            }

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: ['pf2e-creature-builder/custom-roadmaps/test.json'],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmap),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            const roadmap =
                registry.getCustomRoadmaps()[
                    'PF2EMONSTERMAKER.custom.ability_test'
                ]
            expect(roadmap[Statistics.str]).toBe(Options.high)
            expect(roadmap[Statistics.dex]).toBe(Options.moderate)
            expect(roadmap[Statistics.con]).toBe(Options.extreme)
            expect(roadmap[Statistics.int]).toBe(Options.low)
            expect(roadmap[Statistics.wis]).toBe(Options.terrible)
            expect(roadmap[Statistics.cha]).toBe(Options.abysmal)
        })

        it('translates defence and combat keys correctly', async () => {
            const customRoadmap: CustomRoadmap = {
                name: 'Combat Test',
                stats: {
                    defenseAndPerception: {
                        hitPoints: 'high',
                        perception: 'extreme',
                        armorClass: 'high',
                        fortitude: 'high',
                        reflex: 'moderate',
                        will: 'low',
                    },
                    strikes: {
                        strikeBonus: 'high',
                        strikeDamage: 'extreme',
                    },
                    spellcasting: {
                        value: 'moderate',
                    },
                },
            }

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: ['pf2e-creature-builder/custom-roadmaps/test.json'],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmap),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            const roadmap =
                registry.getCustomRoadmaps()[
                    'PF2EMONSTERMAKER.custom.combat_test'
                ]
            expect(roadmap[Statistics.hp]).toBe(Options.high)
            expect(roadmap[Statistics.per]).toBe(Options.extreme)
            expect(roadmap[Statistics.ac]).toBe(Options.high)
            expect(roadmap[Statistics.fort]).toBe(Options.high)
            expect(roadmap[Statistics.ref]).toBe(Options.moderate)
            expect(roadmap[Statistics.wil]).toBe(Options.low)
            expect(roadmap[Statistics.strikeBonus]).toBe(Options.high)
            expect(roadmap[Statistics.strikeDamage]).toBe(Options.extreme)
            expect(roadmap[Statistics.spellcasting]).toBe(Options.moderate)
        })

        it('translates skill keys correctly', async () => {
            const customRoadmap = {
                name: 'Skill Test',
                stats: {
                    skills: {
                        acrobatics: 'high',
                        arcana: 'extreme',
                        athletics: 'high',
                        stealth: 'extreme',
                        thievery: 'moderate',
                    },
                },
            }

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: ['pf2e-creature-builder/custom-roadmaps/test.json'],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmap),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            const roadmap =
                registry.getCustomRoadmaps()[
                    'PF2EMONSTERMAKER.custom.skill_test'
                ]
            expect(roadmap[Statistics.acrobatics]).toBe(Options.high)
            expect(roadmap[Statistics.arcana]).toBe(Options.extreme)
            expect(roadmap[Statistics.athletics]).toBe(Options.high)
            expect(roadmap[Statistics.stealth]).toBe(Options.extreme)
            expect(roadmap[Statistics.thievery]).toBe(Options.moderate)
        })

        it('covers all RoadmapConfigFile fields', async () => {
            const customRoadmap = {
                name: 'Full Config Coverage',
                stats: {
                    abilityScores: {
                        strength: 'high',
                        dexterity: 'moderate',
                        constitution: 'low',
                        intelligence: 'extreme',
                        wisdom: 'terrible',
                        charisma: 'abysmal',
                    },
                    defenseAndPerception: {
                        hitPoints: 'high',
                        perception: 'extreme',
                        armorClass: 'high',
                        fortitude: 'low',
                        reflex: 'moderate',
                        will: 'terrible',
                    },
                    strikes: {
                        strikeBonus: 'high',
                        strikeDamage: 'extreme',
                    },
                    spellcasting: {
                        value: 'moderate',
                        tradition: 'arcane',
                        type: 'prepared',
                    },
                    skills: {
                        acrobatics: 'high',
                        arcana: 'high',
                        athletics: 'high',
                        crafting: 'high',
                        deception: 'high',
                        diplomacy: 'high',
                        intimidation: 'high',
                        medicine: 'high',
                        nature: 'high',
                        occultism: 'high',
                        performance: 'high',
                        religion: 'high',
                        society: 'high',
                        stealth: 'high',
                        survival: 'high',
                        thievery: 'high',
                    },
                },
            }

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: ['pf2e-creature-builder/custom-roadmaps/test.json'],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmap),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            const roadmap =
                registry.getCustomRoadmaps()[
                    'PF2EMONSTERMAKER.custom.full_config_coverage'
                ]

            expect(roadmap[Statistics.str]).toBe(Options.high)
            expect(roadmap[Statistics.dex]).toBe(Options.moderate)
            expect(roadmap[Statistics.con]).toBe(Options.low)
            expect(roadmap[Statistics.int]).toBe(Options.extreme)
            expect(roadmap[Statistics.wis]).toBe(Options.terrible)
            expect(roadmap[Statistics.cha]).toBe(Options.abysmal)

            expect(roadmap[Statistics.hp]).toBe(Options.high)
            expect(roadmap[Statistics.per]).toBe(Options.extreme)
            expect(roadmap[Statistics.ac]).toBe(Options.high)
            expect(roadmap[Statistics.fort]).toBe(Options.low)
            expect(roadmap[Statistics.ref]).toBe(Options.moderate)
            expect(roadmap[Statistics.wil]).toBe(Options.terrible)

            expect(roadmap[Statistics.strikeBonus]).toBe(Options.high)
            expect(roadmap[Statistics.strikeDamage]).toBe(Options.extreme)
            expect(roadmap[Statistics.spellcasting]).toBe(Options.moderate)
            expect(roadmap[Statistics.spellcastingTradition]).toBe(
                MagicalTradition.arcane,
            )
            expect(roadmap[Statistics.spellcastingType]).toBe(
                CasterType.prepared,
            )

            expect(roadmap[Statistics.acrobatics]).toBe(Options.high)
            expect(roadmap[Statistics.arcana]).toBe(Options.high)
            expect(roadmap[Statistics.athletics]).toBe(Options.high)
            expect(roadmap[Statistics.crafting]).toBe(Options.high)
            expect(roadmap[Statistics.deception]).toBe(Options.high)
            expect(roadmap[Statistics.diplomacy]).toBe(Options.high)
            expect(roadmap[Statistics.intimidation]).toBe(Options.high)
            expect(roadmap[Statistics.medicine]).toBe(Options.high)
            expect(roadmap[Statistics.nature]).toBe(Options.high)
            expect(roadmap[Statistics.occultism]).toBe(Options.high)
            expect(roadmap[Statistics.performance]).toBe(Options.high)
            expect(roadmap[Statistics.religion]).toBe(Options.high)
            expect(roadmap[Statistics.society]).toBe(Options.high)
            expect(roadmap[Statistics.stealth]).toBe(Options.high)
            expect(roadmap[Statistics.survival]).toBe(Options.high)
            expect(roadmap[Statistics.thievery]).toBe(Options.high)
        })

        it('keeps the first value when stats are duplicated across groups', async () => {
            const customRoadmap = {
                name: 'Duplicate Stat',
                stats: {
                    abilityScores: {
                        strength: 'high',
                    },
                    strikes: {
                        strength: 'extreme',
                    },
                },
            }

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: ['pf2e-creature-builder/custom-roadmaps/test.json'],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmap),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            const roadmap =
                registry.getCustomRoadmaps()[
                    'PF2EMONSTERMAKER.custom.duplicate_stat'
                ]
            expect(roadmap[Statistics.str]).toBe(Options.high)
        })

        it('skips unknown statistic keys with warning', async () => {
            const customRoadmap = {
                name: 'Unknown Key Test',
                stats: {
                    abilityScores: {
                        strength: 'high',
                        unknownStat: 'extreme',
                        invalidKey: 'moderate',
                    },
                },
            }

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: ['pf2e-creature-builder/custom-roadmaps/test.json'],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmap),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            const roadmap =
                registry.getCustomRoadmaps()[
                    'PF2EMONSTERMAKER.custom.unknown_key_test'
                ]
            expect(roadmap[Statistics.str]).toBe(Options.high)
            expect(Object.keys(roadmap)).toHaveLength(33)
        })
    })

    describe('Roadmap Validation', () => {
        it('skips roadmaps without name', async () => {
            const customRoadmap = {
                stats: {
                    abilityScores: {
                        strength: 'high',
                    },
                },
            }

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: ['pf2e-creature-builder/custom-roadmaps/test.json'],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmap),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            expect(registry.getCustomRoadmaps()).toEqual({})
        })

        it('skips roadmaps with empty name', async () => {
            const customRoadmap = {
                name: '   ',
                stats: {
                    abilityScores: {
                        strength: 'high',
                    },
                },
            }

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: ['pf2e-creature-builder/custom-roadmaps/test.json'],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmap),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            expect(registry.getCustomRoadmaps()).toEqual({})
        })

        it('skips roadmaps without stats object', async () => {
            const customRoadmap = {
                name: 'No Stats',
            }

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: ['pf2e-creature-builder/custom-roadmaps/test.json'],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmap),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            expect(registry.getCustomRoadmaps()).toEqual({})
        })

        it('skips roadmaps with stats as array', async () => {
            const customRoadmap = {
                name: 'Array Stats',
                stats: ['strength', 'high'],
            }

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: ['pf2e-creature-builder/custom-roadmaps/test.json'],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmap),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            expect(registry.getCustomRoadmaps()).toEqual({})
        })

        it('skips duplicate custom roadmap names', async () => {
            const customRoadmaps = [
                {
                    name: 'Duplicate',
                    stats: { abilityScores: { strength: 'high' } },
                },
                {
                    name: 'Duplicate',
                    stats: { abilityScores: { strength: 'extreme' } },
                },
            ]

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: ['pf2e-creature-builder/custom-roadmaps/test.json'],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmaps),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            const custom = registry.getCustomRoadmaps()
            expect(Object.keys(custom)).toHaveLength(1)
            // First one should be loaded
            expect(
                custom['PF2EMONSTERMAKER.custom.duplicate'][Statistics.str],
            ).toBe(Options.high)
            expect(globalLog).toHaveBeenCalledWith(
                true,
                expect.stringContaining('Duplicate custom roadmap name'),
            )
        })
    })

    describe('Built-in Protection', () => {
        it('cannot override built-in roadmaps with custom ones', async () => {
            // Try to create a custom roadmap with a name that would conflict
            // Note: The internal key is generated as PF2EMONSTERMAKER.custom.<name>
            // So we can't actually override built-in roadmaps by name alone
            // But we test the protection mechanism anyway
            const customRoadmap = {
                name: 'Tank',
                stats: {
                    abilityScores: {
                        strength: 'extreme',
                    },
                },
            }

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: ['pf2e-creature-builder/custom-roadmaps/test.json'],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmap),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            // Custom roadmap should be added (since key is PF2EMONSTERMAKER.custom.tank)
            expect(
                registry.getCustomRoadmaps()['PF2EMONSTERMAKER.custom.tank'],
            ).toBeDefined()

            // Built-in brute should remain unchanged
            const brute = registry.getRoadmap('PF2EMONSTERMAKER.brute')
            expect(brute).toEqual(RoadMaps['PF2EMONSTERMAKER.brute'])
        })

        it('skips custom roadmaps that collide with built-in keys', () => {
            const registry = RoadMapRegistry.getInstance()
            ;(registry as any).builtInRoadmaps['PF2EMONSTERMAKER.custom.tank'] =
                {}

            ;(registry as any).processRoadmap(
                {
                    name: 'Tank',
                    stats: { abilityScores: { strength: 'high' } },
                },
                'source.json',
            )

            expect(registry.getCustomRoadmaps()).toEqual({})
            expect(globalLog).toHaveBeenCalledWith(
                true,
                expect.stringContaining(
                    'would override built-in roadmap - skipping',
                ),
            )
        })
    })

    describe('Spellcasting Defaults', () => {
        it('defaults spellcasting to none when not provided in custom roadmap', async () => {
            const customRoadmap: CustomRoadmap = {
                name: 'Warrior',
                stats: {
                    abilityScores: {
                        strength: 'high',
                    },
                    defenseAndPerception: {
                        armorClass: 'high',
                    },
                },
            }

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: [
                        'pf2e-creature-builder/custom-roadmaps/warrior.json',
                    ],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmap),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            const custom = registry.getCustomRoadmaps()
            const roadmap = custom['PF2EMONSTERMAKER.custom.warrior']

            expect(roadmap).toBeDefined()
            expect(roadmap[Statistics.spellcasting]).toBe(Options.none)
            expect(roadmap[Statistics.spellcastingTradition]).toBe(Options.none)
            expect(roadmap[Statistics.spellcastingType]).toBe(Options.none)
        })

        it('uses spellcasting value with defaults for tradition and type when only spellcasting is provided', async () => {
            const customRoadmap: CustomRoadmap = {
                name: 'Innate Caster',
                stats: {
                    abilityScores: {
                        intelligence: 'high',
                    },
                    defenseAndPerception: {
                        armorClass: 'moderate',
                    },
                    spellcasting: {
                        value: 'high',
                    },
                },
            }

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: [
                        'pf2e-creature-builder/custom-roadmaps/innate.json',
                    ],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmap),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            const custom = registry.getCustomRoadmaps()
            const roadmap = custom['PF2EMONSTERMAKER.custom.innate_caster']

            expect(roadmap).toBeDefined()
            expect(roadmap[Statistics.spellcasting]).toBe(Options.high)
            // Should default to arcane and innate when not specified
            expect(roadmap[Statistics.spellcastingTradition]).toBe(
                MagicalTradition.arcane,
            )
            expect(roadmap[Statistics.spellcastingType]).toBe(CasterType.innate)
        })

        it('uses all spellcasting values when fully specified in custom roadmap', async () => {
            const customRoadmap: CustomRoadmap = {
                name: 'Divine Priest',
                stats: {
                    abilityScores: {
                        wisdom: 'extreme',
                    },
                    defenseAndPerception: {
                        will: 'high',
                    },
                    spellcasting: {
                        value: 'extreme',
                        tradition: 'divine',
                        type: 'prepared',
                    },
                },
            }

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: [
                        'pf2e-creature-builder/custom-roadmaps/priest.json',
                    ],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmap),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            const custom = registry.getCustomRoadmaps()
            const roadmap = custom['PF2EMONSTERMAKER.custom.divine_priest']

            expect(roadmap).toBeDefined()
            expect(roadmap[Statistics.spellcasting]).toBe(Options.extreme)
            expect(roadmap[Statistics.spellcastingTradition]).toBe(
                MagicalTradition.divine,
            )
            expect(roadmap[Statistics.spellcastingType]).toBe(
                CasterType.prepared,
            )
        })

        it('correctly maps occult spontaneous spellcaster', async () => {
            const customRoadmap: CustomRoadmap = {
                name: 'Occult Bard',
                stats: {
                    abilityScores: {
                        charisma: 'high',
                    },
                    spellcasting: {
                        value: 'high',
                        tradition: 'occult',
                        type: 'spontaneous',
                    },
                },
            }

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: ['pf2e-creature-builder/custom-roadmaps/bard.json'],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmap),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            const custom = registry.getCustomRoadmaps()
            const roadmap = custom['PF2EMONSTERMAKER.custom.occult_bard']

            expect(roadmap).toBeDefined()
            expect(roadmap[Statistics.spellcasting]).toBe(Options.high)
            expect(roadmap[Statistics.spellcastingTradition]).toBe(
                MagicalTradition.occult,
            )
            expect(roadmap[Statistics.spellcastingType]).toBe(
                CasterType.spontaneous,
            )
        })

        it('correctly maps primal innate spellcaster', async () => {
            const customRoadmap: CustomRoadmap = {
                name: 'Fey Creature',
                stats: {
                    abilityScores: {
                        wisdom: 'high',
                    },
                    spellcasting: {
                        value: 'moderate',
                        tradition: 'primal',
                        type: 'innate',
                    },
                },
            }

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: ['pf2e-creature-builder/custom-roadmaps/fey.json'],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmap),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            const custom = registry.getCustomRoadmaps()
            const roadmap = custom['PF2EMONSTERMAKER.custom.fey_creature']

            expect(roadmap).toBeDefined()
            expect(roadmap[Statistics.spellcasting]).toBe(Options.moderate)
            expect(roadmap[Statistics.spellcastingTradition]).toBe(
                MagicalTradition.primal,
            )
            expect(roadmap[Statistics.spellcastingType]).toBe(CasterType.innate)
        })

        it('handles spellcasting none explicitly', async () => {
            const customRoadmap: CustomRoadmap = {
                name: 'Pure Martial',
                stats: {
                    abilityScores: {
                        strength: 'extreme',
                    },
                    spellcasting: {
                        value: 'none',
                        tradition: 'arcane',
                        type: 'innate',
                    },
                },
            }

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: [
                        'pf2e-creature-builder/custom-roadmaps/martial.json',
                    ],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmap),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            const custom = registry.getCustomRoadmaps()
            const roadmap = custom['PF2EMONSTERMAKER.custom.pure_martial']

            expect(roadmap).toBeDefined()
            expect(roadmap[Statistics.spellcasting]).toBe(Options.none)
            expect(roadmap[Statistics.spellcastingTradition]).toBe(Options.none)
            expect(roadmap[Statistics.spellcastingType]).toBe(Options.none)
        })
    })

    describe('Name Sanitization', () => {
        it('sanitizes names with special characters', async () => {
            const customRoadmap = {
                name: 'Tank & Healer (v2.0)',
                stats: {
                    abilityScores: {
                        strength: 'high',
                    },
                },
            }

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: ['pf2e-creature-builder/custom-roadmaps/test.json'],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmap),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            const custom = registry.getCustomRoadmaps()
            expect(
                custom['PF2EMONSTERMAKER.custom.tank_healer_v2_0'],
            ).toBeDefined()
        })

        it('sanitizes names with leading/trailing whitespace', async () => {
            const customRoadmap = {
                name: '  My Tank  ',
                stats: {
                    abilityScores: {
                        strength: 'high',
                    },
                },
            }

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: ['pf2e-creature-builder/custom-roadmaps/test.json'],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmap),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            const custom = registry.getCustomRoadmaps()
            expect(custom['PF2EMONSTERMAKER.custom.my_tank']).toBeDefined()
        })
    })

    describe('getAllRoadmaps', () => {
        it('returns built-in roadmaps when no custom loaded', () => {
            const registry = RoadMapRegistry.getInstance()
            const all = registry.getAllRoadmaps()

            expect(all['PF2EMONSTERMAKER.brute']).toBeDefined()
            expect(all['PF2EMONSTERMAKER.soldier']).toBeDefined()
        })

        it('merges built-in and custom roadmaps', async () => {
            const customRoadmap = {
                name: 'Custom Tank',
                stats: {
                    abilityScores: {
                        strength: 'extreme',
                        constitution: 'high',
                    },
                },
            }

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: ['pf2e-creature-builder/custom-roadmaps/tank.json'],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmap),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            const all = registry.getAllRoadmaps()

            // Should have built-in
            expect(all['PF2EMONSTERMAKER.brute']).toBeDefined()
            expect(all['PF2EMONSTERMAKER.soldier']).toBeDefined()

            // Should have custom
            expect(all['PF2EMONSTERMAKER.custom.custom_tank']).toBeDefined()
            expect(
                all['PF2EMONSTERMAKER.custom.custom_tank'][Statistics.str],
            ).toBe(Options.extreme)
        })

        it('returns a copy to prevent mutation', async () => {
            const registry = RoadMapRegistry.getInstance()
            const all1 = registry.getAllRoadmaps()
            const all2 = registry.getAllRoadmaps()

            expect(all1).not.toBe(all2)
            expect(all1).toEqual(all2)
        })
    })

    describe('getRoadmap with custom roadmaps', () => {
        it('returns custom roadmap when requested', async () => {
            const customRoadmap = {
                name: 'My Custom',
                stats: {
                    abilityScores: {
                        strength: 'extreme',
                    },
                },
            }

            vi.stubGlobal('FilePicker', {
                browse: vi.fn().mockResolvedValue({
                    files: [
                        'pf2e-creature-builder/custom-roadmaps/custom.json',
                    ],
                }),
            })
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(customRoadmap),
                }),
            )

            const registry = RoadMapRegistry.getInstance()
            await registry.loadCustomRoadmaps()

            const roadmap = registry.getRoadmap(
                'PF2EMONSTERMAKER.custom.my_custom',
            )
            expect(roadmap).toBeDefined()
            expect(roadmap?.[Statistics.str]).toBe(Options.extreme)
        })

        it('prioritizes built-in over custom for same key (if it could happen)', () => {
            const registry = RoadMapRegistry.getInstance()

            // Built-in should always be found first due to implementation
            const brute = registry.getRoadmap('PF2EMONSTERMAKER.brute')
            expect(brute).toEqual(RoadMaps['PF2EMONSTERMAKER.brute'])
        })
    })
})

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import * as SpellCopyStrategies from '@/spellcasting/SpellCopyStrategies'
import { globalLog } from '@/utils'
import CreatureBuilderFormUI from './CreatureBuilderFormUI'
import {
    CasterType,
    DefaultCreatureLevel,
    MagicalTradition,
    Options,
    Skills,
    Statistics,
} from './Keys'
import { statisticValues } from './Values'

vi.mock('@/utils', () => ({ globalLog: vi.fn() }))

let CreatureBuilderForm: typeof import('./CreatureBuilderForm').CreatureBuilderForm
let Actor: { create: ReturnType<typeof vi.fn> }
let Item: { create: ReturnType<typeof vi.fn> }

const mergeObject = (
    target: Record<string, unknown>,
    source: Record<string, unknown>,
) => ({
    ...target,
    ...source,
})

const getProperty = (obj: Record<string, any>, path: string) => {
    if (!obj || !path) return undefined
    return path.split('.').reduce((acc: any, part: string) => {
        if (acc && Object.keys(acc).includes(part)) {
            return acc[part]
        }
        return undefined
    }, obj)
}

const flattenObject = (
    obj: Record<string, unknown>,
    prefix = '',
): Record<string, unknown> => {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(
                result,
                flattenObject(value as Record<string, unknown>, path),
            )
        } else {
            result[path] = value
        }
    }
    return result
}

const buildActor = (overrides: Record<string, unknown> = {}) => ({
    name: 'Base Actor',
    system: {},
    items: [],
    update: vi.fn().mockResolvedValue(undefined),
    updateEmbeddedDocuments: vi.fn().mockResolvedValue(undefined),
    deleteEmbeddedDocuments: vi.fn().mockResolvedValue(undefined),
    sheet: { render: vi.fn() },
    ...overrides,
})

beforeAll(async () => {
    class MockFormApplication {
        static defaultOptions = {}
        object: any
        options: any

        constructor(object: any, options?: any) {
            this.object = object
            this.options = options
        }

        activateListeners() {}

        close() {
            return Promise.resolve()
        }
    }

    vi.stubGlobal('FormApplication', MockFormApplication)
    vi.stubGlobal('foundry', {
        utils: {
            mergeObject,
            getProperty,
            flattenObject,
        },
    })
    vi.stubGlobal('game', {
        i18n: { localize: (key: string) => `loc:${key}` },
        modules: new Map(),
    })
    vi.stubGlobal('Handlebars', { registerHelper: vi.fn() })

    Actor = { create: vi.fn() }
    Item = { create: vi.fn() }
    vi.stubGlobal('Actor', Actor)
    vi.stubGlobal('Item', Item)

    const module = await import('./CreatureBuilderForm')
    CreatureBuilderForm = module.CreatureBuilderForm
})

beforeEach(() => {
    vi.clearAllMocks()
})

describe('CreatureBuilderForm', () => {
    it('uses form name when provided', () => {
        const form = new CreatureBuilderForm(buildActor({ name: 'Fallback' }))
        const result = form.applyName({ [Statistics.name]: 'Custom Name' })
        expect(result).toEqual({ name: 'Custom Name' })
    })

    it('falls back to actor name when name is missing', () => {
        const form = new CreatureBuilderForm(buildActor({ name: 'Fallback' }))
        const result = form.applyName({})
        expect(result).toEqual({ name: 'Fallback' })
    })

    it('normalizes traits input', () => {
        const form = new CreatureBuilderForm(buildActor())
        const result = form.applyTraits({
            'PF2EMONSTERMAKER.traits': '  Evil,  UNDEAD , ,  ',
        })
        expect(result).toEqual({
            'system.traits.value': ['evil', 'undead'],
        })
    })

    it('returns empty traits when input is blank', () => {
        const form = new CreatureBuilderForm(buildActor())
        const result = form.applyTraits({
            'PF2EMONSTERMAKER.traits': '   ',
        })
        expect(result).toEqual({})
    })

    it('applies level as a number', () => {
        const form = new CreatureBuilderForm(buildActor())
        form.level = '5'
        expect(form.applyLevel()).toEqual({
            'system.details.level.value': 5,
        })
    })

    it('applies hit points based on level option', () => {
        const form = new CreatureBuilderForm(buildActor())
        form.level = '1'
        const result = form.applyHitPoints({
            [Statistics.hp]: Options.moderate,
        })
        const expected = parseInt(
            statisticValues[Statistics.hp]['1'][Options.moderate],
            10,
        )
        expect(result).toEqual({ 'system.attributes.hp.value': expected })
    })

    it('creates a strike item with expected values', async () => {
        const form = new CreatureBuilderForm(buildActor())
        form.level = '1'
        await form.applyStrike({
            [Statistics.strikeBonus]: Options.high,
            [Statistics.strikeDamage]: Options.moderate,
        })

        const expectedBonus = parseInt(
            statisticValues[Statistics.strikeBonus]['1'][Options.high],
            10,
        )
        const expectedDamage =
            statisticValues[Statistics.strikeDamage]['1'][Options.moderate]

        expect(Item.create).toHaveBeenCalledTimes(1)
        const [payload, options] = Item.create.mock.calls[0]
        expect(payload).toMatchObject({
            name: 'loc:PF2EMONSTERMAKER.strike',
            type: 'melee',
            system: {
                damageRolls: {
                    strikeDamageID: {
                        damage: expectedDamage,
                        damageType: 'bludgeoning',
                    },
                },
                bonus: { value: expectedBonus },
            },
        })
        expect(options).toEqual({ parent: form.actor })
    })

    it('skips spellcasting when option is none', async () => {
        const form = new CreatureBuilderForm(buildActor())
        form.level = '1'
        const result = await form.applySpellcasting({
            [Statistics.spellcasting]: Options.none,
        })
        expect(result).toBeUndefined()
        expect(Item.create).not.toHaveBeenCalled()
    })

    it('deletes existing spellcasting entries when option is none', async () => {
        const actor = buildActor({
            items: [
                { id: 'entry1', type: 'spellcastingEntry' },
                { id: 'entry2', type: 'spellcastingEntry' },
            ],
        })
        const form = new CreatureBuilderForm(actor)
        form.level = '1'

        await form.applySpellcasting({
            [Statistics.spellcasting]: Options.none,
        })

        expect(actor.deleteEmbeddedDocuments).toHaveBeenCalledWith('Item', [
            'entry1',
            'entry2',
        ])
    })

    it('creates a spellcasting item with computed DC', async () => {
        const form = new CreatureBuilderForm(buildActor())
        form.level = '1'
        await form.applySpellcasting({
            [Statistics.spellcasting]: Options.high,
        })

        const expectedValue = parseInt(
            statisticValues[Statistics.spellcasting]['1'][Options.high],
            10,
        )

        expect(Item.create).toHaveBeenCalledTimes(1)
        const [payload, options] = Item.create.mock.calls[0]
        expect(payload).toMatchObject({
            name: 'Arcane Innate loc:PF2EMONSTERMAKER.spells',
            type: 'spellcastingEntry',
            system: {
                spelldc: {
                    value: expectedValue,
                    dc: expectedValue + 8,
                },
            },
        })
        expect(options).toEqual({ parent: form.actor })
    })

    it('updates skills for non-none options', async () => {
        const actor = buildActor()
        const form = new CreatureBuilderForm(actor)
        form.level = '1'

        const formData = Object.fromEntries(
            Skills.map((skill) => [skill, Options.none]),
        )
        formData[Statistics.acrobatics] = Options.moderate

        const flattenSpy = vi.fn(flattenObject)
        ;(globalThis as any).foundry.utils.flattenObject = flattenSpy

        await form.applySkills(formData)

        const expectedValue = parseInt(
            statisticValues[Statistics.acrobatics]['1'][Options.moderate],
            10,
        )
        expect(flattenSpy).toHaveBeenCalledWith({
            'system.skills.acrobatics': { base: expectedValue },
        })
        expect(actor.update).toHaveBeenCalledTimes(1)
        expect(actor.update).toHaveBeenCalledWith({
            'system.skills.acrobatics.base': expectedValue,
        })
    })

    it('creates lore items for valid entries', async () => {
        const form = new CreatureBuilderForm(buildActor())
        form.level = '1'
        await form.applyLoreSkills({
            loreName0: '  Sailing ',
            loreLevel0: Options.moderate,
            loreName1: '',
            loreLevel1: Options.high,
            loreName2: 'Underworld',
            loreLevel2: Options.none,
        })

        const expectedValue = parseInt(
            statisticValues[Statistics.acrobatics]['1'][Options.moderate],
            10,
        )
        expect(Item.create).toHaveBeenCalledTimes(1)
        const [payload, options] = Item.create.mock.calls[0]
        expect(payload).toMatchObject({
            name: 'Sailing Lore',
            type: 'lore',
            system: { mod: { value: expectedValue } },
        })
        expect(options).toEqual({ parent: form.actor })
    })

    it('detects actor stats, skills, and spellcasting', () => {
        const actor = buildActor({
            system: {
                details: { level: { value: 1 } },
                abilities: { str: { mod: 5 } },
                attributes: { hp: { max: 20 }, ac: { value: 15 } },
                perception: { mod: 10 },
                saves: {
                    fortitude: { value: 7 },
                    reflex: { value: 7 },
                    will: { value: 7 },
                },
                skills: { athletics: { base: 7 } },
            },
            items: [
                {
                    type: 'spellcastingEntry',
                    system: { spelldc: { dc: 17 } },
                },
            ],
        })
        const form = new CreatureBuilderForm(actor)
        const detected = form.detectActorStats()
        expect(detected[Statistics.str]).toBe(Options.extreme)
        expect(detected[Statistics.hp]).toBe(Options.moderate)
        expect(detected[Statistics.per]).toBe(Options.high)
        expect(detected[Statistics.ac]).toBe(Options.moderate)
        expect(detected[Statistics.fort]).toBe(Options.moderate)
        expect(detected[Statistics.athletics]).toBe(Options.high)
        expect(detected[Statistics.spellcasting]).toBe(Options.high)
    })

    it('detects spellcasting tradition and caster type', () => {
        const actor = buildActor({
            system: {
                details: { level: { value: 5 } },
            },
            items: [
                {
                    type: 'spellcastingEntry',
                    system: {
                        spelldc: { dc: 22 },
                        tradition: { value: 'divine' },
                        prepared: { value: 'prepared' },
                    },
                },
            ],
        })
        const form = new CreatureBuilderForm(actor)
        const detected = form.detectActorStats()
        expect(detected[Statistics.spellcasting]).toBe(Options.high)
        expect(detected[Statistics.spellcastingTradition]).toBe(
            MagicalTradition.divine,
        )
        expect(detected[Statistics.spellcastingType]).toBe(CasterType.prepared)
    })

    it('updates existing spellcasting entry with expanded slots when actor has one', async () => {
        const customSlots = {
            slot0: { max: 7, value: 7, prepared: [] },
            slot1: { max: 5, value: 5, prepared: [] },
            slot2: { max: 4, value: 4, prepared: [] },
        }
        const actor = buildActor({
            system: {
                details: { level: { value: 5 } },
            },
            items: [
                {
                    id: 'entry1',
                    type: 'spellcastingEntry',
                    system: {
                        spelldc: { dc: 22 },
                        tradition: { value: 'divine' },
                        prepared: { value: 'prepared' },
                        slots: customSlots,
                    },
                },
            ],
        })
        const form = new CreatureBuilderForm(actor)
        form.level = '5'

        form.detectActorStats()

        await form.applySpellcasting({
            [Statistics.spellcasting]: Options.high,
            [Statistics.spellcastingTradition]: MagicalTradition.divine,
            [Statistics.spellcastingType]: CasterType.prepared,
        })

        // Clone already has entry + spells; we update it, do not create
        expect(Item.create).not.toHaveBeenCalled()
        expect(actor.updateEmbeddedDocuments).toHaveBeenCalledWith(
            'Item',
            expect.arrayContaining([
                expect.objectContaining({
                    _id: 'entry1',
                    'system.spelldc.value': expect.any(Number),
                    'system.tradition.value': 'divine',
                    'system.prepared.value': 'prepared',
                    'system.slots': expect.any(Object),
                }),
            ]),
        )
    })

    it('updates spellcasting entry name when updating existing entry from clone', async () => {
        const actor = buildActor({
            system: { details: { level: { value: 5 } } },
            items: [
                {
                    id: 'entry1',
                    type: 'spellcastingEntry',
                    name: 'Arcane Prepared Spells',
                    system: {
                        spelldc: { dc: 22 },
                        tradition: { value: 'arcane' },
                        prepared: { value: 'prepared' },
                        slots: {
                            slot0: { max: 5, value: 5, prepared: [] },
                        },
                    },
                },
            ],
        })
        const form = new CreatureBuilderForm(actor)
        form.level = '5'

        await form.applySpellcasting({
            [Statistics.spellcasting]: Options.high,
            [Statistics.spellcastingTradition]: MagicalTradition.divine,
            [Statistics.spellcastingType]: CasterType.spontaneous,
        })

        expect(actor.updateEmbeddedDocuments).toHaveBeenCalledWith(
            'Item',
            expect.arrayContaining([
                expect.objectContaining({
                    _id: 'entry1',
                    name: 'Divine Spontaneous loc:PF2EMONSTERMAKER.spells',
                    'system.tradition.value': 'divine',
                    'system.prepared.value': 'spontaneous',
                }),
            ]),
        )
    })

    it('generates new slots when no detected slots exist', async () => {
        const actor = buildActor({
            system: {
                details: { level: { value: 5 } },
            },
            items: [], // No spellcasting entry to detect
        })
        const form = new CreatureBuilderForm(actor)
        form.level = '5'

        // Detect stats (will not find any slots)
        form.detectActorStats()

        // Apply spellcasting
        await form.applySpellcasting({
            [Statistics.spellcasting]: Options.high,
            [Statistics.spellcastingTradition]: MagicalTradition.arcane,
            [Statistics.spellcastingType]: CasterType.spontaneous,
        })

        expect(Item.create).toHaveBeenCalledTimes(1)
        const [payload] = Item.create.mock.calls[0]
        // Should have generated slots for level 5 spontaneous caster
        expect(payload.system.slots.slot0.max).toBe(5)
        expect(payload.system.slots.slot1.max).toBe(4)
        expect(payload.system.slots.slot2.max).toBe(4)
        expect(payload.system.slots.slot3.max).toBe(3)
    })

    it('detects traits from the actor', () => {
        const actor = buildActor({
            system: { traits: { value: ['undead'] } },
        })
        const form = new CreatureBuilderForm(actor)
        expect(form.detectTraits()).toEqual(['undead'])
    })

    it('returns empty traits when none are present', () => {
        const form = new CreatureBuilderForm(buildActor())
        expect(form.detectTraits()).toEqual([])
    })

    it('detects lore skills from actor items', () => {
        const actor = buildActor({
            system: { details: { level: { value: 1 } } },
            items: [
                {
                    type: 'lore',
                    name: 'Sailing Lore (expert)',
                    system: { mod: { value: 6 } },
                },
            ],
        })
        const form = new CreatureBuilderForm(actor)
        expect(form.detectLoreSkills()).toEqual([
            { name: 'Sailing', level: Options.moderate },
        ])
    })

    it('returns data used by the form template', () => {
        const actor = buildActor({
            name: 'Hero',
            system: { details: { level: { value: 1 } } },
        })
        const form = new CreatureBuilderForm(actor)
        vi.spyOn(form, 'detectActorStats').mockReturnValue({
            [Statistics.str]: Options.high,
        })
        vi.spyOn(form, 'detectTraits').mockReturnValue(['undead'])
        vi.spyOn(form, 'detectLoreSkills').mockReturnValue([
            { name: 'Sailing', level: Options.moderate },
        ])

        const data = form.getData()
        expect(
            (globalThis as any).Handlebars.registerHelper,
        ).toHaveBeenCalledWith('json', expect.any(Function))
        const jsonHelper = (globalThis as any).Handlebars.registerHelper.mock
            .calls[0][1]
        expect(jsonHelper({ foo: 'bar' })).toBe('{"foo":"bar"}')
        expect(data.name).toBe('Hero')
        expect(data.detectedStats).toEqual({
            [Statistics.str]: Options.high,
        })
        expect(data.detectedTraits).toEqual(['undead'])
        expect(data.detectedLoreSkills).toEqual([
            { name: 'Sailing', level: Options.moderate },
        ])
        expect(data.actorLevel).toBe('1')
    })

    it('formats roadmap labels for custom keys', () => {
        const form = new CreatureBuilderForm(buildActor())
        form.getData()

        const roadmapLabelHelper = (
            globalThis as any
        ).Handlebars.registerHelper.mock.calls.find(
            (call: [string, unknown]) => call[0] === 'roadmapLabel',
        )?.[1] as (key: string) => string

        expect(roadmapLabelHelper('PF2EMONSTERMAKER.custom.tank')).toBe('Tank')
        expect(
            roadmapLabelHelper('PF2EMONSTERMAKER.custom.tank-healer_v2_0'),
        ).toBe('Tank Healer V2 0')
        expect(roadmapLabelHelper('PF2EMONSTERMAKER.custom._')).toBe(
            'PF2EMONSTERMAKER.custom._',
        )
        expect(roadmapLabelHelper(null as unknown as string)).toBe('')
        expect(roadmapLabelHelper('PF2EMONSTERMAKER.brute')).toBe(
            'loc:PF2EMONSTERMAKER.brute',
        )
    })

    it('updates existing spellcasting entry when slots are missing', async () => {
        const actor = buildActor({
            items: [
                {
                    id: 'entry1',
                    type: 'spellcastingEntry',
                    system: { spelldc: { dc: 18 } },
                },
            ],
        })
        const form = new CreatureBuilderForm(actor)
        form.level = '1'

        await form.applySpellcasting({
            [Statistics.spellcasting]: Options.high,
            [Statistics.spellcastingType]: CasterType.prepared,
        })

        expect(actor.updateEmbeddedDocuments).toHaveBeenCalledWith(
            'Item',
            expect.arrayContaining([
                expect.objectContaining({
                    _id: 'entry1',
                    'system.slots': expect.any(Object),
                }),
            ]),
        )
    })

    it('uses innate spell copy strategy when updating existing entry', async () => {
        const actor = buildActor({
            items: [
                {
                    id: 'entry1',
                    type: 'spellcastingEntry',
                    system: {
                        spelldc: { dc: 18 },
                        slots: { slot0: { max: 1, value: 1, prepared: [] } },
                    },
                },
            ],
        })
        const form = new CreatureBuilderForm(actor)
        form.level = '1'

        await form.applySpellcasting({
            [Statistics.spellcasting]: Options.high,
            [Statistics.spellcastingType]: CasterType.innate,
        })

        expect(actor.updateEmbeddedDocuments).toHaveBeenCalledWith(
            'Item',
            expect.arrayContaining([
                expect.objectContaining({
                    _id: 'entry1',
                    'system.slots': expect.any(Object),
                }),
            ]),
        )
    })

    it('falls back to generated slots when no spell copy strategy is available', async () => {
        const strategySpy = vi
            .spyOn(SpellCopyStrategies, 'createSpellCopyStrategy')
            .mockReturnValue(null)

        const actor = buildActor({
            items: [
                {
                    id: 'entry1',
                    type: 'spellcastingEntry',
                    system: {
                        spelldc: { dc: 18 },
                        slots: { slot0: { max: 1, value: 1, prepared: [] } },
                    },
                },
            ],
        })
        const form = new CreatureBuilderForm(actor)
        form.level = '1'

        await form.applySpellcasting({
            [Statistics.spellcasting]: Options.high,
            [Statistics.spellcastingType]: CasterType.innate,
        })

        expect(strategySpy).toHaveBeenCalled()
        expect(actor.updateEmbeddedDocuments).toHaveBeenCalledWith(
            'Item',
            expect.arrayContaining([
                expect.objectContaining({
                    _id: 'entry1',
                    'system.slots': expect.any(Object),
                }),
            ]),
        )

        strategySpy.mockRestore()
    })

    it('detects stats with clamped level and skill value fallback', () => {
        const actor = buildActor({
            system: {
                details: { level: { value: 999 } },
                skills: { acrobatics: { value: 6 } },
            },
            items: undefined,
        })
        const form = new CreatureBuilderForm(actor)

        const detected = form.detectActorStats()
        expect(detected[Statistics.acrobatics]).toBeDefined()
    })

    it('detects lore skills with unknown names and skips invalid entries', () => {
        const actor = buildActor({
            system: { details: { level: { value: 1 } } },
            items: [
                {
                    type: 'lore',
                    name: undefined,
                    system: { mod: { value: 6 } },
                },
                {
                    type: 'lore',
                    name: 'Zero Lore',
                    system: { mod: { value: 0 } },
                },
                {
                    type: 'spell',
                    name: 'Not Lore',
                    system: { mod: { value: 10 } },
                },
                {
                    type: 'lore',
                    name: 'NaN Lore',
                    system: { mod: { value: 'NaN' } },
                },
            ],
        })
        const form = new CreatureBuilderForm(actor)
        const detected = form.detectLoreSkills()

        expect(detected).toHaveLength(1)
        expect(detected[0]?.name).toBe('Unknown')
    })

    it('returns default level in getData when requested', () => {
        const actor = buildActor({
            name: 'Hero',
            system: { details: { level: { value: 1 } } },
        })
        const form = new CreatureBuilderForm(actor, { useDefaultLevel: true })

        const data = form.getData()
        expect(data.actorLevel).toBe(DefaultCreatureLevel)
    })

    it('exposes default options for the form', () => {
        const options = CreatureBuilderForm.defaultOptions
        expect(options.classes).toContain('creatureBuilderForm')
        expect(options.id).toBe('creatureBuilderForm')
    })

    it('exposes instance id getter', () => {
        const form = new CreatureBuilderForm(buildActor())
        expect(form.id).toMatch(/^creatureBuilderForm-\d+-[a-z0-9]+$/)
    })

    it('activates listeners and initializes the UI', () => {
        const actor = buildActor({
            system: { details: { level: { value: 2 } } },
        })
        const form = new CreatureBuilderForm(actor)
        const initSpy = vi
            .spyOn(CreatureBuilderFormUI.prototype, 'initialize')
            .mockImplementation(() => {})
        vi.spyOn(form, 'detectActorStats').mockReturnValue({
            [Statistics.str]: Options.high,
        })
        vi.spyOn(form, 'detectTraits').mockReturnValue(['undead'])
        vi.spyOn(form, 'detectLoreSkills').mockReturnValue([])

        form.activateListeners({} as JQuery)

        expect(initSpy).toHaveBeenCalled()
    })

    it('uses default level in activateListeners when actor has no level', () => {
        const actor = buildActor({ system: {} })
        const form = new CreatureBuilderForm(actor)
        const initSpy = vi
            .spyOn(CreatureBuilderFormUI.prototype, 'initialize')
            .mockImplementation(() => {})
        vi.spyOn(form, 'detectActorStats').mockReturnValue({})
        vi.spyOn(form, 'detectTraits').mockReturnValue([])
        vi.spyOn(form, 'detectLoreSkills').mockReturnValue([])

        form.activateListeners({} as JQuery)

        expect(initSpy).toHaveBeenCalled()
        expect((form as any).formUI).not.toBeNull()
    })

    it('uses the default level when requested', () => {
        const actor = buildActor({
            system: { details: { level: { value: 2 } } },
        })
        const form = new CreatureBuilderForm(actor, { useDefaultLevel: true })
        const initSpy = vi
            .spyOn(CreatureBuilderFormUI.prototype, 'initialize')
            .mockImplementation(() => {})

        form.activateListeners({} as JQuery)

        // biome-ignore lint/complexity/useLiteralKeys: private property
        const actorLevel = (form['formUI'] as any).actorLevel
        expect(actorLevel).toBe(DefaultCreatureLevel)
        expect(initSpy).toHaveBeenCalled()
    })

    it('clears form UI reference on close', async () => {
        const form = new CreatureBuilderForm(buildActor())
        // biome-ignore lint/complexity/useLiteralKeys: private property
        form['formUI'] = {} as CreatureBuilderFormUI
        await form.close()
        // biome-ignore lint/complexity/useLiteralKeys: private property
        expect(form['formUI']).toBeNull()
    })

    it('logs and returns when actor clone fails', async () => {
        const actor = buildActor()
        ;(actor as any).clone = vi.fn().mockResolvedValue(null)
        const form = new CreatureBuilderForm(actor)

        // biome-ignore lint/complexity/useLiteralKeys: protected property
        await form['_updateObject'](undefined as unknown as Event, {
            [Statistics.name]: 'New Monster',
            [Statistics.level]: '1',
        })

        expect(globalLog).toHaveBeenCalledWith(true, 'Failed to clone actor')
    })

    it('deletes melee and lore items from clone when updating', async () => {
        const originalActor = buildActor({
            system: { details: { level: { value: 1 } } },
        })
        const newActor = buildActor({
            items: [
                { id: 'strike1', type: 'melee' },
                { id: 'lore1', type: 'lore' },
                { id: 'spell1', type: 'spell' },
            ],
            deleteEmbeddedDocuments: vi.fn().mockResolvedValue(undefined),
        })
        ;(originalActor as any).clone = vi.fn().mockResolvedValue(newActor)
        const form = new CreatureBuilderForm(originalActor)

        vi.spyOn(form, 'applyHitPoints').mockReturnValue({
            'system.attributes.hp.value': 20,
        })
        vi.spyOn(form, 'applyStrike').mockResolvedValue(undefined)
        vi.spyOn(form, 'applySpellcasting').mockResolvedValue(undefined)
        vi.spyOn(form, 'applySkills').mockResolvedValue(undefined)
        vi.spyOn(form, 'applyLoreSkills').mockResolvedValue(undefined)

        // biome-ignore lint/complexity/useLiteralKeys: protected
        await form['_updateObject'](undefined as unknown as Event, {
            [Statistics.name]: 'Test',
            [Statistics.level]: '1',
        })

        expect(newActor.deleteEmbeddedDocuments).toHaveBeenCalledWith('Item', [
            'strike1',
            'lore1',
        ])
    })

    it('creates a new actor via clone and applies updates', async () => {
        const originalActor = buildActor({
            system: {
                details: { level: { value: 1 } },
                perception: { senses: [{ type: 'darkvision' }] },
                movement: { land: 25 },
            },
        })
        const newActor = buildActor({
            deleteEmbeddedDocuments: vi.fn().mockResolvedValue(undefined),
        })
        ;(originalActor as any).clone = vi.fn().mockResolvedValue(newActor)
        const form = new CreatureBuilderForm(originalActor)

        vi.spyOn(form, 'applyHitPoints').mockReturnValue({
            'system.attributes.hp.value': 123,
        })
        vi.spyOn(form, 'applyStrike').mockResolvedValue(undefined)
        vi.spyOn(form, 'applySpellcasting').mockResolvedValue(undefined)
        vi.spyOn(form, 'applySkills').mockResolvedValue(undefined)
        vi.spyOn(form, 'applyLoreSkills').mockResolvedValue(undefined)

        // biome-ignore lint/complexity/useLiteralKeys: protected property
        await form['_updateObject'](undefined as unknown as Event, {
            [Statistics.name]: 'New Monster',
            [Statistics.level]: '1',
            [Statistics.str]: Options.high,
            'PF2EMONSTERMAKER.traits': 'Undead, Fiend',
        })

        const expectedStr = parseInt(
            statisticValues[Statistics.str]['1'][Options.high],
            10,
        )

        expect(
            (originalActor as unknown as { clone: ReturnType<typeof vi.fn> })
                .clone,
        ).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'New Monster',
                'system.abilities.str.mod': expectedStr,
                'system.details.level.value': 1,
                'system.traits.value': ['undead', 'fiend'],
                'system.attributes.hp.value': 123,
            }),
            { save: true },
        )
        expect(newActor.sheet.render).toHaveBeenCalledWith(true)
        expect(form.actor).toBe(originalActor)
    })
})

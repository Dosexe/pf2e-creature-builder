import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { globalLog } from '@/utils'
import CreatureBuilderFormUI from './CreatureBuilderFormUI'
import { DefaultCreatureLevel, Options, Skills, Statistics } from './Keys'
import { statisticValues } from './Values'

vi.mock('@/utils', () => ({ globalLog: vi.fn() }))

let CreatureBuilderForm: typeof import('./CreatureBuilderForm').CreatureBuilderForm
let Actor: { create: ReturnType<typeof vi.fn> }
let Item: { create: ReturnType<typeof vi.fn> }

const mergeObject = (target: Record<string, unknown>, source: Record<string, unknown>) => ({
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
            Object.assign(result, flattenObject(value as Record<string, unknown>, path))
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

    it('skips spellcasting when option is none', () => {
        const form = new CreatureBuilderForm(buildActor())
        form.level = '1'
        const result = form.applySpellcasting({
            [Statistics.spellcasting]: Options.none,
        })
        expect(result).toBeUndefined()
        expect(Item.create).not.toHaveBeenCalled()
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
            name: 'loc:PF2EMONSTERMAKER.spellcasting',
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

    it('returns empty data for missing senses or movement', () => {
        const form = new CreatureBuilderForm(buildActor())
        expect(form.applySenses([])).toEqual({})
        expect(form.applyMovement({})).toEqual({})
    })

    it('returns senses and movement when provided', () => {
        const form = new CreatureBuilderForm(buildActor())
        const senses = [{ type: 'darkvision' }]
        const movement = { land: 25 }
        expect(form.applySenses(senses)).toEqual({
            'system.perception.senses': senses,
        })
        expect(form.applyMovement(movement)).toEqual({
            'system.movement': movement,
        })
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
        expect((globalThis as any).Handlebars.registerHelper).toHaveBeenCalledWith(
            'json',
            expect.any(Function),
        )
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

        expect(form['formUI']).toBeInstanceOf(CreatureBuilderFormUI)
        expect(initSpy).toHaveBeenCalled()
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

        const actorLevel = (form['formUI'] as any).actorLevel
        expect(actorLevel).toBe(DefaultCreatureLevel)
        expect(initSpy).toHaveBeenCalled()
    })

    it('clears form UI reference on close', async () => {
        const form = new CreatureBuilderForm(buildActor())
        form['formUI'] = {} as CreatureBuilderFormUI
        await form.close()
        expect(form['formUI']).toBeNull()
    })

    it('logs and returns when actor creation fails', async () => {
        const form = new CreatureBuilderForm(buildActor())
        ;(Actor.create as any).mockResolvedValue(null)

        await form['_updateObject'](undefined as unknown as Event, {
            [Statistics.name]: 'New Monster',
            [Statistics.level]: '1',
        })

        expect(globalLog).toHaveBeenCalledWith(true, 'Failed to create new actor')
    })

    it('creates a new actor and applies updates', async () => {
        const originalActor = buildActor({
            system: {
                details: { level: { value: 1 } },
                perception: { senses: [{ type: 'darkvision' }] },
                movement: { land: 25 },
            },
        })
        const form = new CreatureBuilderForm(originalActor)

        const newActor = buildActor()
        ;(Actor.create as any).mockResolvedValue(newActor)

        const applyHitPoints = vi
            .spyOn(form, 'applyHitPoints')
            .mockReturnValue({ 'system.attributes.hp.value': 123 })
        vi.spyOn(form, 'applyStrike').mockResolvedValue(undefined)
        vi.spyOn(form, 'applySpellcasting').mockResolvedValue(undefined)
        vi.spyOn(form, 'applySkills').mockResolvedValue(undefined)
        vi.spyOn(form, 'applyLoreSkills').mockResolvedValue(undefined)

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

        expect(Actor.create).toHaveBeenCalledWith({
            name: 'New Monster',
            type: 'npc',
        })
        expect(newActor.update).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'New Monster',
                'system.abilities.str.mod': expectedStr,
                'system.details.level.value': 1,
                'system.traits.value': ['undead', 'fiend'],
                'system.perception.senses': [{ type: 'darkvision' }],
                'system.movement': { land: 25 },
            }),
        )
        expect(newActor.update).toHaveBeenCalledWith(
            applyHitPoints.mock.results[0].value,
        )
        expect(newActor.sheet.render).toHaveBeenCalledWith(true)
        expect(form.actor).toBe(originalActor)
    })
})

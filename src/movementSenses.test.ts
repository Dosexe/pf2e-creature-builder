import { afterEach, describe, expect, it } from 'vitest'
import {
    actorSpeedsFromChips,
    acuityLabel,
    FALLBACK_SENSE_TYPES,
    mandatoryAcuity,
    movementActorUpdate,
    readActorSenses,
    readActorSpeed,
    senseChoices,
    senseHasRange,
    sensesFromActor,
    sensesFromControls,
    sensesFromForm,
    senseToActor,
    speedLabel,
    speedsFromActor,
    speedsFromControls,
    speedsFromForm,
} from './movementSenses'

afterEach(() => {
    delete (globalThis as { game?: unknown }).game
    delete (globalThis as { CONFIG?: unknown }).CONFIG
})

describe('movement and sense rules', () => {
    it('defaults to land 25 when no speeds are stored', () => {
        expect(speedsFromActor(undefined)).toEqual([
            { type: 'land', value: 25 },
        ])
        expect(speedsFromActor({})).toEqual([{ type: 'land', value: 25 }])
    })

    it('reads land and other speeds, omitting a zero land speed', () => {
        expect(
            speedsFromActor({
                value: 25,
                otherSpeeds: [
                    { type: 'fly', value: 40 },
                    { type: 'swim', value: '15.2' },
                    { type: 'land', value: 10 },
                    { type: 'teleport', value: 30 },
                    { type: 'fly', value: 5 },
                ],
            }),
        ).toEqual([
            { type: 'land', value: 25 },
            { type: 'fly', value: 40 },
            { type: 'swim', value: 15 },
        ])

        expect(
            speedsFromActor({
                value: 0,
                otherSpeeds: [{ type: 'burrow', value: 20 }],
            }),
        ).toEqual([{ type: 'burrow', value: 20 }])
    })

    it('keeps a stored land speed of 0 when it is the only speed', () => {
        expect(speedsFromActor({ value: 0, otherSpeeds: [] })).toEqual([
            { type: 'land', value: 0 },
        ])
    })

    it('writes land to the primary speed and the rest in menu order', () => {
        expect(
            actorSpeedsFromChips([
                { type: 'burrow', value: 10 },
                { type: 'fly', value: 30 },
                { type: 'fly', value: 99 },
            ]),
        ).toEqual({
            value: 0,
            otherSpeeds: [
                { type: 'fly', value: 30 },
                { type: 'burrow', value: 10 },
            ],
        })
        expect(actorSpeedsFromChips([])).toEqual({
            value: 25,
            otherSpeeds: [],
        })
    })

    it('restores speed chips from preserved controls', () => {
        expect(
            speedsFromControls({
                'speedType-fly': 'fly',
                'speedValue-fly': '40',
                'speedType-land': 'land',
                'speedValue-land': '25',
            }),
        ).toEqual([
            { type: 'fly', value: 40 },
            { type: 'land', value: 25 },
        ])
        expect(speedsFromControls(null)).toBeNull()
        expect(speedsFromControls({})).toBeNull()
    })

    it('reads speed chips from form data', () => {
        expect(
            speedsFromForm({
                'speedType-land': 'land',
                'speedValue-land': 25,
                'speedType-climb': 'climb',
                'speedValue-climb': '',
                'speedType-nope': 'teleport',
            }),
        ).toEqual([
            { type: 'land', value: 25 },
            { type: 'climb', value: 0 },
        ])
    })

    it('uses the official sense list and system config when present', () => {
        expect(senseChoices().map((choice) => choice.slug)).toEqual([
            ...FALLBACK_SENSE_TYPES,
        ])
        ;(globalThis as { CONFIG?: unknown }).CONFIG = {
            PF2E: {
                senses: {
                    darkvision: 'PF2E.Sense.Darkvision',
                    scent: 'PF2E.Sense.Scent',
                    '': 'ignored',
                    blank: 1,
                },
            },
        }
        ;(globalThis as { game?: unknown }).game = {
            i18n: {
                localize: (key: string) =>
                    key === 'PF2E.Sense.Darkvision' ? 'Darkvision' : key,
            },
        }
        expect(senseChoices()).toEqual([
            { slug: 'darkvision', label: 'Darkvision' },
            { slug: 'scent', label: 'Scent' },
        ])
    })

    it('shows range and acuity only where the system does', () => {
        expect(senseHasRange('darkvision')).toBe(false)
        expect(senseHasRange('truesight')).toBe(false)
        expect(senseHasRange('echolocation')).toBe(true)
        expect(senseHasRange('scent')).toBe(true)
        expect(mandatoryAcuity('echolocation')).toBe('precise')
        expect(mandatoryAcuity('infrared-vision')).toBe('precise')
        expect(mandatoryAcuity('scent')).toBeNull()
        expect(mandatoryAcuity('tremorsense')).toBeNull()
    })

    it('reads actor senses and drops duplicates and inapplicable fields', () => {
        expect(
            sensesFromActor([
                { type: 'darkvision', acuity: 'imprecise', range: 60 },
                { type: 'darkvision' },
                { type: 'scent', acuity: 'vague', range: 30 },
                { type: 'echolocation', range: 40 },
                { type: '  ' },
                null,
            ]),
        ).toEqual([
            { type: 'darkvision' },
            { type: 'scent', acuity: 'vague', range: 30 },
            { type: 'echolocation', range: 40 },
        ])
        expect(sensesFromActor(null)).toEqual([])
    })

    it('restores senses only after the section has been initialized', () => {
        expect(
            sensesFromControls({
                sensesInitialized: 'true',
                senseType1: 'scent',
                senseAcuity1: 'precise',
                senseRange1: '15',
                senseType0: 'darkvision',
                senseRange0: '60',
            }),
        ).toEqual([
            { type: 'darkvision' },
            { type: 'scent', acuity: 'precise', range: 15 },
        ])
        expect(sensesFromControls({ senseType0: 'scent' })).toBeNull()
        expect(sensesFromControls({ sensesInitialized: 'true' })).toEqual([])
    })

    it('writes senses with mandatory acuity and without a fixed range', () => {
        expect(
            senseToActor({ type: 'darkvision', acuity: 'vague', range: 10 }),
        ).toEqual({
            type: 'darkvision',
            acuity: 'precise',
        })
        expect(senseToActor({ type: 'truesight' })).toEqual({
            type: 'truesight',
            acuity: 'precise',
        })
        expect(senseToActor({ type: 'echolocation', range: 40 })).toEqual({
            type: 'echolocation',
            acuity: 'precise',
            range: 40,
        })
        expect(senseToActor({ type: 'scent' })).toEqual({
            type: 'scent',
            acuity: 'imprecise',
            range: 30,
        })
        expect(
            sensesFromForm({
                senseType0: 'wavesense',
                senseAcuity0: 'precise',
                senseRange0: 20,
                senseType1: 'wavesense',
                senseType2: 'low-light-vision',
            }).map(senseToActor),
        ).toEqual([
            { type: 'wavesense', acuity: 'precise', range: 20 },
            { type: 'low-light-vision', acuity: 'precise' },
        ])
    })

    it('builds the actor update only when the section was submitted', () => {
        expect(movementActorUpdate({})).toBeNull()
        expect(
            movementActorUpdate({
                movementSensesPresent: 'true',
                'speedType-land': 'land',
                'speedValue-land': '20',
                'speedType-swim': 'swim',
                'speedValue-swim': '10',
                senseType0: 'scent',
                senseAcuity0: 'imprecise',
                senseRange0: '30',
            }),
        ).toEqual({
            'system.attributes.speed.value': 20,
            'system.attributes.speed.otherSpeeds': [
                { type: 'swim', value: 10 },
            ],
            'system.perception.senses': [
                { type: 'scent', acuity: 'imprecise', range: 30 },
            ],
        })
    })

    it('prefers source speed and sense data over prepared actor data', () => {
        const actor = {
            _source: {
                system: {
                    attributes: { speed: { value: 0, otherSpeeds: [] } },
                    perception: { senses: [] },
                },
            },
            system: {
                attributes: { speed: { value: 40 } },
                perception: { senses: [{ type: 'darkvision' }] },
            },
        }
        expect(readActorSpeed(actor)).toEqual({ value: 0, otherSpeeds: [] })
        expect(readActorSenses(actor)).toEqual([])
        expect(
            readActorSpeed({
                system: { attributes: { speed: { value: 30 } } },
            }),
        ).toEqual({ value: 30 })
        expect(
            readActorSenses({
                system: { perception: { senses: [{ type: 'scent' }] } },
            }),
        ).toEqual([{ type: 'scent' }])
    })

    it('ignores invalid speed and sense values', () => {
        expect(speedsFromActor({ value: 'fast', otherSpeeds: {} })).toEqual([
            { type: 'land', value: 0 },
        ])
        expect(speedsFromActor({ value: -4, otherSpeeds: [] })).toEqual([
            { type: 'land', value: 0 },
        ])
        expect(
            speedsFromActor({
                value: -4,
                otherSpeeds: [
                    { type: 4 },
                    null,
                    { type: 'fly', value: Number.NaN },
                ],
            }),
        ).toEqual([{ type: 'fly', value: 0 }])
        expect(
            speedsFromControls({
                'speedType-land': 'land',
                'speedValue-land': '10',
                'speedType-again': 'land',
                'speedType-bad': 'teleport',
            }),
        ).toEqual([{ type: 'land', value: 10 }])
        expect(
            sensesFromControls({
                sensesInitialized: 'true',
                senseType0: '   ',
                senseType1: 'scent',
                senseRange1: '0',
                senseType2: 'scent',
            }),
        ).toEqual([{ type: 'scent' }])
        expect(
            sensesFromForm({
                senseType0: 5,
                senseType1: 'scent',
                senseAcuity1: 'sharp',
                senseRange1: Number.POSITIVE_INFINITY,
                senseType2: 'scent',
            }),
        ).toEqual([{ type: 'scent' }])
        expect(movementActorUpdate({ movementSensesPresent: true })).toEqual({
            'system.attributes.speed.value': 25,
            'system.attributes.speed.otherSpeeds': [],
            'system.perception.senses': [],
        })
        expect(
            readActorSpeed({
                _source: { system: { attributes: { speed: 25 } } },
                system: { attributes: { speed: { value: 10 } } },
            }),
        ).toEqual({ value: 10 })
        expect(
            readActorSenses({
                _source: { system: { perception: { details: '' } } },
                system: { perception: { senses: [{ type: 'scent' }] } },
            }),
        ).toEqual([{ type: 'scent' }])
    })

    it('localizes speed and acuity labels', () => {
        ;(globalThis as { game?: unknown }).game = {
            i18n: {
                localize: (key: string) => {
                    if (key.endsWith('.fly')) return 'Fly'
                    if (key.endsWith('.vague')) return 'Vague'
                    return key
                },
            },
        }
        ;(globalThis as { CONFIG?: unknown }).CONFIG = {
            PF2E: { senseAcuities: { precise: 'PF2E.Acuity.Precise' } },
        }
        expect(speedLabel('fly')).toBe('Fly')
        ;(globalThis as { game?: unknown }).game = {
            i18n: {
                translations: {
                    'pf2e-creature-builder.form.movement.speed.swim': 'Swim',
                },
                localize(
                    this: { translations: Record<string, string> },
                    key: string,
                ) {
                    return this.translations[key] ?? key
                },
            },
        }
        expect(speedLabel('swim')).toBe('Swim')
        expect(speedLabel('land')).toBe('Land')
        expect(acuityLabel('vague')).toBe('Vague')
        expect(acuityLabel('precise')).toBe('Precise')
        ;(globalThis as { game?: unknown }).game = {
            i18n: {
                localize: (key: string) => {
                    if (key === 'PF2E.Acuity.Precise') return 'Precise Sight'
                    if (key.endsWith('.scent')) return 'Smell'
                    return key
                },
            },
        }
        expect(acuityLabel('precise')).toBe('Precise Sight')
        ;(globalThis as { CONFIG?: unknown }).CONFIG = {
            PF2E: { senses: { scent: 'PF2E.Sense.Scent' } },
        }
        expect(senseChoices()).toEqual([{ slug: 'scent', label: 'Smell' }])
    })
})

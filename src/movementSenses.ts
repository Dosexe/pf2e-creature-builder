import { getCreatureSystem } from '@/systems/getCreatureSystem'

export const MOVEMENT_TYPES = [
    'land',
    'fly',
    'swim',
    'climb',
    'burrow',
] as const

export type MovementType = (typeof MOVEMENT_TYPES)[number]

/** Order shown in the add-speed menu. Land is offered only after it was removed. */
export const SPEED_MENU_ORDER = [
    'fly',
    'swim',
    'climb',
    'burrow',
    'land',
] as const

export const DEFAULT_LAND_SPEED = 25
export const DEFAULT_SENSE_RANGE = 30

export const SENSE_ACUITIES = ['precise', 'imprecise', 'vague'] as const

export type SenseAcuity = (typeof SENSE_ACUITIES)[number]

/** Shared PF2E v14 sense types. Starfinder additions come from the active creature system. Runtime prefers CONFIG.PF2E.senses, then appends those additions. */
export const FALLBACK_SENSE_TYPES = [
    'bloodsense',
    'darkvision',
    'echolocation',
    'electromagnetic-sense',
    'greater-darkvision',
    'infrared-vision',
    'lifesense',
    'low-light-vision',
    'magicsense',
    'motion-sense',
    'scent',
    'see-invisibility',
    'spiritsense',
    'thoughtsense',
    'tremorsense',
    'truesight',
    'wavesense',
] as const

const SENSES_WITH_MANDATORY_ACUITIES: Record<string, SenseAcuity> = {
    darkvision: 'precise',
    echolocation: 'precise',
    'greater-darkvision': 'precise',
    'infrared-vision': 'precise',
    'low-light-vision': 'precise',
    'see-invisibility': 'precise',
    truesight: 'precise',
}

/** Range is not editable. Truesight is a fixed 60 feet in the system. */
const SENSES_WITHOUT_RANGE = new Set([
    'darkvision',
    'greater-darkvision',
    'low-light-vision',
    'see-invisibility',
    'truesight',
])

export const MOVEMENT_SECTION_MARKER = 'movementSensesPresent'
export const SENSES_INITIALIZED_MARKER = 'sensesInitialized'

export interface SpeedChip {
    type: MovementType
    value: number
}

export interface SenseDraft {
    type: string
    acuity?: SenseAcuity
    range?: number
}

export interface SenseChoice {
    slug: string
    label: string
}

interface ActorSpeed {
    value: number
    otherSpeeds: { type: Exclude<MovementType, 'land'>; value: number }[]
}

interface SenseRecord {
    type?: unknown
    acuity?: unknown
    range?: unknown
}

interface SpeedRecord {
    value?: unknown
    otherSpeeds?: unknown
}

type FormRecord = Record<string, unknown>

function gameLocalize(key: string): string | null {
    const i18n = (
        globalThis as {
            game?: { i18n?: { localize?: (key: string) => string } }
        }
    ).game?.i18n
    if (!i18n?.localize) return null
    let value: string
    try {
        value = i18n.localize(key)
    } catch {
        return null
    }
    if (!value || value === key) return null
    return value
}

function titleFromSlug(slug: string): string {
    return slug
        .split('-')
        .filter((part) => part.length > 0)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

export function isMovementType(value: string): value is MovementType {
    return (MOVEMENT_TYPES as readonly string[]).includes(value)
}

export function isSenseAcuity(value: string): value is SenseAcuity {
    return (SENSE_ACUITIES as readonly string[]).includes(value)
}

export function speedLabel(type: MovementType): string {
    return (
        gameLocalize(`pf2e-creature-builder.form.movement.speed.${type}`) ??
        titleFromSlug(type)
    )
}

export function acuityLabel(acuity: SenseAcuity): string {
    const configured = (
        globalThis as {
            CONFIG?: { PF2E?: { senseAcuities?: Record<string, string> } }
        }
    ).CONFIG?.PF2E?.senseAcuities?.[acuity]
    if (typeof configured === 'string') {
        const systemLabel = gameLocalize(configured)
        if (systemLabel) return systemLabel
    }
    return (
        gameLocalize(`pf2e-creature-builder.form.movement.acuity.${acuity}`) ??
        titleFromSlug(acuity)
    )
}

export function senseCopyLimit(type: string): number {
    return getCreatureSystem().maxSenseCopies(type)
}

export function mandatoryAcuity(type: string): SenseAcuity | null {
    if (getCreatureSystem().sensesWithFlexibleAcuity().includes(type)) {
        return null
    }
    return SENSES_WITH_MANDATORY_ACUITIES[type] ?? null
}

export function senseHasRange(type: string): boolean {
    return !SENSES_WITHOUT_RANGE.has(type)
}

export function senseChoices(): SenseChoice[] {
    const configured = (
        globalThis as {
            CONFIG?: { PF2E?: { senses?: Record<string, unknown> } }
        }
    ).CONFIG?.PF2E?.senses
    const fromSystem = Object.entries(configured ?? {}).flatMap(
        ([slug, label]) => {
            if (!slug || typeof label !== 'string') return []
            return [senseChoice(slug, label)]
        },
    )
    const base =
        fromSystem.length > 0
            ? fromSystem
            : FALLBACK_SENSE_TYPES.map((slug) => senseChoice(slug))
    return appendSystemSenses(base)
}

function senseChoice(slug: string, configuredLabel?: string): SenseChoice {
    const fromConfig = configuredLabel ? gameLocalize(configuredLabel) : null
    return {
        slug,
        label:
            fromConfig ??
            gameLocalize(`pf2e-creature-builder.form.movement.sense.${slug}`) ??
            titleFromSlug(slug),
    }
}

function appendSystemSenses(choices: SenseChoice[]): SenseChoice[] {
    const present = new Set(choices.map((choice) => choice.slug))
    for (const slug of getCreatureSystem().extraSenseTypes()) {
        if (present.has(slug)) continue
        present.add(slug)
        choices.push(senseChoice(slug))
    }
    return choices
}

function takeSenseType(type: string, counts: Map<string, number>): boolean {
    const count = counts.get(type) ?? 0
    if (count >= senseCopyLimit(type)) return false
    counts.set(type, count + 1)
    return true
}

function normalizeSpeed(value: unknown): number {
    const speed = Number(value)
    if (!Number.isFinite(speed)) return 0
    return Math.max(0, Math.round(speed))
}

function normalizeRange(value: unknown): number {
    const range = Number(value)
    if (!Number.isFinite(range) || range <= 0) return DEFAULT_SENSE_RANGE
    return Math.round(range)
}

function asRecord(value: unknown): FormRecord | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return value as FormRecord
}

export function speedsFromActor(speed: unknown): SpeedChip[] {
    const record = asRecord(speed) as SpeedRecord | null
    if (!record) return [{ type: 'land', value: DEFAULT_LAND_SPEED }]

    const other = otherSpeedsFromActor(record.otherSpeeds)
    const hasLand =
        record.value !== undefined &&
        record.value !== null &&
        record.value !== ''
    const land = hasLand ? normalizeSpeed(record.value) : null
    const chips: SpeedChip[] = []
    if (land !== null && !(land === 0 && other.length > 0)) {
        chips.push({ type: 'land', value: land })
    }
    chips.push(...other)
    if (chips.length === 0) return [{ type: 'land', value: DEFAULT_LAND_SPEED }]
    return chips
}

function otherSpeedsFromActor(value: unknown): SpeedChip[] {
    if (!Array.isArray(value)) return []
    const chips: SpeedChip[] = []
    const seen = new Set<string>()
    for (const entry of value) {
        const record = asRecord(entry)
        const type = typeof record?.type === 'string' ? record.type : ''
        if (!isMovementType(type) || type === 'land' || seen.has(type)) continue
        seen.add(type)
        chips.push({ type, value: normalizeSpeed(record?.value) })
    }
    return chips
}

export function sensesFromActor(senses: unknown): SenseDraft[] {
    if (!Array.isArray(senses)) return []
    const drafts: SenseDraft[] = []
    const counts = new Map<string, number>()
    for (const entry of senses) {
        const record = asRecord(entry) as SenseRecord | null
        const type = typeof record?.type === 'string' ? record.type.trim() : ''
        if (!type || !takeSenseType(type, counts)) continue
        drafts.push(senseDraftFromParts(type, record?.acuity, record?.range))
    }
    return drafts
}

function senseDraftFromParts(
    type: string,
    acuity: unknown,
    range: unknown,
): SenseDraft {
    const draft: SenseDraft = { type }
    if (
        !mandatoryAcuity(type) &&
        typeof acuity === 'string' &&
        isSenseAcuity(acuity)
    ) {
        draft.acuity = acuity
    }
    if (senseHasRange(type)) {
        const numeric = Number(range)
        if (Number.isFinite(numeric) && numeric > 0) {
            draft.range = Math.round(numeric)
        }
    }
    return draft
}

export function speedsFromControls(
    controls: Record<string, string> | null | undefined,
): SpeedChip[] | null {
    if (!controls) return null
    const chips: SpeedChip[] = []
    const seen = new Set<string>()
    for (const [key, type] of Object.entries(controls)) {
        if (!key.startsWith('speedType-') || !isMovementType(type)) continue
        if (seen.has(type)) continue
        seen.add(type)
        chips.push({
            type,
            value: normalizeSpeed(controls[`speedValue-${type}`]),
        })
    }
    return chips.length > 0 ? chips : null
}

export function sensesFromControls(
    controls: Record<string, string> | null | undefined,
): SenseDraft[] | null {
    if (!controls) return null
    if (controls[SENSES_INITIALIZED_MARKER] !== 'true') return null
    const ids = Object.keys(controls)
        .filter((key) => key.startsWith('senseType'))
        .map((key) => key.slice('senseType'.length))
        .sort((a, b) => Number(a) - Number(b))
    const drafts: SenseDraft[] = []
    const counts = new Map<string, number>()
    for (const id of ids) {
        const type = controls[`senseType${id}`]?.trim() ?? ''
        if (!type || !takeSenseType(type, counts)) continue
        drafts.push(
            senseDraftFromParts(
                type,
                controls[`senseAcuity${id}`],
                controls[`senseRange${id}`],
            ),
        )
    }
    return drafts
}

export function speedsFromForm(formData: object): SpeedChip[] {
    const data = formData as FormRecord
    const chips: SpeedChip[] = []
    const seen = new Set<string>()
    for (const [key, rawType] of Object.entries(data)) {
        if (!key.startsWith('speedType-') || typeof rawType !== 'string')
            continue
        if (!isMovementType(rawType) || seen.has(rawType)) continue
        seen.add(rawType)
        chips.push({
            type: rawType,
            value: normalizeSpeed(data[`speedValue-${rawType}`]),
        })
    }
    return chips
}

export function sensesFromForm(formData: object): SenseDraft[] {
    const data = formData as FormRecord
    const ids = Object.keys(data)
        .filter((key) => key.startsWith('senseType'))
        .map((key) => key.slice('senseType'.length))
        .sort((a, b) => Number(a) - Number(b))
    const drafts: SenseDraft[] = []
    const counts = new Map<string, number>()
    for (const id of ids) {
        const rawType = data[`senseType${id}`]
        const type = typeof rawType === 'string' ? rawType.trim() : ''
        if (!type || !takeSenseType(type, counts)) continue
        drafts.push(
            senseDraftFromParts(
                type,
                data[`senseAcuity${id}`],
                data[`senseRange${id}`],
            ),
        )
    }
    return drafts
}

export function actorSpeedsFromChips(chips: SpeedChip[]): ActorSpeed {
    const values = new Map<MovementType, number>()
    for (const chip of chips) {
        if (!isMovementType(chip.type) || values.has(chip.type)) continue
        values.set(chip.type, normalizeSpeed(chip.value))
    }
    if (values.size === 0) values.set('land', DEFAULT_LAND_SPEED)
    const otherSpeeds = SPEED_MENU_ORDER.flatMap((type) => {
        if (type === 'land') return []
        const value = values.get(type)
        if (value === undefined) return []
        return [{ type, value }]
    })
    return {
        value: values.get('land') ?? 0,
        otherSpeeds,
    }
}

export function senseToActor(draft: SenseDraft): Record<string, unknown> {
    const type = draft.type.trim()
    const sense: Record<string, unknown> = { type }
    const fixedAcuity = mandatoryAcuity(type)
    if (fixedAcuity) {
        sense.acuity = fixedAcuity
    } else {
        sense.acuity =
            draft.acuity && isSenseAcuity(draft.acuity)
                ? draft.acuity
                : 'imprecise'
    }
    if (senseHasRange(type)) sense.range = normalizeRange(draft.range)
    return sense
}

export function movementActorUpdate(
    formData: object,
): Record<string, unknown> | null {
    const data = formData as FormRecord
    const marker = data[MOVEMENT_SECTION_MARKER]
    if (marker !== true && marker !== 'true') return null
    const speeds = actorSpeedsFromChips(speedsFromForm(data))
    return {
        'system.attributes.speed.value': speeds.value,
        'system.attributes.speed.otherSpeeds': speeds.otherSpeeds,
        'system.perception.senses': sensesFromForm(data).map(senseToActor),
    }
}

export function readActorSpeed(actor: object): unknown {
    const source = propertyAt(actor, '_source.system.attributes.speed')
    if (source && typeof source === 'object') return source
    return propertyAt(actor, 'system.attributes.speed')
}

export function readActorSenses(actor: object): unknown {
    const perception = propertyAt(actor, '_source.system.perception')
    if (
        perception &&
        typeof perception === 'object' &&
        'senses' in perception
    ) {
        return (perception as { senses?: unknown }).senses
    }
    return propertyAt(actor, 'system.perception.senses')
}

function propertyAt(actor: object, path: string): unknown {
    return path.split('.').reduce<unknown>((current, part) => {
        if (current == null || typeof current !== 'object') return undefined
        return (current as FormRecord)[part]
    }, actor)
}

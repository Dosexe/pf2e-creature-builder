export const IWR_PRESENT = 'iwrPresent'
export const IWR_PRESERVED = 'iwrPreserved'

export const IWR_KINDS = ['immunity', 'resistance', 'weakness'] as const

export type IwrKind = (typeof IWR_KINDS)[number]

export type IwrListKey = 'immunities' | 'resistances' | 'weaknesses'

export interface IwrDraft {
    type: string
    exceptions: string[]
    doubleVs: string[]
    value?: number
}

export interface PreservedIwr {
    immunities: unknown[]
    resistances: unknown[]
    weaknesses: unknown[]
}

export interface ActorIwr {
    immunities: IwrDraft[]
    resistances: IwrDraft[]
    weaknesses: IwrDraft[]
    preserved: PreservedIwr
}

export interface IwrChoice {
    slug: string
    label: string
}

export interface IwrRange {
    min: number
    max: number
}

type FormRecord = Record<string, unknown>

/**
 * GM Core Table 2–8. Minimum is the low end for a broad resistance.
 * Maximum is the high end for a single weakness.
 */
const RESISTANCE_WEAKNESS_RANGES: Record<string, IwrRange> = {
    '-1': { min: 1, max: 1 },
    '0': { min: 1, max: 3 },
    '1': { min: 2, max: 3 },
    '2': { min: 2, max: 5 },
    '3': { min: 3, max: 6 },
    '4': { min: 4, max: 7 },
    '5': { min: 4, max: 8 },
    '6': { min: 5, max: 9 },
    '7': { min: 5, max: 10 },
    '8': { min: 6, max: 11 },
    '9': { min: 6, max: 12 },
    '10': { min: 7, max: 13 },
    '11': { min: 7, max: 14 },
    '12': { min: 8, max: 15 },
    '13': { min: 8, max: 16 },
    '14': { min: 9, max: 17 },
    '15': { min: 9, max: 18 },
    '16': { min: 9, max: 19 },
    '17': { min: 10, max: 19 },
    '18': { min: 10, max: 20 },
    '19': { min: 11, max: 21 },
    '20': { min: 11, max: 22 },
    '21': { min: 12, max: 23 },
    '22': { min: 12, max: 24 },
    '23': { min: 13, max: 25 },
    '24': { min: 13, max: 26 },
}

const MATERIALS = [
    'abysium',
    'adamantine',
    'cold-iron',
    'dawnsilver',
    'djezet',
    'duskwood',
    'inubrix',
    'noqual',
    'orichalcum',
    'siccatite',
    'silver',
] as const

const SANCTIFIED = ['holy', 'unholy'] as const

const TRADITIONS = ['arcane', 'divine', 'occult', 'primal'] as const

/** PF2E immunityTypes, without the rule-element-only `custom` slug. */
const FALLBACK_IMMUNITIES = [
    ...MATERIALS,
    ...SANCTIFIED,
    ...TRADITIONS,
    'acid',
    'air',
    'alchemical',
    'area-damage',
    'auditory',
    'bleed',
    'blinded',
    'bludgeoning',
    'clumsy',
    'cold',
    'confused',
    'controlled',
    'critical-hits',
    'curse',
    'dazzled',
    'deafened',
    'death-effects',
    'detection',
    'disease',
    'doomed',
    'drained',
    'earth',
    'electricity',
    'emotion',
    'energy',
    'enfeebled',
    'fascinated',
    'fatigued',
    'fear-effects',
    'fire',
    'fleeing',
    'force',
    'fortune-effects',
    'frightened',
    'grabbed',
    'healing',
    'illusion',
    'immobilized',
    'inhaled',
    'light',
    'magic',
    'mental',
    'metal',
    'misfortune-effects',
    'non-magical',
    'nonlethal-attacks',
    'object-immunities',
    'off-guard',
    'olfactory',
    'paralyzed',
    'persistent-damage',
    'petrified',
    'physical',
    'piercing',
    'plant',
    'poison',
    'polymorph',
    'possession',
    'precision',
    'prone',
    'radiation',
    'restrained',
    'salt-water',
    'scrying',
    'sickened',
    'slashing',
    'sleep',
    'slowed',
    'sonic',
    'spell-deflection',
    'spirit',
    'stunned',
    'stupefied',
    'swarm-attacks',
    'swarm-mind',
    'trip',
    'unarmed-attacks',
    'unconscious',
    'visual',
    'vitality',
    'void',
    'water',
    'wood',
    'wounded',
] as const

/** PF2E weaknessTypes, without `custom`. */
const FALLBACK_WEAKNESSES = [
    ...MATERIALS,
    ...SANCTIFIED,
    ...TRADITIONS,
    'acid',
    'air',
    'alchemical',
    'all-damage',
    'area-damage',
    'arrow-vulnerability',
    'axe-vulnerability',
    'bleed',
    'bludgeoning',
    'cold',
    'critical-hits',
    'earth',
    'electricity',
    'emotion',
    'energy',
    'fire',
    'force',
    'ghost-touch',
    'glass',
    'light',
    'magical',
    'mental',
    'metal',
    'mythic',
    'non-magical',
    'nonlethal-attacks',
    'persistent-damage',
    'physical',
    'piercing',
    'plant',
    'poison',
    'precision',
    'radiation',
    'salt',
    'salt-water',
    'slashing',
    'sonic',
    'spells',
    'spirit',
    'splash-damage',
    'unarmed-attacks',
    'vampire-weaknesses',
    'vitality',
    'void',
    'vorpal',
    'vorpal-fear',
    'vulnerable-to-sunlight',
    'water',
    'weapons',
    'weapons-shedding-bright-light',
    'wood',
] as const

/** PF2E resistanceTypes, without `custom`. */
const FALLBACK_RESISTANCES = [
    ...MATERIALS,
    ...SANCTIFIED,
    ...TRADITIONS,
    'acid',
    'air',
    'alchemical',
    'all-damage',
    'area-damage',
    'axes',
    'bleed',
    'bludgeoning',
    'cold',
    'critical-hits',
    'damage-from-spells',
    'earth',
    'electricity',
    'energy',
    'fire',
    'force',
    'ghost-touch',
    'light',
    'magical',
    'mental',
    'metal',
    'mythic',
    'non-magical',
    'nonlethal',
    'nonlethal-attacks',
    'persistent-damage',
    'physical',
    'piercing',
    'plant',
    'poison',
    'precision',
    'protean-anatomy',
    'radiation',
    'salt',
    'salt-water',
    'slashing',
    'sonic',
    'spells',
    'spirit',
    'unarmed-attacks',
    'vitality',
    'void',
    'vorpal',
    'vorpal-adamantine',
    'water',
    'weapons',
    'weapons-shedding-bright-light',
    'wood',
] as const

const FALLBACK_SLUGS: Record<IwrKind, readonly string[]> = {
    immunity: FALLBACK_IMMUNITIES,
    resistance: FALLBACK_RESISTANCES,
    weakness: FALLBACK_WEAKNESSES,
}

const CONFIG_KEYS: Record<IwrKind, string> = {
    immunity: 'immunityTypes',
    resistance: 'resistanceTypes',
    weakness: 'weaknessTypes',
}

export function emptyPreservedIwr(): PreservedIwr {
    return { immunities: [], resistances: [], weaknesses: [] }
}

export function emptyActorIwr(): ActorIwr {
    return {
        immunities: [],
        resistances: [],
        weaknesses: [],
        preserved: emptyPreservedIwr(),
    }
}

export function iwrListKey(kind: IwrKind): IwrListKey {
    if (kind === 'immunity') return 'immunities'
    if (kind === 'resistance') return 'resistances'
    return 'weaknesses'
}

export function resistanceWeaknessRange(level: string): IwrRange {
    return RESISTANCE_WEAKNESS_RANGES[level] ?? { min: 1, max: 1 }
}

export function defaultIwrValue(
    kind: 'resistance' | 'weakness',
    level: string,
): number {
    const range = resistanceWeaknessRange(level)
    return kind === 'weakness' ? range.max : range.min
}

export function recommendedIwrText(level: string): string {
    const range = resistanceWeaknessRange(level)
    const template =
        gameLocalize('pf2e-creature-builder.form.iwr.recommended') ??
        'Recommended {min}–{max}'
    return template
        .replace(/\{min\}/g, String(range.min))
        .replace(/\{max\}/g, String(range.max))
}

export function iwrChoices(kind: IwrKind): IwrChoice[] {
    return catalog(kind)
        .map((entry) => ({
            slug: entry.slug,
            label: labelFor(entry.slug, entry.labelKey),
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
}

export function iwrTypeLabel(kind: IwrKind, slug: string): string {
    const match = catalog(kind).find((entry) => entry.slug === slug)
    return labelFor(slug, match?.labelKey)
}

export function availableIwrTypes(
    kind: IwrKind,
    used: readonly string[],
): IwrChoice[] {
    const taken = new Set(used)
    return iwrChoices(kind).filter((choice) => !taken.has(choice.slug))
}

export function availableIwrModifiers(
    kind: IwrKind,
    ownType: string,
    blocked: readonly string[],
): IwrChoice[] {
    const taken = new Set([ownType, ...blocked])
    return iwrChoices(kind).filter((choice) => !taken.has(choice.slug))
}

export function iwrExceptionSummary(
    kind: IwrKind,
    exceptions: readonly string[],
): string {
    if (exceptions.length === 0) return ''
    const prefix = text('pf2e-creature-builder.form.iwr.except', 'except')
    const labels = exceptions.map((slug) => iwrTypeLabel(kind, slug))
    return `${prefix}: ${labels.join(', ')}`
}

export function iwrDoubleVsSummary(
    kind: IwrKind,
    doubleVs: readonly string[],
): string {
    if (doubleVs.length === 0) return ''
    const prefix = text(
        'pf2e-creature-builder.form.iwr.summary-double-vs',
        'double vs',
    )
    const labels = doubleVs.map((slug) => iwrTypeLabel(kind, slug))
    return `${prefix}: ${labels.join(', ')}`
}

export function iwrCollapsedSummary(
    kind: IwrKind,
    exceptions: readonly string[],
    doubleVs: readonly string[],
): string {
    const parts = [iwrExceptionSummary(kind, exceptions)]
    if (kind === 'resistance') parts.push(iwrDoubleVsSummary(kind, doubleVs))
    const textParts = parts.filter((part) => part.length > 0)
    if (textParts.length === 0) return ''
    return `(${textParts.join('; ')})`
}

export function actorHasIwr(actor: object): boolean {
    const iwr = readActorIwr(actor)
    return (
        iwr.immunities.length +
            iwr.resistances.length +
            iwr.weaknesses.length +
            iwr.preserved.immunities.length +
            iwr.preserved.resistances.length +
            iwr.preserved.weaknesses.length >
        0
    )
}

export function readActorIwr(actor: object): ActorIwr {
    const result = emptyActorIwr()
    for (const kind of IWR_KINDS) {
        const key = iwrListKey(kind)
        const seen = new Set<string>()
        for (const entry of readAttributeList(actor, key)) {
            const parsed = parseActorEntry(entry, kind)
            if (parsed.preserved) {
                result.preserved[key].push(parsed.preserved)
                continue
            }
            if (!parsed.draft || seen.has(parsed.draft.type)) continue
            seen.add(parsed.draft.type)
            result[key].push(parsed.draft)
        }
    }
    return result
}

export function iwrFromControls(
    controls: Record<string, string> | null | undefined,
): ActorIwr | null {
    if (controls?.[IWR_PRESENT] !== 'true') return null
    return iwrFromData(controls)
}

export function iwrActorUpdate(
    formData: object,
): Record<string, unknown> | null {
    const data = formData as FormRecord
    const marker = data[IWR_PRESENT]
    if (marker !== true && marker !== 'true') return null
    const iwr = iwrFromData(data)
    return {
        'system.attributes.immunities': [
            ...iwr.immunities.map(immunityToActor),
            ...iwr.preserved.immunities,
        ],
        'system.attributes.resistances': [
            ...iwr.resistances.map(resistanceToActor),
            ...iwr.preserved.resistances,
        ],
        'system.attributes.weaknesses': [
            ...iwr.weaknesses.map(weaknessToActor),
            ...iwr.preserved.weaknesses,
        ],
    }
}

export function cloneActorIwr(iwr: ActorIwr): ActorIwr {
    return {
        immunities: iwr.immunities.map(cloneDraft),
        resistances: iwr.resistances.map(cloneDraft),
        weaknesses: iwr.weaknesses.map(cloneDraft),
        preserved: {
            immunities: iwr.preserved.immunities.map(cloneEntry),
            resistances: iwr.preserved.resistances.map(cloneEntry),
            weaknesses: iwr.preserved.weaknesses.map(cloneEntry),
        },
    }
}

function catalog(kind: IwrKind): { slug: string; labelKey?: string }[] {
    const configured = configuredTypes(kind)
    if (configured) {
        const rows = Object.entries(configured).flatMap(([slug, label]) => {
            if (!slug || slug === 'custom') return []
            return [
                {
                    slug,
                    labelKey: typeof label === 'string' ? label : undefined,
                },
            ]
        })
        if (rows.length > 0) return rows
    }
    return FALLBACK_SLUGS[kind].map((slug) => ({ slug }))
}

function configuredTypes(kind: IwrKind): Record<string, unknown> | null {
    const config = (
        globalThis as {
            CONFIG?: { PF2E?: Record<string, unknown> }
        }
    ).CONFIG?.PF2E?.[CONFIG_KEYS[kind]]
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return null
    }
    return config as Record<string, unknown>
}

function labelFor(slug: string, labelKey?: string): string {
    if (labelKey) {
        const localized = gameLocalize(labelKey)
        if (localized) return localized
    }
    return titleFromSlug(slug)
}

function titleFromSlug(slug: string): string {
    return slug
        .split('-')
        .filter((part) => part.length > 0)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

function text(key: string, fallback: string): string {
    return gameLocalize(key) ?? fallback
}

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

function readAttributeList(actor: object, key: IwrListKey): unknown[] {
    const attributes = propertyAt(actor, '_source.system.attributes')
    if (attributes && typeof attributes === 'object') {
        const value = (attributes as FormRecord)[key]
        return Array.isArray(value) ? value : []
    }
    const derived = propertyAt(actor, `system.attributes.${key}`)
    return Array.isArray(derived) ? derived : []
}

function propertyAt(actor: object, path: string): unknown {
    return path.split('.').reduce<unknown>((current, part) => {
        if (current == null || typeof current !== 'object') return undefined
        return (current as FormRecord)[part]
    }, actor)
}

function parseActorEntry(
    entry: unknown,
    kind: IwrKind,
): { draft?: IwrDraft; preserved?: unknown } {
    const record = asRecord(entry)
    const type = typeof record?.type === 'string' ? record.type.trim() : ''
    if (!record || !type || type === 'custom') {
        return { preserved: cloneEntry(entry) }
    }
    if (!exceptionsAreStrings(record.exceptions)) {
        return { preserved: cloneEntry(entry) }
    }
    if (!exceptionsAreStrings(record.doubleVs)) {
        return { preserved: cloneEntry(entry) }
    }
    if (kind !== 'immunity' && !isFiniteNumber(record.value)) {
        return { preserved: cloneEntry(entry) }
    }
    if (
        kind !== 'resistance' &&
        Array.isArray(record.doubleVs) &&
        record.doubleVs.length > 0
    ) {
        return { preserved: cloneEntry(entry) }
    }
    const exceptions = cleanSlugs(record.exceptions, type)
    const doubleVs =
        kind === 'resistance'
            ? cleanSlugs(record.doubleVs, type).filter(
                  (slug) => !exceptions.includes(slug),
              )
            : []
    const draft: IwrDraft = { type, exceptions, doubleVs }
    if (kind !== 'immunity') draft.value = Math.round(Number(record.value))
    return { draft }
}

function exceptionsAreStrings(value: unknown): boolean {
    if (value === undefined) return true
    return (
        Array.isArray(value) && value.every((item) => typeof item === 'string')
    )
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value)
}

function cleanSlugs(value: unknown, ownType: string): string[] {
    if (!Array.isArray(value)) return []
    const result: string[] = []
    for (const item of value) {
        if (typeof item !== 'string') continue
        const slug = item.trim()
        if (!slug || slug === ownType || result.includes(slug)) continue
        result.push(slug)
    }
    return result
}

function iwrFromData(data: FormRecord): ActorIwr {
    const result = emptyActorIwr()
    for (const kind of IWR_KINDS) {
        const key = iwrListKey(kind)
        const seen = new Set<string>()
        for (const index of fieldIndexes(data, kind)) {
            const type = stringValue(data[`${kind}-${index}-type`]).trim()
            if (!type || type === 'custom' || seen.has(type)) continue
            seen.add(type)
            const exceptions = cleanSlugs(
                slugList(data[`${kind}-${index}-exceptions`]),
                type,
            )
            const doubleVs =
                kind === 'resistance'
                    ? cleanSlugs(
                          slugList(data[`${kind}-${index}-doubleVs`]),
                          type,
                      ).filter((slug) => !exceptions.includes(slug))
                    : []
            const draft: IwrDraft = { type, exceptions, doubleVs }
            if (kind !== 'immunity') {
                draft.value = readValue(data[`${kind}-${index}-value`])
            }
            result[key].push(draft)
        }
    }
    result.preserved = preservedFromValue(data[IWR_PRESERVED])
    return result
}

function fieldIndexes(data: FormRecord, kind: IwrKind): string[] {
    const suffix = '-type'
    const prefix = `${kind}-`
    return Object.keys(data)
        .filter((key) => key.startsWith(prefix) && key.endsWith(suffix))
        .map((key) => key.slice(prefix.length, -suffix.length))
        .sort((a, b) => Number(a) - Number(b))
}

function slugList(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === 'string')
    }
    if (typeof value !== 'string') return []
    return value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
}

function stringValue(value: unknown): string {
    return typeof value === 'string' ? value : ''
}

function readValue(value: unknown): number {
    const numeric = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(numeric)) return 0
    return Math.round(numeric)
}

function preservedFromValue(value: unknown): PreservedIwr {
    const empty = emptyPreservedIwr()
    if (typeof value !== 'string' || value.trim() === '') return empty
    try {
        const parsed = JSON.parse(value) as FormRecord
        if (!parsed || typeof parsed !== 'object') return empty
        return {
            immunities: arrayOrEmpty(parsed.immunities),
            resistances: arrayOrEmpty(parsed.resistances),
            weaknesses: arrayOrEmpty(parsed.weaknesses),
        }
    } catch {
        return empty
    }
}

function arrayOrEmpty(value: unknown): unknown[] {
    return Array.isArray(value) ? value.map(cloneEntry) : []
}

function immunityToActor(draft: IwrDraft): Record<string, unknown> {
    const entry: Record<string, unknown> = { type: draft.type }
    if (draft.exceptions.length > 0) entry.exceptions = [...draft.exceptions]
    return entry
}

function weaknessToActor(draft: IwrDraft): Record<string, unknown> {
    const entry: Record<string, unknown> = {
        type: draft.type,
        value: draft.value ?? 0,
    }
    if (draft.exceptions.length > 0) entry.exceptions = [...draft.exceptions]
    return entry
}

function resistanceToActor(draft: IwrDraft): Record<string, unknown> {
    const entry = weaknessToActor(draft)
    if (draft.doubleVs.length > 0) entry.doubleVs = [...draft.doubleVs]
    return entry
}

function cloneDraft(draft: IwrDraft): IwrDraft {
    return {
        type: draft.type,
        exceptions: [...draft.exceptions],
        doubleVs: [...draft.doubleVs],
        value: draft.value,
    }
}

function cloneEntry(entry: unknown): unknown {
    try {
        return JSON.parse(JSON.stringify(entry))
    } catch {
        return entry
    }
}

function asRecord(value: unknown): FormRecord | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return value as FormRecord
}

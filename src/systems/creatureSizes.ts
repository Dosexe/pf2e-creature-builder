export interface CreatureSizeChoice {
    value: string
    label: string
}

/**
 * Creature sizes published by the PF2E and SF2E builds of foundryvtt/pf2e.
 * Both systems store the same categories on `system.traits.size.value`.
 * A running world can add or replace categories through CONFIG.PF2E.actorSizes.
 */
export const CREATURE_SIZE_FIELD = 'pf2e-creature-builder.form.size'

export const FALLBACK_CREATURE_SIZES: readonly CreatureSizeChoice[] = [
    { value: 'tiny', label: `${CREATURE_SIZE_FIELD}.tiny` },
    { value: 'sm', label: `${CREATURE_SIZE_FIELD}.small` },
    { value: 'med', label: `${CREATURE_SIZE_FIELD}.medium` },
    { value: 'lg', label: `${CREATURE_SIZE_FIELD}.large` },
    { value: 'huge', label: `${CREATURE_SIZE_FIELD}.huge` },
    { value: 'grg', label: `${CREATURE_SIZE_FIELD}.gargantuan` },
]

export const DEFAULT_CREATURE_SIZE = 'med'

const SIZE_ALIASES: Record<string, string> = {
    tiny: 'tiny',
    sm: 'sm',
    small: 'sm',
    med: 'med',
    medium: 'med',
    lg: 'lg',
    large: 'lg',
    huge: 'huge',
    grg: 'grg',
    gargantuan: 'grg',
}

function configuredCreatureSizes(): CreatureSizeChoice[] | null {
    const sizes = (
        globalThis as {
            CONFIG?: { PF2E?: { actorSizes?: Record<string, unknown> } }
        }
    ).CONFIG?.PF2E?.actorSizes
    if (!sizes || typeof sizes !== 'object') return null

    const choices: CreatureSizeChoice[] = []
    for (const [value, label] of Object.entries(sizes)) {
        if (value.trim() === '') continue
        if (typeof label !== 'string' || label.trim() === '') continue
        choices.push({ value, label })
    }
    return choices.length > 0 ? choices : null
}

export function creatureSizeChoices(): CreatureSizeChoice[] {
    return (
        configuredCreatureSizes() ??
        FALLBACK_CREATURE_SIZES.map((size) => ({ ...size }))
    )
}

/**
 * Map a form value or actor size onto a category the active system accepts.
 * Short codes (`lg`) and rules slugs (`large`) both resolve when that category exists.
 */
export function canonicalCreatureSize(
    raw: unknown,
    choices: CreatureSizeChoice[] = creatureSizeChoices(),
): string | null {
    if (typeof raw !== 'string') return null
    const key = raw.trim().toLowerCase()
    if (key === '') return null

    const direct = choices.find((choice) => choice.value.toLowerCase() === key)
    if (direct) return direct.value

    const alias = SIZE_ALIASES[key]
    if (alias && choices.some((choice) => choice.value === alias)) return alias
    return null
}

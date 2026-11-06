import { type Options, Statistics } from './Keys'
import { detectHPLevel, detectStatLevel, detectStrikeDamage } from './Values'

export const STRIKE_DICE = ['d4', 'd6', 'd8', 'd10', 'd12'] as const

export type StrikeDie = (typeof STRIKE_DICE)[number]

const SIGNED_INTEGER = /^[+-]?\d+$/
const DAMAGE_FORMULA = /^(\d+)(d4|d6|d8|d10|d12)([+-]\d+)?$/

const ABSOLUTE_STATS = new Set<string>([
    Statistics.hp,
    Statistics.ac,
    Statistics.spellcasting,
])

export function parseSignedInteger(raw: string): number | undefined {
    const trimmed = raw.trim()
    if (!SIGNED_INTEGER.test(trimmed)) return undefined
    const value = Number(trimmed)
    if (!Number.isSafeInteger(value)) return undefined
    return value
}

export function formatModifier(value: number): string {
    return value < 0 ? `${value}` : `+${value}`
}

export function formatAbsolute(value: number): string {
    return value < 0 ? `${value}` : String(value)
}

export function displayEditedNumber(
    stat: string,
    raw: string,
): string | undefined {
    const value = parseSignedInteger(raw)
    if (value === undefined) return undefined
    return ABSOLUTE_STATS.has(stat)
        ? formatAbsolute(value)
        : formatModifier(value)
}

export function isStrikeDie(value: string): value is StrikeDie {
    return (STRIKE_DICE as readonly string[]).includes(value)
}

export function formatStrikeDamage(
    dice: number,
    die: string,
    bonus: number,
): string | undefined {
    if (!Number.isInteger(dice) || dice < 1) return undefined
    if (!isStrikeDie(die)) return undefined
    if (!Number.isInteger(bonus)) return undefined
    if (bonus === 0) return `${dice}${die}`
    if (bonus > 0) return `${dice}${die}+${bonus}`
    return `${dice}${die}${bonus}`
}

export function displayEditedDamage(
    diceRaw: string,
    die: string,
    bonusRaw: string,
): string | undefined {
    const dice = parseSignedInteger(diceRaw)
    if (dice === undefined || dice < 1) return undefined
    const bonus = bonusRaw.trim() === '' ? 0 : parseSignedInteger(bonusRaw)
    if (bonus === undefined) return undefined
    return formatStrikeDamage(dice, die, bonus)
}

export function parseStrikeDamage(
    formula: string,
): { dice: number; die: StrikeDie; bonus: number } | undefined {
    const match = formula.replace(/\s+/g, '').match(DAMAGE_FORMULA)
    if (!match || !isStrikeDie(match[2])) return undefined
    return {
        dice: Number(match[1]),
        die: match[2],
        bonus: match[3] ? Number(match[3]) : 0,
    }
}

export function closestTierForEdit(
    stat: string,
    level: string,
    display: string,
): Options | undefined {
    if (stat === Statistics.strikeDamage) {
        return detectStrikeDamage(level, display)
    }
    const value = parseSignedInteger(display)
    if (value === undefined) return undefined
    if (stat === Statistics.hp) return detectHPLevel(level, value)
    if (stat === Statistics.spellcasting) {
        return detectStatLevel(Statistics.spellcasting, level, value - 8)
    }
    return detectStatLevel(stat as Statistics, level, value)
}

export function manualOverrideKey(field: string): string {
    return `manualOverride.${field}`
}

export function manualOverrideText(
    formData: object,
    field: string,
): string | undefined {
    const value = (formData as Record<string, unknown>)[
        manualOverrideKey(field)
    ]
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed === '' ? undefined : trimmed
}

export function manualOverrideNumber(
    formData: object,
    field: string,
): number | undefined {
    const text = manualOverrideText(formData, field)
    if (text === undefined) return undefined
    return parseSignedInteger(text)
}

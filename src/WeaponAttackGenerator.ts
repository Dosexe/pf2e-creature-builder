import { KeyPrefix } from '@/Keys'
import { globalLog } from '@/utils'

/** Form field. The creature builder template uses this same name. */
export const GENERATE_ATTACKS_FROM_WEAPONS = `${KeyPrefix}.generateAttacksFromWeapons`

/** Level and ability modifiers PF2E uses when generating an NPC attack. */
export type NpcAttackContext = {
    level: number
    strength: number
    dexterity: number
}

export type WeaponAttackInput = {
    source: Record<string, unknown>
    document?: unknown
}

type AttackGenerator = {
    toNPCAttacks: () => unknown
}

export function isGenerateAttacksEnabled(formData: object): boolean {
    const value = (formData as Record<string, unknown>)[
        GENERATE_ATTACKS_FROM_WEAPONS
    ]
    return value === true || value === 'true' || value === 'on'
}

/**
 * Build NPC strikes for a dropped weapon.
 * Keeps PF2E WeaponPF2e#toNPCAttacks unchanged. That is the same result as the
 * Generate Attack button. The fallback uses that button's level and ability formula.
 */
export function attacksFromWeapon(
    weapon: WeaponAttackInput,
    context: NpcAttackContext,
): Record<string, unknown>[] {
    const fixed = fixedAttackBonus(weapon.source)
    const live = attackGenerator(weapon.document)
    if (live) {
        try {
            const generated = live.toNPCAttacks()
            if (Array.isArray(generated)) {
                const attacks: Record<string, unknown>[] = []
                for (const attack of generated) {
                    const data = plainAttack(attack)
                    if (!data) continue
                    attacks.push(withoutDocumentId(data))
                }
                if (attacks.length > 0) return attacks
            }
        } catch (error) {
            globalLog(
                true,
                `Failed to generate attack from "${weaponLabel(weapon.source)}"`,
                error,
            )
        }
    }

    return [
        buildFallbackWeaponAttack(
            weapon.source,
            context,
            documentId(weapon.document),
            fixed,
        ),
    ]
}

function attackGenerator(document: unknown): AttackGenerator | null {
    if (!document || typeof document !== 'object') return null
    if (typeof (document as AttackGenerator).toNPCAttacks !== 'function') {
        return null
    }
    return document as AttackGenerator
}

function plainAttack(attack: unknown): Record<string, unknown> | null {
    if (!attack || typeof attack !== 'object') return null
    const toObject = (attack as { toObject?: unknown }).toObject
    if (typeof toObject === 'function') {
        const data = toObject.call(attack)
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return null
        }
        return data as Record<string, unknown>
    }
    return { ...(attack as Record<string, unknown>) }
}

function withoutDocumentId(
    attack: Record<string, unknown>,
): Record<string, unknown> {
    const copy = { ...attack }
    delete copy._id
    return copy
}

function buildFallbackWeaponAttack(
    source: Record<string, unknown>,
    context: NpcAttackContext,
    weaponId: string | undefined,
    fixed: number | undefined,
): Record<string, unknown> {
    const { damageType } = readWeaponDamage(source)
    const name = weaponLabel(source)
    const system: Record<string, unknown> = {
        bonus: { value: npcStrikeBonus(context.level, fixed) },
        damageRolls: {
            strikeDamageID: {
                damage: npcStrikeDamage(source, context, fixed),
                damageType,
                category: null,
            },
        },
    }
    const slug = attackSlug(name)
    if (slug) system.slug = slug
    const traits = weaponAttackTraits(source)
    if (traits.length > 0) system.traits = { value: traits }

    const attack: Record<string, unknown> = {
        name,
        type: 'melee',
        system,
    }
    if (typeof source.img === 'string' && source.img) attack.img = source.img
    if (weaponId) {
        attack.flags = { pf2e: { linkedWeapon: weaponId } }
    }
    return attack
}

function weaponLabel(source: Record<string, unknown>): string {
    return typeof source.name === 'string' && source.name.trim()
        ? source.name.trim()
        : 'Strike'
}

function fixedAttackBonus(source: Record<string, unknown>): number | undefined {
    const value = asRecord(asRecord(source.flags).pf2e).fixedAttack
    return typeof value === 'number' ? value : undefined
}

function readWeaponDamage(source: Record<string, unknown>): {
    die?: string
    dice?: number
    damageType: string
} {
    const damage = asRecord(asRecord(source.system).damage)
    const die = typeof damage.die === 'string' ? damage.die : undefined
    const dice =
        typeof damage.dice === 'number' && damage.dice > 0
            ? damage.dice
            : undefined
    const damageType =
        typeof damage.damageType === 'string' && damage.damageType
            ? damage.damageType
            : 'bludgeoning'
    return { die, dice, damageType }
}

/** Same attack bonus as PF2E's Generate Attack button: round(1.5 * level + 7). */
function npcStrikeBonus(level: number, fixed: number | undefined): number {
    if (fixed !== undefined) return fixed
    return Math.round(1.5 * level + 7)
}

/**
 * Damage dice follow PF2E: the weapon's die, with a count nearest to
 * round((level + 2) / 4), plus the ability modifier and weapon specialization.
 */
function npcStrikeDamage(
    source: Record<string, unknown>,
    context: NpcAttackContext,
    fixed: number | undefined,
): string {
    const { die, dice } = readWeaponDamage(source)
    const normalized = normalizeDie(die)
    const count =
        fixed === undefined ? npcDamageDice(context.level) : (dice ?? 1)
    if (!normalized) return String(count)

    const modifier =
        fixed === undefined
            ? attackAbilityMod(source, context) +
              (context.level > 1 ? count : 0)
            : 0
    return `${count}${normalized}${signedModifier(modifier)}`
}

function npcDamageDice(level: number): number {
    const target = Math.round((level + 2) / 4)
    return [1, 2, 3, 4].reduce((closest, dice) =>
        Math.abs(dice - target) < Math.abs(closest - target) ? dice : closest,
    )
}

function signedModifier(modifier: number): string {
    if (modifier === 0) return ''
    return modifier > 0 ? `+${modifier}` : `-${Math.abs(modifier)}`
}

function attackAbilityMod(
    source: Record<string, unknown>,
    context: NpcAttackContext,
): number {
    return usesDexterity(source) ? context.dexterity : context.strength
}

function usesDexterity(source: Record<string, unknown>): boolean {
    const system = asRecord(source.system)
    if (typeof system.range !== 'number' || system.range <= 0) return false
    return !rawTraits(source).some(
        (trait) => trait === 'thrown' || trait.startsWith('thrown-'),
    )
}

function rawTraits(source: Record<string, unknown>): string[] {
    const raw = asRecord(asRecord(source.system).traits).value
    if (!Array.isArray(raw)) return []
    return raw.filter((trait): trait is string => typeof trait === 'string')
}

function normalizeDie(die: string | undefined): string | undefined {
    if (!die) return undefined
    const trimmed = die.trim()
    if (/^d\d+$/i.test(trimmed)) return trimmed.toLowerCase()
    if (/^\d+$/.test(trimmed)) return `d${trimmed}`
    return undefined
}

function weaponAttackTraits(source: Record<string, unknown>): string[] {
    const system = asRecord(source.system)
    const raw = asRecord(system.traits).value
    const traits = Array.isArray(raw)
        ? raw.filter(
              (trait): trait is string =>
                  typeof trait === 'string' && trait !== '',
          )
        : []
    const excluded = new Set(['artifact', 'cursed'])
    const kept = traits.filter((trait) => !excluded.has(trait))

    const range = system.range
    if (typeof range === 'number' && range > 0) {
        const rangeTrait = `range-increment-${range}`
        const alreadyRanged = kept.some(
            (trait) => trait === rangeTrait || trait.startsWith('range-'),
        )
        if (!alreadyRanged) kept.push(rangeTrait)
    }

    const reload = reloadTrait(system)
    if (reload && !kept.includes(reload)) kept.push(reload)

    return [...new Set(kept)].sort()
}

function reloadTrait(system: Record<string, unknown>): string | undefined {
    const reload = asRecord(system.reload).value
    if (typeof reload === 'number') return `reload-${reload}`
    if (typeof reload === 'string' && reload.trim()) {
        return `reload-${reload.trim()}`
    }
    return undefined
}

function attackSlug(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/['’]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function documentId(document: unknown): string | undefined {
    if (!document || typeof document !== 'object') return undefined
    const id = (document as { id?: unknown }).id
    return typeof id === 'string' && id ? id : undefined
}

function asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>
    }
    return {}
}

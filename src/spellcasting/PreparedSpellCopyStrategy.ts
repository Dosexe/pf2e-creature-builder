import type { BaseActor } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents.mjs'
import { BaseSpellCopyStrategy } from '@/spellcasting/BaseSpellCopyStrategy'
import type {
    DetectedSpell,
    SpellCopyContext,
    SpellCopyResult,
    SpellSlot,
} from '@/spellcasting/model/spellcasting'

/**
 * Strategy for prepared casters.
 * Prepared casters use the prepared[] array where each slot has an {id, expended} entry
 * pointing to a specific spell. Spells must be assigned to specific slot positions.
 * When the same spell appears in multiple slots, we create one item and assign it to all.
 */
export class PreparedSpellCopyStrategy extends BaseSpellCopyStrategy {
    private readonly parent: BaseActor

    constructor(parent: BaseActor) {
        super()
        this.parent = parent
    }

    buildInitialSlots(
        detectedSlots: Record<string, SpellSlot>,
        _level: string,
    ): Record<string, SpellSlot> {
        // For prepared casters, preserve slot structure but clear spell IDs
        const result: Record<string, SpellSlot> = {}

        for (const [slotKey, slot] of Object.entries(detectedSlots)) {
            result[slotKey] = {
                max: slot.max,
                value: slot.value,
                prepared: slot.prepared.map(() => ({
                    id: null,
                    expended: false,
                })),
            }
        }

        return result
    }

    async processSpells(context: SpellCopyContext): Promise<SpellCopyResult> {
        const createdSpells: Array<{
            newId: string
            slotKey: string
            slotIndex: number
        }> = []

        // Group by spell identity: same spell in multiple slots → create once, assign to all
        const groups = this.groupBySpellIdentity(context.detectedSpells)

        for (const { representative, positions } of groups) {
            const createdSpell = await this.createSpell(
                representative,
                context.newEntryId,
                this.parent,
            )

            if (createdSpell) {
                for (const { slotKey, slotIndex } of positions) {
                    createdSpells.push({
                        newId: createdSpell.id,
                        slotKey,
                        slotIndex,
                    })
                }
            }
        }

        const updatedSlots: Record<string, SpellSlot> = {}

        for (const [slotKey, slot] of Object.entries(context.detectedSlots)) {
            updatedSlots[slotKey] = {
                max: slot.max,
                value: slot.value,
                prepared: slot.prepared.map(() => ({
                    id: null,
                    expended: false,
                })),
            }
        }

        for (const spellInfo of createdSpells) {
            const slot = updatedSlots[spellInfo.slotKey]
            if (slot?.prepared[spellInfo.slotIndex]) {
                slot.prepared[spellInfo.slotIndex].id = spellInfo.newId
            }
        }

        return { createdSpells, updatedSlots }
    }

    requiresSlotUpdate(): boolean {
        return true
    }

    /**
     * Group detected spells by identity (compendium source, name, or originalId).
     * One representative per group; collect all (slotKey, slotIndex) for that spell.
     */
    private groupBySpellIdentity(
        spells: DetectedSpell[],
    ): Array<{ representative: DetectedSpell; positions: Array<{ slotKey: string; slotIndex: number }> }> {
        const byKey = new Map<
            string,
            { representative: DetectedSpell; positions: Array<{ slotKey: string; slotIndex: number }> }
        >()

        for (const spell of spells) {
            const key =
                spell.compendiumSource ||
                (spell.spellData.name as string) ||
                spell.originalId

            const existing = byKey.get(key)
            if (existing) {
                existing.positions.push({
                    slotKey: spell.slotKey,
                    slotIndex: spell.slotIndex,
                })
            } else {
                byKey.set(key, {
                    representative: spell,
                    positions: [
                        { slotKey: spell.slotKey, slotIndex: spell.slotIndex },
                    ],
                })
            }
        }

        return Array.from(byKey.values())
    }
}

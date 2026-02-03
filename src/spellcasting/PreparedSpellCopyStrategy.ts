import type { BaseActor } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents.mjs'
import type {
    SpellCopyContext,
    SpellCopyResult,
    SpellSlot,
} from '@/model/spellcasting'
import { BaseSpellCopyStrategy } from '@/spellcasting/BaseSpellCopyStrategy'

/**
 * Strategy for prepared casters.
 * Prepared casters use the prepared[] array where each slot has an {id, expended} entry
 * pointing to a specific spell. Spells must be assigned to specific slot positions.
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

        // Create each spell and track its position
        for (const detectedSpell of context.detectedSpells) {
            const createdSpell = await this.createSpell(
                detectedSpell,
                context.newEntryId,
                this.parent,
            )

            if (createdSpell) {
                createdSpells.push({
                    newId: createdSpell.id,
                    slotKey: detectedSpell.slotKey,
                    slotIndex: detectedSpell.slotIndex,
                })
            }
        }

        // Build updated slots with new spell IDs at correct positions
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

        // Populate with new spell IDs at correct positions
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
}

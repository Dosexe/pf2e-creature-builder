import type { BaseActor } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents.mjs'
import { BaseSpellCopyStrategy } from '@/spellcasting/BaseSpellCopyStrategy'
import type { SpellSlot } from '@/spellcasting/model/spellcasting'

/**
 * Strategy for prepared casters.
 * Prepared casters use the prepared[] array where each slot has an {id, expended} entry
 * pointing to a specific spell.
 */
export class PreparedSpellCopyStrategy extends BaseSpellCopyStrategy {
    constructor(_parent: BaseActor) {
        super()
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
}

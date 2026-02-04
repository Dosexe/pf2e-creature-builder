import type { BaseActor } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents.mjs'
import { generateSpellSlots } from '@/CreatureBuilderSpellcasting'
import { BaseSpellCopyStrategy } from '@/spellcasting/BaseSpellCopyStrategy'
import type { SpellSlot } from '@/spellcasting/model/spellcasting'

/**
 * Strategy for spontaneous casters.
 * Spontaneous casters use max/value for slot counts; spells are not assigned to slots.
 */
export class SpontaneousSpellCopyStrategy extends BaseSpellCopyStrategy {
    constructor(_parent: BaseActor) {
        super()
    }

    buildInitialSlots(
        _detectedSlots: Record<string, SpellSlot>,
        level: string,
    ): Record<string, SpellSlot> {
        return generateSpellSlots('spontaneous', level)
    }
}

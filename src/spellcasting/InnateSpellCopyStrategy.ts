import { generateSpellSlots } from '@/CreatureBuilderSpellcasting'
import { BaseSpellCopyStrategy } from '@/spellcasting/BaseSpellCopyStrategy'
import type { SpellSlot } from '@/spellcasting/model/spellcasting'

/**
 * Strategy for innate casters.
 * Innate casters use max/value for slots; spells are not assigned to slots.
 */
export class InnateSpellCopyStrategy extends BaseSpellCopyStrategy {
    constructor(_parent: Actor) {
        super()
    }

    buildInitialSlots(
        _detectedSlots: Record<string, SpellSlot>,
        level: string,
    ): Record<string, SpellSlot> {
        return generateSpellSlots('innate', level)
    }
}

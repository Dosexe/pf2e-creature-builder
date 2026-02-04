import type { BaseActor } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents.mjs'
import { generateSpellSlots } from '@/CreatureBuilderSpellcasting'
import { BaseSpellCopyStrategy } from '@/spellcasting/BaseSpellCopyStrategy'
import type { SpellSlot } from '@/spellcasting/model/spellcasting'

/**
 * Strategy for innate casters.
 * Innate casters work similarly to spontaneous - spells are NOT assigned
 * to specific slots. Spells are simply added to the spellcasting entry's repertoire.
 */
export class InnateSpellCopyStrategy extends BaseSpellCopyStrategy {
    // biome-ignore lint/complexity/noUselessConstructor: abstract class constructor is protected
    constructor(parent: BaseActor) {
        super(parent)
    }

    buildInitialSlots(
        _detectedSlots: Record<string, SpellSlot>,
        level: string,
    ): Record<string, SpellSlot> {
        // For innate casters, generate fresh slots based on level
        // The slots define max/value but prepared[] stays empty - spells are not slotted
        return generateSpellSlots('innate', level)
    }

    requiresSlotUpdate(): boolean {
        return false
    }
}

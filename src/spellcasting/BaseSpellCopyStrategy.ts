import type { SpellSlot } from '@/spellcasting/model/spellcasting'
import type { SpellCopyStrategy } from '@/spellcasting/SpellCopyStrategy'

/**
 * Base class for spell slot structure strategies.
 */
export abstract class BaseSpellCopyStrategy implements SpellCopyStrategy {
    abstract buildInitialSlots(
        detectedSlots: Record<string, SpellSlot>,
        level: string,
    ): Record<string, SpellSlot>
}

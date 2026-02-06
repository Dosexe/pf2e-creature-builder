import type { SpellSlot } from '@/spellcasting/model/spellcasting'

/**
 * Strategy for building spell slot structure by caster type.
 * Used when updating an existing spellcasting entry (e.g. expand slots for new level).
 */
export interface SpellCopyStrategy {
    /**
     * Build the slots structure for the spellcasting entry.
     */
    buildInitialSlots(
        detectedSlots: Record<string, SpellSlot>,
        level: string,
    ): Record<string, SpellSlot>
}

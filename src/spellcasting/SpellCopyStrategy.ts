import type {
    SpellCopyContext,
    SpellCopyResult,
    SpellSlot,
} from '@/spellcasting/model/spellcasting'

/**
 * Strategy interface for copying spells from original actor to new one.
 * Different caster types (prepared vs spontaneous) handle spell slots differently.
 */
export interface SpellCopyStrategy {
    /**
     * Build the initial slots structure for the spellcasting entry.
     * Called before the entry is created.
     */
    buildInitialSlots(
        detectedSlots: Record<string, SpellSlot>,
        level: string,
    ): Record<string, SpellSlot>

    /**
     * Process spells after entry creation.
     * Returns the created spells info and any slot updates needed.
     */
    processSpells(context: SpellCopyContext): Promise<SpellCopyResult>

    /**
     * Whether slot updates are needed after spell creation.
     */
    requiresSlotUpdate(): boolean
}

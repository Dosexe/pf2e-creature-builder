import type { BaseActor } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents.mjs'
import type { CasterType } from '@/model/spellcasting'
import { PreparedSpellCopyStrategy } from '@/spellcasting/PreparedSpellCopyStrategy'
import type { SpellCopyStrategy } from '@/spellcasting/SpellCopyStrategy'
import { SpontaneousSpellCopyStrategy } from '@/spellcasting/SpontaneousSpellCopyStrategy'

export { BaseSpellCopyStrategy } from '@/spellcasting/BaseSpellCopyStrategy'
// Re-export for convenience
export { PreparedSpellCopyStrategy } from '@/spellcasting/PreparedSpellCopyStrategy'
export type { SpellCopyStrategy } from '@/spellcasting/SpellCopyStrategy'
export { SpontaneousSpellCopyStrategy } from '@/spellcasting/SpontaneousSpellCopyStrategy'

/**
 * Factory to create the appropriate spell copy strategy based on caster type
 */
export function createSpellCopyStrategy(
    casterType: CasterType,
    parent: BaseActor,
): SpellCopyStrategy | null {
    switch (casterType) {
        case 'prepared':
            return new PreparedSpellCopyStrategy(parent)
        case 'spontaneous':
            return new SpontaneousSpellCopyStrategy(parent)
        case 'innate':
            // Innate casters don't use slots the same way - could be extended later
            return null
        default:
            return null
    }
}

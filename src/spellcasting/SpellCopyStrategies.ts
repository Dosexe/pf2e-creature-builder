import { InnateSpellCopyStrategy } from '@/spellcasting/InnateSpellCopyStrategy'
import type { CasterType } from '@/spellcasting/model/spellcasting'
import { PreparedSpellCopyStrategy } from '@/spellcasting/PreparedSpellCopyStrategy'
import type { SpellCopyStrategy } from '@/spellcasting/SpellCopyStrategy'
import { SpontaneousSpellCopyStrategy } from '@/spellcasting/SpontaneousSpellCopyStrategy'

/**
 * Factory to create the appropriate spell copy strategy based on caster type
 */
export function createSpellCopyStrategy(
    casterType: CasterType,
    parent: Actor,
): SpellCopyStrategy | null {
    switch (casterType) {
        case 'prepared':
            return new PreparedSpellCopyStrategy(parent)
        case 'spontaneous':
            return new SpontaneousSpellCopyStrategy(parent)
        case 'innate':
            return new InnateSpellCopyStrategy(parent)
        default:
            return null
    }
}

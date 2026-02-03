import type { BaseActor } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents.mjs'
import { generateSpellSlots } from '@/CreatureBuilderSpellcasting'
import type {
    DetectedSpell,
    SpellCopyContext,
    SpellCopyResult,
    SpellSlot,
} from '@/model/spellcasting'
import { BaseSpellCopyStrategy } from '@/spellcasting/BaseSpellCopyStrategy'

/**
 * Strategy for spontaneous casters.
 * Spontaneous casters use max/value for slot counts but spells are NOT assigned
 * to specific slots. Spells are simply added to the spellcasting entry's repertoire.
 */
export class SpontaneousSpellCopyStrategy extends BaseSpellCopyStrategy {
    private readonly parent: BaseActor

    constructor(parent: BaseActor) {
        super()
        this.parent = parent
    }

    buildInitialSlots(
        _detectedSlots: Record<string, SpellSlot>,
        level: string,
    ): Record<string, SpellSlot> {
        // For spontaneous casters, generate fresh slots based on level
        // The slots define max/value (how many spells of each level can be cast)
        // but prepared[] stays empty - spells are not slotted
        return generateSpellSlots('spontaneous', level)
    }

    async processSpells(context: SpellCopyContext): Promise<SpellCopyResult> {
        const createdSpells: Array<{
            newId: string
            slotKey: string
            slotIndex: number
        }> = []

        // For spontaneous casters, we deduplicate spells since the same spell
        // might appear in multiple slots for prepared casters
        const uniqueSpells = this.deduplicateSpells(context.detectedSpells)

        // Create each unique spell - just associate with the entry, no slot assignment
        for (const detectedSpell of uniqueSpells) {
            const createdSpell = await this.createSpell(
                detectedSpell,
                context.newEntryId,
                this.parent,
            )

            if (createdSpell) {
                createdSpells.push({
                    newId: createdSpell.id,
                    slotKey: detectedSpell.slotKey,
                    slotIndex: 0, // Not meaningful for spontaneous
                })
            }
        }

        // No slot updates needed - spontaneous casters don't track spells in slots
        return { createdSpells }
    }

    requiresSlotUpdate(): boolean {
        return false
    }

    /**
     * Deduplicate spells by their compendium source or spell name.
     * Prepared casters might have the same spell in multiple slots,
     * but spontaneous casters only need one copy in their repertoire.
     */
    private deduplicateSpells(spells: DetectedSpell[]): DetectedSpell[] {
        const seen = new Set<string>()
        const unique: DetectedSpell[] = []

        for (const spell of spells) {
            // Use compendium source as primary key, fall back to spell name
            const key =
                spell.compendiumSource ||
                (spell.spellData.name as string) ||
                spell.originalId

            if (!seen.has(key)) {
                seen.add(key)
                unique.push(spell)
            }
        }

        return unique
    }
}

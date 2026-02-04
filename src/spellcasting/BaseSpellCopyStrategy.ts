import type { BaseActor } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents.mjs'
import type { ItemData } from '@/model/item'
import type {
    DetectedSpell,
    SpellCopyContext,
    SpellCopyResult,
    SpellSlot,
} from '@/spellcasting/model/spellcasting'
import type { SpellCopyStrategy } from '@/spellcasting/SpellCopyStrategy'

/**
 * Base class with shared spell creation logic
 */
export abstract class BaseSpellCopyStrategy implements SpellCopyStrategy {
    abstract buildInitialSlots(
        detectedSlots: Record<string, SpellSlot>,
        level: string,
    ): Record<string, SpellSlot>

    abstract processSpells(context: SpellCopyContext): Promise<SpellCopyResult>

    abstract requiresSlotUpdate(): boolean

    /**
     * Create a spell from detected data or compendium source
     */
    protected async createSpell(
        detectedSpell: DetectedSpell,
        newEntryId: string,
        parent: BaseActor,
    ): Promise<{ id: string } | null> {
        let spellData: Record<string, unknown>

        // Try to get spell from compendium if source is available
        if (detectedSpell.compendiumSource) {
            try {
                const compendiumSpell = await fromUuid(
                    detectedSpell.compendiumSource,
                )
                if (compendiumSpell) {
                    // Use compendium spell data with updated location
                    const baseData =
                        typeof compendiumSpell.toObject === 'function'
                            ? compendiumSpell.toObject()
                            : compendiumSpell
                    spellData = {
                        ...baseData,
                        system: {
                            ...baseData.system,
                            location: { value: newEntryId },
                        },
                    }
                } else {
                    spellData = this.buildSpellDataFromDetected(
                        detectedSpell,
                        newEntryId,
                    )
                }
            } catch {
                spellData = this.buildSpellDataFromDetected(
                    detectedSpell,
                    newEntryId,
                )
            }
        } else {
            spellData = this.buildSpellDataFromDetected(
                detectedSpell,
                newEntryId,
            )
        }

        const createdSpell = await Item.create(spellData as ItemData, {
            parent,
        })

        return createdSpell ? { id: createdSpell.id } : null
    }

    /**
     * Build spell data from detected spell for creation
     */
    protected buildSpellDataFromDetected(
        detectedSpell: DetectedSpell,
        newEntryId: string,
    ): Record<string, unknown> {
        return {
            ...detectedSpell.spellData,
            system: {
                ...(detectedSpell.spellData.system as Record<string, unknown>),
                location: { value: newEntryId },
            },
        }
    }
}

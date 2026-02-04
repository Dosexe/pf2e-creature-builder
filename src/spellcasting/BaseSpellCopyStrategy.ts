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
    private readonly parent: BaseActor

    protected constructor(parent: BaseActor) {
        this.parent = parent
    }

    abstract buildInitialSlots(
        detectedSlots: Record<string, SpellSlot>,
        level: string,
    ): Record<string, SpellSlot>

    async processSpells(context: SpellCopyContext): Promise<SpellCopyResult> {
        const createdSpells: Array<{
            newId: string
            slotKey: string
            slotIndex: number
        }> = []

        // For innate casters, we deduplicate spells since the same spell
        // might appear in multiple slots for prepared casters
        const uniqueSpells = this.deduplicateSpells(context.detectedSpells)

        // Create each unique spell - just associate with the entry, no slot assignment
        for (const detectedSpell of uniqueSpells.values()) {
            const createdSpell = await this.createSpell(
                detectedSpell,
                context.newEntryId,
                this.parent,
            )

            if (createdSpell) {
                createdSpells.push({
                    newId: createdSpell.id,
                    slotKey: detectedSpell.slotKey,
                    slotIndex: 0, // Not meaningful for innate
                })
            }
        }

        return { createdSpells }
    }

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

    /**
     * Deduplicate spells by their compendium source or spell name.
     * Prepared casters might have the same spell in multiple slots,
     * but spontaneous casters only need one copy in their repertoire.
     */
    private deduplicateSpells(
        spells: DetectedSpell[],
    ): Map<string, DetectedSpell> {
        const spellMap: Map<string, DetectedSpell> = new Map<
            string,
            DetectedSpell
        >()

        for (const spell of spells) {
            const key =
                spell.compendiumSource ||
                (spell.spellData.name as string) ||
                spell.originalId

            if (!spellMap.has(key)) {
                spellMap.set(key, spell)
            }
        }

        return spellMap
    }
}

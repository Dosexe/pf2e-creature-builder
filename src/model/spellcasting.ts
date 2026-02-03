export type Tradition = 'arcane' | 'divine' | 'occult' | 'primal'

export type CasterType = 'innate' | 'prepared' | 'spontaneous'

export type KeyAttribute = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export interface SpellSlot {
    max: number
    value: number
    prepared: { id: string | null; expended: boolean }[]
}

export interface SpellcastingConfig {
    tradition: Tradition
    casterType: CasterType
    keyAttribute: KeyAttribute
    spellcastingBonus: number
    level: string
    slots?: Record<string, SpellSlot>
}

export interface DetectedSpell {
    originalId: string
    slotKey: string // "slot0", "slot1", etc.
    slotIndex: number // index within the prepared array
    spellData: Record<string, unknown> // spell item data (excluding _id)
    compendiumSource?: string // UUID for creating from compendium
}

/**
 * Result of spell creation for a caster
 */
export interface SpellCopyResult {
    createdSpells: Array<{ newId: string; slotKey: string; slotIndex: number }>
    updatedSlots?: Record<string, SpellSlot>
}

/**
 * Context for spell copy operations
 */
export interface SpellCopyContext {
    detectedSpells: DetectedSpell[]
    detectedSlots: Record<string, SpellSlot>
    newEntryId: string
    level: string
}

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

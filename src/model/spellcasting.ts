export type Tradition = 'arcane' | 'divine' | 'occult' | 'primal'

export type CasterType = 'innate' | 'prepared' | 'spontaneous'

export type KeyAttribute = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export interface SpellcastingConfig {
    tradition: Tradition
    casterType: CasterType
    keyAttribute: KeyAttribute
    spellcastingBonus: number
    level: string
}

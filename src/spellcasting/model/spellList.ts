import type { MagicalTradition } from '@/Keys'

export interface SpellListEntry {
    slug: string
    label?: string
}

export interface SpellListLevel {
    level: number
    spells: SpellListEntry[]
}

export interface SpellList {
    name: string
    tradition: MagicalTradition
    levels: SpellListLevel[]
}

export type SpellListCollection = Record<string, SpellList>

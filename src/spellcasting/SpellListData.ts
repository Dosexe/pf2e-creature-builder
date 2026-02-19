import { MagicalTradition } from '@/Keys'
import type {
    SpellList,
    SpellListCollection,
} from '@/spellcasting/model/spellList'

const pyromancer: SpellList = {
    name: 'Pyromancer',
    tradition: MagicalTradition.primal,
    levels: [
        {
            level: 0,
            spells: [
                { slug: 'light' },
                { slug: 'detect-magic' },
                { slug: 'ignition' },
                { slug: 'sigil' },
                { slug: 'stabilize' },
            ],
        },
        {
            level: 1,
            spells: [
                { slug: 'breathe-fire' },
                { slug: 'cleanse-cuisine' },
                { slug: 'grease' },
                { slug: 'mending' },
            ],
        },
        {
            level: 2,
            spells: [
                { slug: 'blazing-bolt' },
                { slug: 'breathe-fire' },
                { slug: 'environmental-endurance' },
                { slug: 'floating-flame' },
            ],
        },
        {
            level: 3,
            spells: [
                { slug: 'blazing-bolt' },
                { slug: 'environmental-endurance' },
                { slug: 'fireball' },
                { slug: 'floating-flame' },
            ],
        },
        {
            level: 4,
            spells: [
                { slug: 'blazing-bolt' },
                { slug: 'fireball' },
                { slug: 'fire-shield' },
                { slug: 'wall-of-fire' },
            ],
        },
        {
            level: 5,
            spells: [
                { slug: 'blazing-bolt' },
                { slug: 'elemental-form', label: 'Elemental Form (Fire Only)' },
                { slug: 'fireball' },
                { slug: 'wall-of-fire' },
            ],
        },
        {
            level: 6,
            spells: [
                { slug: 'blazing-bolt' },
                { slug: 'elemental-form', label: 'Elemental Form (Fire Only)' },
                { slug: 'fireball' },
                { slug: 'fire-shield' },
            ],
        },
        {
            level: 7,
            spells: [
                { slug: 'blazing-bolt' },
                { slug: 'fiery-body' },
                { slug: 'fireball' },
                { slug: 'volcanic-eruption' },
            ],
        },
        {
            level: 8,
            spells: [
                { slug: 'blazing-bolt' },
                { slug: 'fireball' },
                { slug: 'fire-shield' },
                { slug: 'volcanic-eruption' },
            ],
        },
        {
            level: 9,
            spells: [
                {
                    slug: 'falling-stars',
                    label: 'Falling Stars (Asteroids Only)',
                },
                { slug: 'fiery-body' },
                { slug: 'fireball' },
                { slug: 'volcanic-eruption' },
            ],
        },
        {
            level: 10,
            spells: [
                { slug: 'cataclysm' },
                {
                    slug: 'falling-stars',
                    label: 'Falling Stars (Asteroids Only)',
                },
            ],
        },
    ],
}

export const builtInSpellLists: SpellListCollection = {
    pyromancer: pyromancer,
}

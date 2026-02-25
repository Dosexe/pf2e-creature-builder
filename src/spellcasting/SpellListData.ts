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

const stormcaller: SpellList = {
    name: 'Stormcaller',
    tradition: MagicalTradition.primal,
    levels: [
        {
            level: 0,
            spells: [
                { slug: 'frostbite' },
                { slug: 'electric-arc' },
                { slug: 'gale-blast' },
                { slug: 'know-the-way' },
                { slug: 'spout' },
            ],
        },
        {
            level: 1,
            spells: [
                { slug: 'chilling-spray' },
                { slug: 'create-water' },
                { slug: 'gust-of-wind' },
                { slug: 'hydraulic-push' },
            ],
        },
        {
            level: 2,
            spells: [
                { slug: 'hydraulic-push' },
                { slug: 'mist' },
                { slug: 'thunderstrike' },
                { slug: 'water-breathing' },
            ],
        },
        {
            level: 3,
            spells: [
                { slug: 'aqueous-orb' },
                { slug: 'chilling-spray' },
                { slug: 'crashing-wave' },
                { slug: 'environmental-endurance' },
            ],
        },
        {
            level: 4,
            spells: [
                { slug: 'crashing-wave' },
                { slug: 'ice-storm' },
                { slug: 'lightning-bolt' },
                { slug: 'water-walk' },
            ],
        },
        {
            level: 5,
            spells: [
                { slug: 'aerial-form' },
                { slug: 'control-water' },
                { slug: 'howling-blizzard' },
                { slug: 'hydraulic-torrent' },
                { slug: 'wall-of-ice' },
            ],
        },
        {
            level: 6,
            spells: [
                { slug: 'chain-lightning' },
                { slug: 'crashing-wave' },
                { slug: 'hydraulic-push' },
                { slug: 'lightning-bolt' },
            ],
        },
        {
            level: 7,
            spells: [
                { slug: 'howling-blizzard' },
                { slug: 'hydraulic-push' },
                { slug: 'lightning-storm' },
                { slug: 'wall-of-ice' },
            ],
        },
        {
            level: 8,
            spells: [
                { slug: 'howling-blizzard' },
                { slug: 'hydraulic-torrent' },
                { slug: 'punishing-winds' },
                { slug: 'thunderstrike' },
            ],
        },
        {
            level: 9,
            spells: [
                { slug: 'arctic-rift' },
                { slug: 'chain-lightning' },
                {
                    slug: 'falling-stars',
                    label: 'Falling Stars (Airbursts or Comets Only)',
                },
                { slug: 'howling-blizzard' },
            ],
        },
        {
            level: 10,
            spells: [{ slug: 'cataclysm' }, { slug: 'wrathful-storm' }],
        },
    ],
}

const necromancer: SpellList = {
    name: 'Necromancer',
    tradition: MagicalTradition.occult,
    levels: [
        {
            level: 0,
            spells: [
                { slug: 'daze' },
                { slug: 'detect-magic' },
                { slug: 'light' },
                { slug: 'sigil' },
                { slug: 'void-warp' },
            ],
        },
        {
            level: 1,
            spells: [
                { slug: 'enfeeble' },
                { slug: 'fear' },
                { slug: 'runic-body' },
                { slug: 'summon-undead' },
            ],
        },
        {
            level: 2,
            spells: [
                { slug: 'blood-vendetta' },
                { slug: 'darkvision' },
                { slug: 'final-sacrifice' },
                { slug: 'summon-undead' },
            ],
        },
        {
            level: 3,
            spells: [
                { slug: 'bind-undead' },
                { slug: 'final-sacrifice' },
                { slug: 'summon-undead' },
                { slug: 'vampiric-feast' },
            ],
        },
        {
            level: 4,
            spells: [
                { slug: 'blood-vendetta' },
                { slug: 'summon-undead' },
                { slug: 'vampiric-feast' },
                { slug: 'vampiric-maiden' },
            ],
        },
        {
            level: 5,
            spells: [
                { slug: 'final-sacrifice' },
                { slug: 'summon-undead' },
                { slug: 'vampiric-feast' },
                { slug: 'vampiric-maiden' },
            ],
        },
        {
            level: 6,
            spells: [
                { slug: 'final-sacrifice' },
                { slug: 'summon-undead' },
                { slug: 'vampiric-exsanguination' },
                { slug: 'vampiric-maiden' },
            ],
        },
        {
            level: 7,
            spells: [
                { slug: 'eclipse-burst' },
                { slug: 'final-sacrifice' },
                { slug: 'summon-undead' },
                { slug: 'vampiric-exsanguination' },
            ],
        },
        {
            level: 8,
            spells: [
                { slug: 'eclipse-burst' },
                { slug: 'final-sacrifice' },
                { slug: 'summon-undead' },
                { slug: 'vampiric-exsanguination' },
            ],
        },
        {
            level: 9,
            spells: [
                { slug: 'massacre' },
                { slug: 'summon-undead' },
                { slug: 'vampiric-exsanguination' },
                { slug: 'vampiric-feast' },
            ],
        },
        {
            level: 10,
            spells: [{ slug: 'massacre' }, { slug: 'summon-undead' }],
        },
    ],
}

const earthkeeper: SpellList = {
    name: 'Earthkeeper',
    tradition: MagicalTradition.primal,
    levels: [
        {
            level: 0,
            spells: [
                { slug: 'guidance' },
                { slug: 'know-the-way' },
                { slug: 'read-aura' },
                { slug: 'scatter-scree' },
                { slug: 'tangle-vine' },
            ],
        },
        {
            level: 1,
            spells: [
                { slug: 'leaden-steps' },
                { slug: 'mud-pit' },
                { slug: 'noxious-vapors' },
                { slug: 'pummeling-rubble' },
            ],
        },
        {
            level: 2,
            spells: [
                { slug: 'dismantle' },
                { slug: 'entangling-flora' },
                { slug: 'oaken-resilience' },
                { slug: 'shape-wood' },
            ],
        },
        {
            level: 3,
            spells: [
                { slug: 'earthbind' },
                { slug: 'one-with-stone' },
                { slug: 'pummeling-rubble' },
                { slug: 'summon-plant-or-fungus' },
            ],
        },
        {
            level: 4,
            spells: [
                { slug: 'mountain-resilience' },
                { slug: 'pummeling-rubble' },
                { slug: 'shape-stone' },
                { slug: 'wall-of-thorns' },
            ],
        },
        {
            level: 5,
            spells: [
                { slug: 'impaling-spike' },
                { slug: 'plant-form' },
                { slug: 'summon-plant-or-fungus' },
                { slug: 'wall-of-stone' },
            ],
        },
        {
            level: 6,
            spells: [
                { slug: 'mountain-resilience' },
                { slug: 'petrify' },
                { slug: 'speak-with-stones' },
                { slug: 'tangling-creepers' },
            ],
        },
        {
            level: 7,
            spells: [
                { slug: 'impaling-spike' },
                { slug: 'lifewood-cage' },
                { slug: 'tree-of-seasons' },
                { slug: 'wall-of-thorns' },
            ],
        },
        {
            level: 8,
            spells: [
                { slug: 'earthquake' },
                { slug: 'mountain-resilience' },
                { slug: 'natures-pathway' },
                { slug: 'protector-tree' },
            ],
        },
        {
            level: 9,
            spells: [
                { slug: 'impaling-spike' },
                {
                    slug: 'summon-elemental',
                    label: 'Summon Elemental (Earth Only)',
                },
                { slug: 'tree-of-seasons' },
                { slug: 'wall-of-stone' },
            ],
        },
        {
            level: 10,
            spells: [{ slug: 'nature-incarnate' }, { slug: 'tree-of-seasons' }],
        },
    ],
}

const animalist: SpellList = {
    name: 'Animalist',
    tradition: MagicalTradition.primal,
    levels: [
        {
            level: 0,
            spells: [
                { slug: 'gouging-claw' },
                { slug: 'guidance' },
                { slug: 'know-the-way' },
                { slug: 'puff-of-poison' },
                { slug: 'stabilize' },
            ],
        },
        {
            level: 1,
            spells: [
                { slug: 'pest-form' },
                { slug: 'pet-cache' },
                { slug: 'spider-sting' },
                { slug: 'summon-animal' },
            ],
        },
        {
            level: 2,
            spells: [
                { slug: 'animal-form' },
                { slug: 'animal-messenger' },
                { slug: 'gecko-grip' },
                { slug: 'speak-with-animals' },
            ],
        },
        {
            level: 3,
            spells: [
                { slug: 'animal-form' },
                { slug: 'animal-vision' },
                { slug: 'familiars-face' },
                { slug: 'mad-monkeys' },
            ],
        },
        {
            level: 4,
            spells: [
                {
                    slug: 'animal-form',
                    label: 'Animal Form or Dinosaur Form',
                },
                { slug: 'bestial-curse' },
                { slug: 'summon-animal' },
                { slug: 'unfettered-movement' },
            ],
        },
        {
            level: 5,
            spells: [
                {
                    slug: 'animal-form',
                    label: 'Animal Form or Dinosaur Form',
                },
                { slug: 'chameleon-coat' },
                { slug: 'moon-frenzy' },
                { slug: 'summon-animal' },
            ],
        },
        {
            level: 6,
            spells: [
                { slug: 'chameleon-coat' },
                { slug: 'cursed-metamorphosis' },
                { slug: 'moon-frenzy' },
                { slug: 'summon-animal' },
            ],
        },
        {
            level: 7,
            spells: [
                { slug: 'cursed-metamorphosis' },
                { slug: 'dinosaur-form' },
                { slug: 'summon-animal' },
                { slug: 'unfettered-pack' },
            ],
        },
        {
            level: 8,
            spells: [
                { slug: 'chameleon-coat' },
                { slug: 'cursed-metamorphosis' },
                { slug: 'migration' },
                { slug: 'summon-animal' },
            ],
        },
        {
            level: 9,
            spells: [
                { slug: 'metamorphosis' },
                { slug: 'natures-enmity' },
                { slug: 'summon-animal' },
                { slug: 'unfettered-pack' },
            ],
        },
        {
            level: 10,
            spells: [{ slug: 'moon-frenzy' }, { slug: 'primal-herd' }],
        },
    ],
}

const conjurer: SpellList = {
    name: 'Conjurer',
    tradition: MagicalTradition.arcane,
    levels: [
        {
            level: 0,
            spells: [
                { slug: 'detect-magic' },
                { slug: 'light' },
                { slug: 'prestidigitation' },
                { slug: 'telekinetic-hand' },
                { slug: 'telekinetic-projectile' },
            ],
        },
        {
            level: 1,
            spells: [
                { slug: 'carryall' },
                { slug: 'grease' },
                { slug: 'summon-animal' },
                { slug: 'summon-construct' },
            ],
        },
        {
            level: 2,
            spells: [
                { slug: 'create-food' },
                { slug: 'marvelous-mount' },
                { slug: 'mist' },
                { slug: 'summon-elemental' },
            ],
        },
        {
            level: 3,
            spells: [
                { slug: 'aqueous-orb' },
                { slug: 'cozy-cabin' },
                { slug: 'summon-construct' },
                { slug: 'summon-elemental' },
            ],
        },
        {
            level: 4,
            spells: [
                { slug: 'creation' },
                { slug: 'flicker' },
                { slug: 'summon-construct' },
                { slug: 'translocate' },
            ],
        },
        {
            level: 5,
            spells: [
                { slug: 'creation' },
                { slug: 'impaling-spike' },
                { slug: 'summon-dragon' },
                { slug: 'translocate' },
            ],
        },
        {
            level: 6,
            spells: [
                { slug: 'collective-transposition' },
                { slug: 'summon-dragon' },
                { slug: 'teleport' },
                { slug: 'wall-of-force' },
            ],
        },
        {
            level: 7,
            spells: [
                { slug: 'duplicate-foe' },
                { slug: 'interplanar-teleport' },
                { slug: 'planar-palace' },
                { slug: 'summon-dragon' },
            ],
        },
        {
            level: 8,
            spells: [
                { slug: 'duplicate-foe' },
                { slug: 'impaling-spike' },
                { slug: 'quandary' },
                { slug: 'summon-dragon' },
            ],
        },
        {
            level: 9,
            spells: [
                { slug: 'resplendent-mansion' },
                { slug: 'impaling-spike' },
                { slug: 'summon-construct' },
                { slug: 'summon-dragon' },
            ],
        },
        {
            level: 10,
            spells: [{ slug: 'gate' }, { slug: 'remake' }],
        },
    ],
}

const eldritchOccultist: SpellList = {
    name: 'Eldritch Occultist',
    tradition: MagicalTradition.occult,
    levels: [
        {
            level: 0,
            spells: [
                { slug: 'daze' },
                { slug: 'detect-magic' },
                { slug: 'figment' },
                { slug: 'light' },
                { slug: 'void-warp' },
            ],
        },
        {
            level: 1,
            spells: [
                { slug: 'deja-vu' },
                { slug: 'enfeeble' },
                { slug: 'grim-tendrils' },
                { slug: 'phantom-pain' },
            ],
        },
        {
            level: 2,
            spells: [
                { slug: 'darkness' },
                { slug: 'paranoia' },
                { slug: 'stupefy' },
                { slug: 'vomit-swarm' },
            ],
        },
        {
            level: 3,
            spells: [
                { slug: 'curse-of-lost-time' },
                { slug: 'fear' },
                { slug: 'mind-reading' },
                { slug: 'vampiric-feast' },
            ],
        },
        {
            level: 4,
            spells: [
                { slug: 'confusion' },
                { slug: 'darkness' },
                { slug: 'nightmare' },
                { slug: 'vision-of-death' },
            ],
        },
        {
            level: 5,
            spells: [
                { slug: 'blister' },
                { slug: 'slither' },
                { slug: 'synesthesia' },
                { slug: 'wall-of-flesh' },
            ],
        },
        {
            level: 6,
            spells: [
                { slug: 'cursed-metamorphosis' },
                { slug: 'phantasmal-calamity' },
                { slug: 'scrying' },
                { slug: 'vampiric-exsanguination' },
            ],
        },
        {
            level: 7,
            spells: [
                { slug: 'mask-of-terror' },
                { slug: 'vampiric-exsanguination' },
                { slug: 'visions-of-danger' },
                { slug: 'warp-mind' },
            ],
        },
        {
            level: 8,
            spells: [
                { slug: 'quandary' },
                { slug: 'spirit-song' },
                { slug: 'spiritual-epidemic' },
                { slug: 'unrelenting-observation' },
            ],
        },
        {
            level: 9,
            spells: [
                { slug: 'overwhelming-presence' },
                { slug: 'phantasmagoria' },
                { slug: 'spirit-song' },
                { slug: 'unfathomable-song' },
            ],
        },
        {
            level: 10,
            spells: [{ slug: 'fabricated-truth' }, { slug: 'gate' }],
        },
    ],
}

const hierophant: SpellList = {
    name: 'Hierophant',
    tradition: MagicalTradition.divine,
    levels: [
        {
            level: 0,
            spells: [
                { slug: 'divine-lance' },
                { slug: 'guidance' },
                { slug: 'forbidding-ward' },
                { slug: 'stabilize' },
                { slug: 'vitality-lash' },
            ],
        },
        {
            level: 1,
            spells: [
                { slug: 'bless' },
                { slug: 'heal' },
                { slug: 'protection' },
                { slug: 'sanctuary' },
            ],
        },
        {
            level: 2,
            spells: [
                { slug: 'calm' },
                { slug: 'cleanse-affliction' },
                { slug: 'heal' },
                { slug: 'share-life' },
            ],
        },
        {
            level: 3,
            spells: [
                { slug: 'cleanse-affliction' },
                { slug: 'heal' },
                { slug: 'protection' },
                { slug: 'safe-passage' },
            ],
        },
        {
            level: 4,
            spells: [
                { slug: 'cleanse-affliction' },
                { slug: 'divine-wrath' },
                { slug: 'heal' },
                { slug: 'vital-beacon' },
            ],
        },
        {
            level: 5,
            spells: [
                { slug: 'banishment' },
                { slug: 'breath-of-life' },
                { slug: 'heal' },
                { slug: 'spiritual-guardian' },
            ],
        },
        {
            level: 6,
            spells: [
                { slug: 'field-of-life' },
                { slug: 'heal' },
                { slug: 'raise-dead' },
                { slug: 'sacred-form' },
            ],
        },
        {
            level: 7,
            spells: [
                { slug: 'divine-decree' },
                { slug: 'heal' },
                { slug: 'planar-seal' },
                { slug: 'regenerate' },
            ],
        },
        {
            level: 8,
            spells: [
                { slug: 'divine-inspiration' },
                { slug: 'heal' },
                { slug: 'moment-of-renewal' },
                { slug: 'sacred-form' },
            ],
        },
        {
            level: 9,
            spells: [
                { slug: 'banishment' },
                { slug: 'foresight' },
                { slug: 'heal' },
                { slug: 'overwhelming-presence' },
            ],
        },
        {
            level: 10,
            spells: [{ slug: 'avatar' }, { slug: 'revival' }],
        },
    ],
}

const mentalist: SpellList = {
    name: 'Mentalist',
    tradition: MagicalTradition.occult,
    levels: [
        {
            level: 0,
            spells: [
                { slug: 'daze' },
                { slug: 'figment' },
                { slug: 'light' },
                { slug: 'message' },
                { slug: 'telekinetic-hand' },
            ],
        },
        {
            level: 1,
            spells: [
                { slug: 'charm' },
                { slug: 'dizzying-colors' },
                { slug: 'illusory-disguise' },
                { slug: 'illusory-object' },
            ],
        },
        {
            level: 2,
            spells: [
                { slug: 'disguise-magic' },
                { slug: 'illusory-creature' },
                { slug: 'invisibility' },
                { slug: 'paranoia' },
            ],
        },
        {
            level: 3,
            spells: [
                { slug: 'enthrall' },
                { slug: 'hypnotize' },
                { slug: 'illusory-disguise' },
                { slug: 'item-facade' },
            ],
        },
        {
            level: 4,
            spells: [
                { slug: 'confusion' },
                { slug: 'illusory-disguise' },
                { slug: 'invisibility' },
                { slug: 'mirage' },
            ],
        },
        {
            level: 5,
            spells: [
                { slug: 'hallucination' },
                { slug: 'illusory-object' },
                { slug: 'illusory-scene' },
                { slug: 'subconscious-suggestion' },
            ],
        },
        {
            level: 6,
            spells: [
                { slug: 'hallucination' },
                { slug: 'illusory-scene' },
                { slug: 'mislead' },
                { slug: 'phantasmal-calamity' },
            ],
        },
        {
            level: 7,
            spells: [
                { slug: 'illusory-disguise' },
                { slug: 'mask-of-terror' },
                { slug: 'project-image' },
                { slug: 'warp-mind' },
            ],
        },
        {
            level: 8,
            spells: [
                { slug: 'charm' },
                { slug: 'confusion' },
                { slug: 'disappearance' },
                { slug: 'hallucination' },
            ],
        },
        {
            level: 9,
            spells: [
                { slug: 'foresight' },
                { slug: 'project-image' },
                { slug: 'subconscious-suggestion' },
                { slug: 'telepathic-demand' },
            ],
        },
        {
            level: 10,
            spells: [{ slug: 'dominate' }, { slug: 'manifestation' }],
        },
    ],
}

const warder: SpellList = {
    name: 'Warder',
    tradition: MagicalTradition.arcane,
    levels: [
        {
            level: 0,
            spells: [
                { slug: 'detect-magic' },
                { slug: 'light' },
                { slug: 'message' },
                { slug: 'prestidigitation' },
                { slug: 'shield' },
            ],
        },
        {
            level: 1,
            spells: [
                { slug: 'alarm' },
                { slug: 'gentle-landing' },
                { slug: 'gust-of-wind' },
                { slug: 'lock' },
            ],
        },
        {
            level: 2,
            spells: [
                { slug: 'dispel-magic' },
                { slug: 'environmental-endurance' },
                { slug: 'resist-energy' },
                { slug: 'revealing-light' },
            ],
        },
        {
            level: 3,
            spells: [
                { slug: 'dispel-magic' },
                { slug: 'safe-passage' },
                { slug: 'veil-of-privacy' },
                { slug: 'wall-of-wind' },
            ],
        },
        {
            level: 4,
            spells: [
                { slug: 'dispelling-globe' },
                { slug: 'fire-shield' },
                { slug: 'flicker' },
                { slug: 'mountain-resilience' },
            ],
        },
        {
            level: 5,
            spells: [
                { slug: 'banishment' },
                { slug: 'dispel-magic' },
                { slug: 'safe-passage' },
                { slug: 'wall-of-stone' },
            ],
        },
        {
            level: 6,
            spells: [
                { slug: 'dispel-magic' },
                { slug: 'mountain-resilience' },
                { slug: 'repulsion' },
                { slug: 'spellwrack' },
            ],
        },
        {
            level: 7,
            spells: [
                { slug: 'dispel-magic' },
                { slug: 'dispelling-globe' },
                { slug: 'energy-aegis' },
                { slug: 'resist-energy' },
            ],
        },
        {
            level: 8,
            spells: [
                { slug: 'dispel-magic' },
                { slug: 'hidden-mind' },
                { slug: 'mountain-resilience' },
                { slug: 'safe-passage' },
            ],
        },
        {
            level: 9,
            spells: [
                { slug: 'banishment' },
                { slug: 'detonate-magic' },
                { slug: 'dispel-magic' },
                { slug: 'dispelling-globe' },
            ],
        },
        {
            level: 10,
            spells: [
                { slug: 'indestructibility' },
                { slug: 'mountain-resilience' },
            ],
        },
    ],
}

const warriorOfFaith: SpellList = {
    name: 'Warrior of Faith',
    tradition: MagicalTradition.divine,
    levels: [
        {
            level: 0,
            spells: [
                { slug: 'divine-lance' },
                { slug: 'forbidding-ward' },
                { slug: 'guidance' },
                { slug: 'shield' },
                {
                    slug: 'vitality-lash',
                    label: 'Vitality Lash or Void Warp',
                },
            ],
        },
        {
            level: 1,
            spells: [
                { slug: 'bless' },
                { slug: 'harm' },
                { slug: 'mystic-armor' },
                { slug: 'runic-weapon' },
            ],
        },
        {
            level: 2,
            spells: [
                { slug: 'harm' },
                { slug: 'resist-energy' },
                { slug: 'see-the-unseen' },
                { slug: 'spiritual-armament' },
            ],
        },
        {
            level: 3,
            spells: [
                { slug: 'anointed-ground' },
                { slug: 'crisis-of-faith' },
                { slug: 'harm' },
                { slug: 'heroism' },
            ],
        },
        {
            level: 4,
            spells: [
                { slug: 'divine-wrath' },
                { slug: 'crisis-of-faith' },
                { slug: 'harm' },
                { slug: 'spiritual-armament' },
            ],
        },
        {
            level: 5,
            spells: [
                { slug: 'banishment' },
                { slug: 'divine-immolation' },
                { slug: 'divine-wrath' },
                { slug: 'harm' },
            ],
        },
        {
            level: 6,
            spells: [
                { slug: 'blessed-boundary' },
                { slug: 'divine-immolation' },
                { slug: 'sacred-form' },
                { slug: 'spiritual-armament' },
            ],
        },
        {
            level: 7,
            spells: [
                { slug: 'blessed-boundary' },
                { slug: 'divine-decree' },
                { slug: 'divine-immolation' },
                { slug: 'harm' },
            ],
        },
        {
            level: 8,
            spells: [
                { slug: 'divine-immolation' },
                { slug: 'divine-inspiration' },
                { slug: 'spiritual-armament' },
                { slug: 'sacred-form' },
            ],
        },
        {
            level: 9,
            spells: [
                { slug: 'divine-decree' },
                { slug: 'divine-immolation' },
                { slug: 'overwhelming-presence' },
                { slug: 'weapon-of-judgment' },
            ],
        },
        {
            level: 10,
            spells: [{ slug: 'avatar' }, { slug: 'weapon-of-judgment' }],
        },
    ],
}

const warMage: SpellList = {
    name: 'War Mage',
    tradition: MagicalTradition.arcane,
    levels: [
        {
            level: 0,
            spells: [
                { slug: 'caustic-blast' },
                { slug: 'electric-arc' },
                { slug: 'frostbite' },
                { slug: 'ignition' },
                { slug: 'shield' },
            ],
        },
        {
            level: 1,
            spells: [
                { slug: 'alarm' },
                { slug: 'breathe-fire' },
                { slug: 'force-barrage' },
                { slug: 'thunderstrike' },
            ],
        },
        {
            level: 2,
            spells: [
                { slug: 'acid-grip' },
                { slug: 'blur' },
                { slug: 'enlarge' },
                { slug: 'floating-flame' },
            ],
        },
        {
            level: 3,
            spells: [
                { slug: 'fireball' },
                { slug: 'haste' },
                { slug: 'lightning-bolt' },
                { slug: 'wall-of-wind' },
            ],
        },
        {
            level: 4,
            spells: [
                { slug: 'clairvoyance' },
                { slug: 'ice-storm' },
                { slug: 'wall-of-fire' },
                { slug: 'weapon-storm' },
            ],
        },
        {
            level: 5,
            spells: [
                { slug: 'control-water' },
                { slug: 'fireball' },
                { slug: 'howling-blizzard' },
                { slug: 'telekinetic-haul' },
            ],
        },
        {
            level: 6,
            spells: [
                { slug: 'chain-lightning' },
                { slug: 'disintegrate' },
                { slug: 'scrying' },
                { slug: 'wall-of-force' },
            ],
        },
        {
            level: 7,
            spells: [
                { slug: 'energy-aegis' },
                { slug: 'fireball' },
                { slug: 'haste' },
                { slug: 'true-target' },
            ],
        },
        {
            level: 8,
            spells: [
                { slug: 'arctic-rift' },
                { slug: 'earthquake' },
                { slug: 'fireball' },
                { slug: 'unrelenting-observation' },
            ],
        },
        {
            level: 9,
            spells: [
                { slug: 'energy-aegis' },
                { slug: 'falling-stars' },
                { slug: 'fireball' },
                { slug: 'implosion' },
            ],
        },
        {
            level: 10,
            spells: [{ slug: 'cataclysm' }, { slug: 'earthquake' }],
        },
    ],
}

export const builtInSpellLists: SpellListCollection = {
    pyromancer: pyromancer,
    stormcaller: stormcaller,
    necromancer: necromancer,
    earthkeeper: earthkeeper,
    animalist: animalist,
    conjurer: conjurer,
    eldritchOccultist: eldritchOccultist,
    hierophant: hierophant,
    mentalist: mentalist,
    warder: warder,
    warriorOfFaith: warriorOfFaith,
    warMage: warMage,
}

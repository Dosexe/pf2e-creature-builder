import { RoadMaps, type RoadmapCollection, type Statistics } from '@/Keys'
import type { SpellListCollection } from '@/spellcasting/model/spellList'
import { builtInSpellLists } from '@/spellcasting/SpellListData'
import { CreatureSystem, isCreatureRoleRoadmap } from '@/systems/CreatureSystem'

export class Pf2eCreatureSystem extends CreatureSystem {
    readonly id = 'pf2e' as const
    readonly spellsCompendium = 'pf2e.spells-srd'

    protected classRoadmaps(): RoadmapCollection {
        const roadmaps: RoadmapCollection = {}
        for (const [key, roadmap] of Object.entries(RoadMaps)) {
            if (!isCreatureRoleRoadmap(key)) roadmaps[key] = roadmap
        }
        return roadmaps
    }

    protected extraSkills(): Statistics[] {
        return []
    }

    spellLists(): SpellListCollection {
        return builtInSpellLists
    }
}

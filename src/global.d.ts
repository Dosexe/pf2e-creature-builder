/// <reference types="@league-of-foundry-developers/foundry-vtt-types" />

declare global {
    // Register module settings namespaces
    interface SettingConfig {
        'foundryvtt-pf2e-creature-builder.roadmaps': Record<string, unknown>
        'pf2e-creature-builder.abbreviateName': boolean
    }

    // Register PF2e Actor and Item subtypes so that type comparisons
    // like `actor.type === 'npc'` and `item.type === 'spell'` are valid
    interface DataModelConfig {
        Actor: {
            character: foundry.abstract.DataModel.AnyConstructor
            npc: foundry.abstract.DataModel.AnyConstructor
        }
        Item: {
            lore: foundry.abstract.DataModel.AnyConstructor
            melee: foundry.abstract.DataModel.AnyConstructor
            spell: foundry.abstract.DataModel.AnyConstructor
            spellcastingEntry: foundry.abstract.DataModel.AnyConstructor
        }
    }
}

export {}

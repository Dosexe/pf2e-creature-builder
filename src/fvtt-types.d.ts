import type { AnyObject } from '@league-of-foundry-developers/foundry-vtt-types/utils'

declare global {
    interface AssumeHookRan {
        init: never
    }

    interface SettingConfig {
        'foundryvtt-pf2e-creature-builder.roadmaps': AnyObject
        'pf2e-creature-builder.abbreviateName': boolean
    }

    interface SourceConfig {
        Actor: {
            npc: {
                type: 'npc'
                system: AnyObject
            }
        }
        Item: {
            melee: {
                type: 'melee'
                system: AnyObject
            }
            spellcastingEntry: {
                type: 'spellcastingEntry'
                system: AnyObject
            }
            lore: {
                type: 'lore'
                system: AnyObject
            }
        }
    }

    interface DataConfig {
        Actor: {
            npc: {
                type: 'npc'
                system: AnyObject
            }
        }
        Item: {
            melee: {
                type: 'melee'
                system: AnyObject
            }
            spellcastingEntry: {
                type: 'spellcastingEntry'
                system: AnyObject
            }
            lore: {
                type: 'lore'
                system: AnyObject
            }
        }
    }
}

export {}

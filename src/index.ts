import { DefaultCreatureLevel } from '@/Keys'
import { CreatureBuilderForm } from './CreatureBuilderForm'
import { RoadMapRegistry } from './RoadMapRegistry'

const SHORT_MODULE_NAME = 'CB'

Hooks.on('init', async () => {
    RoadMapRegistry.getInstance()

    game.settings?.register('foundryvtt-pf2e-creature-builder', 'roadmaps', {
        scope: 'world',
        config: false,
        type: Object,
        default: {},
    })

    game.settings?.register('pf2e-creature-builder', 'abbreviateName', {
        name: 'Abbreviate Creature Builder',
        hint: 'Turn this on if you prefer to see CB instead of the full title Creature Builder in the monster sheet.',
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
    })
})

// Load custom roadmaps asynchronously after the game is ready
// This ensures built-in roadmaps are available immediately and doesn't slow down initialization
Hooks.on('ready', async () => {
    await RoadMapRegistry.getInstance().loadCustomRoadmaps()
})

function getMonsterManualLabel() {
    return game.settings?.get('pf2e-creature-builder', 'abbreviateName')
        ? SHORT_MODULE_NAME
        : 'Creature Builder'
}

Hooks.on('renderActorSheet', async (sheet, html) => {
    const actor = sheet.object
    if (actor?.type !== 'npc') {
        return
    }

    if (!actor.canUserModify(game.user!, 'update')) {
        return
    }
    const element = html.find('.window-header .window-title')
    const label = getMonsterManualLabel()
    const button = $(
        `<a class="popout" style><i style="padding: 0 4px;" class="fas fa-book"></i>${label}</a>`,
    )
    button.on('click', () => {
        new CreatureBuilderForm(actor).render(true)
    })
    element.after(button)
})

Hooks.on('renderActorDirectory', () => {
    const footer = $('#actors .directory-footer.action-buttons')
    if (footer.find("button:contains('Creature Builder')").length === 0) {
        const monsterButton = $(
            `<button><i class="fas fa-book"></i>Creature Builder</button>`,
        )
        footer.append(monsterButton)

        monsterButton.on('click', () => {
            const monsterData = {
                name: 'Monster',
                type: 'npc' as const,
                system: {
                    details: {
                        level: {
                            value: DefaultCreatureLevel,
                        },
                    },
                },
            }
            const actor = new Actor(monsterData as Actor.CreateData)
            new CreatureBuilderForm(actor, {
                useDefaultLevel: true,
            }).render(true)
        })
    }
})

import { DefaultCreatureLevel } from '@/Keys'
import { CreatureBuilderForm } from './CreatureBuilderForm'

Hooks.on('init', async () => {
    // biome-ignore lint/complexity/useLiteralKeys: FoundryVTT type workaround
    await game['settings'].register(
        'foundryvtt-pf2e-creature-builder',
        'roadmaps',
        {
            scope: 'world',
            config: false,
            type: Object,
            default: {},
        },
    )

    // biome-ignore lint/complexity/useLiteralKeys: FoundryVTT type workaround
    await game['settings'].register('pf2e-creature-builder', 'abbreviateName', {
        name: 'Abbreviate Creature Builder',
        hint: 'Turn this on if you prefer to see CB instead of the full title Creature Builder in the monster sheet.',
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
    })
})

function getMonsterManualLabel() {
    // biome-ignore lint/complexity/useLiteralKeys: FoundryVTT type workaround
    return game['settings'].get('pf2e-creature-builder', 'abbreviateName')
        ? 'CB'
        : 'Creature Builder'
}

Hooks.on('renderActorSheet', async (sheet, html) => {
    const actor = sheet.object
    if (actor?.type !== 'npc') {
        return
    }
    // biome-ignore lint/complexity/useLiteralKeys: FoundryVTT type workaround
    if (!actor.canUserModify(game['user'], 'update')) {
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
                type: 'npc',
                system: {
                    details: {
                        level: {
                            value: DefaultCreatureLevel,
                        },
                    },
                },
            }
            const actor = new Actor(monsterData)
            new CreatureBuilderForm(actor, {
                useDefaultLevel: true,
            }).render(true)
            // Actor.create(monsterData, { temporary: true }).then((actor) => {
            //     if (actor) {
            //         new CreatureBuilderForm(actor, {
            //             useDefaultLevel: true,
            //         }).render(true)
            //     }
            // })
        })
    }
})

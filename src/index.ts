import {MonsterMaker} from "./MonsterMaker"
Hooks.on('init', async () => {
    // biome-ignore lint/complexity/useLiteralKeys: FoundryVTT type workaround
    await game["settings"].register("foundryvtt-mycustom-module", "roadmaps", {
        scope: 'world',
        config: false,
        type: Object,
        default: {}
    });

    // biome-ignore lint/complexity/useLiteralKeys: FoundryVTT type workaround
    await game["settings"].register("mycustom-module", "abbreviateName", {
        name:    "Abbreviate Monster Maker",
        hint:    "Turn this on if you prefer to see MM instead of the full title Monster Maker in the monster sheet.",
        scope:   "world",
        config:  true,
        type:    Boolean,
        default: false
    });
})

function getMonsterManualLabel () {
    // biome-ignore lint/complexity/useLiteralKeys: FoundryVTT type workaround
    return game["settings"].get(
        "mycustom-module",
        "abbreviateName"
    ) ? "MM" : "Monster Maker";
}

Hooks.on("renderActorSheet", async (sheet, html) => {
    const actor = sheet.object
    if (actor?.type !== "npc") {
        return;
    }
    // biome-ignore lint/complexity/useLiteralKeys: FoundryVTT type workaround
    if(!actor.canUserModify(game["user"], "update")) {
        return;
    }
    const element = html.find(".window-header .window-title");
    const label = getMonsterManualLabel()
    const button = $(`<a class="popout" style><i style="padding: 0 4px;" class="fas fa-book"></i>${label}</a>`);
    button.on("click", () => {
        new MonsterMaker(actor).render(true)
    })
    element.after(button);
})

Hooks.on("renderActorDirectory", () => {
    const footer = $("#actors .directory-footer.action-buttons");
    if (footer.find("button:contains('Monster Maker')").length === 0) {
        const monsterButton = $(`<button><i class="fas fa-book"></i>Monster Maker</button>`);
        footer.append(monsterButton);

        monsterButton.on("click", () => {
            const monsterData = {
                name: "Monster",
                type: "npc",
            };
            Actor.create(monsterData).then(actor => {
                if (actor) {
                    new MonsterMaker(actor).render(true);
                }
            });
        });
    }
});

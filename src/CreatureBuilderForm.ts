import type { BaseActor } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents.mjs'
import type { ItemData } from '@/model/item'
import type {
    CasterType as SpellcastingCasterType,
    SpellSlot,
} from '@/spellcasting/model/spellcasting'
import { createSpellCopyStrategy } from '@/spellcasting/SpellCopyStrategies'
import { globalLog } from '@/utils'
import CreatureBuilderFormUI, {
    type CreatureBuilderFormConfig,
} from './CreatureBuilderFormUI'
import {
    buildSpellcastingEntry,
    detectSpellcasting,
    generateSpellSlots,
    parseSpellcastingFormData,
} from './CreatureBuilderSpellcasting'
import {
    actorFields,
    type CasterType,
    DefaultCreatureLevel,
    DefaultCreatureStatistics,
    KeyPrefix,
    Levels,
    type MagicalTradition,
    Options,
    Skills,
    Statistics,
} from './Keys'
import { RoadMapRegistry } from './RoadMapRegistry'
import { detectHPLevel, detectStatLevel, statisticValues } from './Values'

type DetectedStatValue = Options | MagicalTradition | CasterType

export class CreatureBuilderForm extends FormApplication {
    data = DefaultCreatureStatistics
    level = DefaultCreatureLevel
    private readonly _uniqueId: string
    private readonly useDefaultLevel: boolean
    private formUI: CreatureBuilderFormUI | null = null

    constructor(object: any, options?: any) {
        super(object, options)

        this.useDefaultLevel = options?.useDefaultLevel === true
        this._uniqueId = `creatureBuilderForm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    }

    get actor(): BaseActor {
        return this.object as BaseActor
    }

    set actor(value: BaseActor) {
        this.object = value
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(FormApplication.defaultOptions, {
            classes: ['form', 'creatureBuilderForm'],
            popOut: true,
            template: `modules/pf2e-creature-builder/dist/forms/creatureBuilderForm.html`,
            id: 'creatureBuilderForm',
            title: 'Creature Builder Form',
            height: 833,
            width: 400,
        })
    }

    get id() {
        return this._uniqueId
    }

    /**
     * Called after the form is rendered to initialize client-side UI behavior
     */
    activateListeners(html: JQuery) {
        super.activateListeners(html)

        const actorLevel = this.useDefaultLevel
            ? DefaultCreatureLevel
            : String(
                  foundry.utils.getProperty(
                      this.actor,
                      'system.details.level.value',
                  ) ?? DefaultCreatureLevel,
              )

        const config: CreatureBuilderFormConfig = {
            creatureStatistics: JSON.parse(JSON.stringify(this.data)),
            creatureRoadmaps: RoadMapRegistry.getInstance().getAllRoadmaps(),
            detectedStats: this.useDefaultLevel ? {} : this.detectActorStats(),
            detectedTraits: this.detectTraits(),
            detectedLoreSkills: this.detectLoreSkills(),
            actorLevel,
        }

        this.formUI = new CreatureBuilderFormUI(config)
        this.formUI.initialize()
    }

    /**
     * Clean up when the form is closed
     */
    async close(options?: FormApplication.CloseOptions) {
        this.formUI = null
        return super.close(options)
    }

    applyName(formData: object) {
        const name = formData[Statistics.name]
            ? formData[Statistics.name]
            : this.actor.name
        return { name: name }
    }

    applyTraits(formData: object) {
        const traitsString = formData[`${KeyPrefix}.traits`]
        if (traitsString && traitsString.trim() !== '') {
            const traits = traitsString
                .split(',')
                .map((t: string) => t.trim().toLowerCase())
                .filter((t: string) => t !== '')
            return { 'system.traits.value': traits }
        }
        return {}
    }

    applyLevel() {
        return { 'system.details.level.value': parseInt(this.level, 10) }
    }

    applyHitPoints(formData: object) {
        const option = formData[Statistics.hp]
        const hitPoints = parseInt(
            statisticValues[Statistics.hp][this.level][option],
            10,
        )
        return { 'system.attributes.hp.value': hitPoints }
    }

    applyStrike(formData: object) {
        const strikeBonusOption = formData[Statistics.strikeBonus]
        const strikeDamageOption = formData[Statistics.strikeDamage]
        const strikeBonus = parseInt(
            statisticValues[Statistics.strikeBonus][this.level][
                strikeBonusOption
            ],
            10,
        )
        const strikeDamage =
            statisticValues[Statistics.strikeDamage][this.level][
                strikeDamageOption
            ]
        const strike: ItemData = {
            // biome-ignore lint/complexity/useLiteralKeys: FoundryVTT type workaround
            name: game['i18n'].localize(`${KeyPrefix}.strike`),
            type: 'melee',
            system: {
                damageRolls: {
                    strikeDamageID: {
                        damage: strikeDamage,
                        damageType: 'bludgeoning',
                        category: null,
                    },
                },
                bonus: {
                    value: strikeBonus,
                },
            },
        }
        return Item.create(strike, { parent: this.actor })
    }

    async applySpellcasting(formData: object) {
        const spellcastingOption = formData[Statistics.spellcasting]
        const { tradition, casterType, keyAttribute } =
            parseSpellcastingFormData(formData)

        if (spellcastingOption === Options.none) {
            const entryIds = (
                this.actor.items as unknown as { type: string; id: string }[]
            )
                .filter((i) => i.type === 'spellcastingEntry')
                .map((i) => i.id)
            if (entryIds.length > 0) {
                await this.actor.deleteEmbeddedDocuments('Item', entryIds)
            }
            return
        }

        const spellcastingBonus = parseInt(
            statisticValues[Statistics.spellcasting][this.level][
                spellcastingOption
            ],
            10,
        )

        // Clone already has spellcasting entry + spells; we only update or create
        let existingEntry: { type: string; id: string } | null = null
        for (const item of this.actor.items as unknown as Iterable<{
            type: string
            id: string
        }>) {
            if (item.type === 'spellcastingEntry') {
                existingEntry = item
                break
            }
        }

        if (existingEntry) {
            const currentSlots = foundry.utils.getProperty(
                existingEntry,
                'system.slots',
            ) as Record<string, SpellSlot> | undefined
            const strategy = createSpellCopyStrategy(
                (casterType ?? 'innate') as SpellcastingCasterType,
                this.actor,
            )
            const updatedSlots =
                currentSlots && strategy
                    ? strategy.buildInitialSlots(currentSlots, this.level)
                    : generateSpellSlots(
                          (casterType ?? 'innate') as SpellcastingCasterType,
                          this.level,
                      )
            await (
                this.actor as {
                    updateEmbeddedDocuments: (
                        embeddedName: string,
                        updates: object[],
                    ) => Promise<unknown>
                }
            ).updateEmbeddedDocuments('Item', [
                {
                    _id: existingEntry.id,
                    'system.spelldc.value': spellcastingBonus,
                    'system.spelldc.dc': spellcastingBonus + 8,
                    'system.tradition.value': tradition,
                    'system.prepared.value': casterType,
                    'system.ability.value': keyAttribute,
                    'system.slots': updatedSlots,
                },
            ])
            return existingEntry
        }

        // New creature: create entry with generated slots only
        const spellcasting = buildSpellcastingEntry({
            tradition,
            casterType,
            keyAttribute,
            spellcastingBonus,
            level: this.level,
            slots: generateSpellSlots(casterType, this.level),
        })
        return Item.create(spellcasting, { parent: this.actor })
    }

    async applySkills(formData: object) {
        for (const skillName of Skills) {
            const option = formData[skillName]
            if (option !== Options.none) {
                const value = parseInt(
                    statisticValues[skillName][this.level][option],
                    10,
                )
                const skill = `system.skills.${skillName.split('.')[1].toLowerCase()}`
                await this.actor.update(
                    foundry.utils.flattenObject({ [skill]: { base: value } }),
                )
            }
        }
    }

    async applyLoreSkills(formData: object) {
        const loreSkills: { name: string; option: string }[] = []
        for (const key of Object.keys(formData)) {
            if (key.startsWith('loreName')) {
                const id = key.replace('loreName', '')
                const name = formData[`loreName${id}`]
                const levelOption = formData[`loreLevel${id}`]
                if (
                    name &&
                    name.trim() !== '' &&
                    levelOption !== Options.none
                ) {
                    loreSkills.push({ name: name.trim(), option: levelOption })
                }
            }
        }

        // Create each lore skill as an item (PF2e stores lore skills as items of type "lore")
        for (const lore of loreSkills) {
            const value = parseInt(
                statisticValues[Statistics.acrobatics][this.level][lore.option],
                10,
            )
            const loreItem: ItemData = {
                name: `${lore.name} Lore`,
                type: 'lore',
                system: {
                    mod: {
                        value: value,
                    },
                },
            }
            await Item.create(loreItem, { parent: this.actor })
        }
    }

    applySenses(senses: Array<object>) {
        if (!senses || senses.length === 0) {
            return {}
        }

        return { 'system.perception.senses': senses }
    }

    applyMovement(movement: object) {
        if (!movement || Object.keys(movement).length === 0) {
            return {}
        }

        return { 'system.movement': movement }
    }

    protected async _updateObject(_event: Event, formData?: object) {
        if (formData) {
            const formLevel = String(formData[Statistics.level])
            this.level = Levels.includes(formLevel)
                ? formLevel
                : DefaultCreatureLevel
            globalLog(false, 'Form data:', formData)

            // Build overrides: clone() merges these with the original actor's data
            const updateData: Record<string, unknown> = {}
            for (const key of Object.keys(formData)) {
                if (actorFields[key]) {
                    const actorField = actorFields[key]
                    const option = formData[key]
                    if (
                        statisticValues[key]?.[this.level]?.[option] !==
                        undefined
                    ) {
                        updateData[actorField] = parseInt(
                            statisticValues[key][this.level][option],
                            10,
                        )
                    }
                }
            }
            Object.assign(updateData, this.applyName(formData))
            Object.assign(updateData, this.applyLevel())
            Object.assign(updateData, this.applyTraits(formData))
            Object.assign(updateData, this.applyHitPoints(formData))
            Object.assign(
                updateData,
                this.applySenses(
                    foundry.utils.getProperty(
                        this.actor,
                        'system.perception.senses',
                    ),
                ),
            )
            Object.assign(
                updateData,
                this.applyMovement(
                    foundry.utils.getProperty(this.actor, 'system.movement'),
                ),
            )

            // Clone original actor with overrides (copies all data + items; save to world)
            const cloneResult = this.actor.clone(updateData, { save: true })
            const newActor = await (Promise.resolve(cloneResult) as Promise<
                Actor | undefined
            >)
            if (!newActor) {
                globalLog(true, 'Failed to clone actor')
                return
            }

            const originalActor = this.actor
            this.actor = newActor

            // Remove only strike and lore; clone already has spellcasting entry + spells
            const toDelete: string[] = []
            for (const item of newActor.items) {
                if (
                    item.id &&
                    (item.type === 'melee' || item.type === 'lore')
                ) {
                    toDelete.push(item.id)
                }
            }
            if (toDelete.length > 0) {
                await newActor.deleteEmbeddedDocuments('Item', toDelete)
            }

            await Promise.all([
                this.applyStrike(formData),
                this.applySpellcasting(formData),
                this.applySkills(formData),
                this.applyLoreSkills(formData),
            ])
            this.actor = originalActor

            newActor.sheet?.render(true)
        }
    }

    detectActorStats(): Record<string, DetectedStatValue> {
        const detected: Record<string, DetectedStatValue> = {}

        const actorLevel = String(
            foundry.utils.getProperty(
                this.actor,
                'system.details.level.value',
            ) ?? DefaultCreatureLevel,
        )
        const clampedLevel = Levels.includes(actorLevel)
            ? actorLevel
            : DefaultCreatureLevel

        const abilityStats = [
            Statistics.str,
            Statistics.dex,
            Statistics.con,
            Statistics.int,
            Statistics.wis,
            Statistics.cha,
        ]
        for (const stat of abilityStats) {
            const path = actorFields[stat]
            const value = foundry.utils.getProperty(this.actor, path)
            if (value !== undefined && value !== null) {
                detected[stat] = detectStatLevel(
                    stat,
                    clampedLevel,
                    Number(value),
                )
            }
        }

        const hp = foundry.utils.getProperty(
            this.actor,
            'system.attributes.hp.max',
        )
        if (hp !== undefined && hp !== null && Number(hp) > 0) {
            detected[Statistics.hp] = detectHPLevel(clampedLevel, Number(hp))
        }

        const perception = foundry.utils.getProperty(
            this.actor,
            'system.perception.mod',
        )
        if (perception !== undefined && perception !== null) {
            detected[Statistics.per] = detectStatLevel(
                Statistics.per,
                clampedLevel,
                Number(perception),
            )
        }

        const ac = foundry.utils.getProperty(
            this.actor,
            'system.attributes.ac.value',
        )
        if (ac !== undefined && ac !== null && Number(ac) > 0) {
            detected[Statistics.ac] = detectStatLevel(
                Statistics.ac,
                clampedLevel,
                Number(ac),
            )
        }

        const saveStats = [
            { stat: Statistics.fort, path: 'system.saves.fortitude.value' },
            { stat: Statistics.ref, path: 'system.saves.reflex.value' },
            { stat: Statistics.wil, path: 'system.saves.will.value' },
        ]
        for (const save of saveStats) {
            const value = foundry.utils.getProperty(this.actor, save.path)
            if (value !== undefined && value !== null) {
                detected[save.stat] = detectStatLevel(
                    Statistics.per,
                    clampedLevel,
                    Number(value),
                ) // Uses same scale as perception
            }
        }

        for (const skillStat of Skills) {
            const skillKey = skillStat.split('.')[1].toLowerCase()
            const skillValue =
                foundry.utils.getProperty(
                    this.actor,
                    `system.skills.${skillKey}.base`,
                ) ??
                foundry.utils.getProperty(
                    this.actor,
                    `system.skills.${skillKey}.value`,
                )
            if (
                skillValue !== undefined &&
                skillValue !== null &&
                Number(skillValue) > 0
            ) {
                detected[skillStat] = detectStatLevel(
                    skillStat,
                    clampedLevel,
                    Number(skillValue),
                )
            }
        }

        // Detect Spellcasting (check if actor has any spellcasting entries)
        const items = this.actor.items
        if (items) {
            const spellcastingData = detectSpellcasting(items, clampedLevel)
            if (spellcastingData.spellcastingLevel) {
                detected[Statistics.spellcasting] =
                    spellcastingData.spellcastingLevel
            }
            if (spellcastingData.tradition) {
                detected[Statistics.spellcastingTradition] =
                    spellcastingData.tradition
            }
            if (spellcastingData.casterType) {
                detected[Statistics.spellcastingType] =
                    spellcastingData.casterType
            }
        }

        return detected
    }

    detectTraits(): string[] {
        const traits = foundry.utils.getProperty(
            this.actor,
            'system.traits.value',
        )
        if (Array.isArray(traits)) {
            return traits
        }
        return []
    }

    detectLoreSkills(): { name: string; level: Options }[] {
        const loreSkills: { name: string; level: Options }[] = []
        const actorLevel = String(
            foundry.utils.getProperty(
                this.actor,
                'system.details.level.value',
            ) ?? 1,
        )
        const clampedLevel = Levels.includes(actorLevel) ? actorLevel : '1'

        // In PF2e, Lore skills are stored as items with type "lore"
        const items = this.actor.items
        if (items) {
            for (const item of items) {
                if (item.type === 'lore') {
                    const loreName =
                        item.name
                            ?.replace(' Lore', '')
                            .replace(/ \(.*\)$/, '') || 'Unknown'
                    const modValue =
                        foundry.utils.getProperty(item, 'system.mod.value') ?? 0
                    if (modValue > 0) {
                        const level = detectStatLevel(
                            Statistics.acrobatics,
                            clampedLevel,
                            Number(modValue),
                        )
                        loreSkills.push({ name: loreName, level })
                    }
                }
            }
        }
        return loreSkills
    }

    // @ts-expect-error - Overriding parent method
    getData() {
        // console.debug('=== CreatureBuilderForm getData() ===')
        // console.debug('this.object:', this.object)
        // console.debug('this.actor:', this.actor)
        // console.debug('this.actor?.name:', (this.actor as any)?.name)
        // console.debug('this.actor?.system:', (this.actor as any)?.system)
        // console.debug(
        //     'Level raw:',
        //     foundry.utils.getProperty(this.actor, 'system.details.level.value'),
        // )

        Handlebars.registerHelper('json', (context) => JSON.stringify(context))

        const detectedStats = this.detectActorStats()
        const detectedTraits = this.detectTraits()
        const detectedLoreSkills = this.detectLoreSkills()
        const actorLevel = this.useDefaultLevel
            ? DefaultCreatureLevel
            : String(
                  foundry.utils.getProperty(
                      this.actor,
                      'system.details.level.value',
                  ) ?? DefaultCreatureLevel,
              )

        return {
            CreatureStatistics: JSON.parse(JSON.stringify(this.data)),
            Levels: Levels,
            RoadMaps: RoadMapRegistry.getInstance().getAllRoadmaps(),
            name: this.actor.name,
            detectedStats: detectedStats,
            detectedTraits: detectedTraits,
            detectedLoreSkills: detectedLoreSkills,
            actorLevel: actorLevel,
        }
    }
}

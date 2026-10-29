import type { ItemData } from '@/model/item'
import type {
    CasterType as SpellcastingCasterType,
    SpellSlot,
} from '@/spellcasting/model/spellcasting'
import { createSpellCopyStrategy } from '@/spellcasting/SpellCopyStrategies'
import { builtInSpellLists } from '@/spellcasting/SpellListData'
import { resolveAndApplySpellList } from '@/spellcasting/SpellListResolver'
import { globalLog } from '@/utils'
import CreatureBuilderFormUI, {
    type CreatureBuilderFormConfig,
} from './CreatureBuilderFormUI'
import {
    buildSpellcastingEntry,
    buildSpellcastingName,
    detectSpellcasting,
    expandPreparedSlotsPreservingSpells,
    expandSpontaneousSlotsPreservingValues,
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
import { RoadMapRegistry } from './roadmaps/RoadMapRegistry'
import { detectHPLevel, detectStatLevel, statisticValues } from './Values'
import {
    attacksFromWeapon,
    isGenerateAttacksEnabled,
    type NpcAttackContext,
    type WeaponAttackInput,
} from './WeaponAttackGenerator'

type DetectedStatValue = Options | MagicalTradition | CasterType

const ALLOWED_DROP_TYPES = new Set([
    'action',
    'ammo',
    'armor',
    'backpack',
    'condition',
    'consumable',
    'equipment',
    'feat',
    'lore',
    'melee',
    'shield',
    'spell',
    'treasure',
    'weapon',
])

const FORM_TEMPLATE =
    'modules/pf2e-creature-builder/dist/forms/creatureBuilderForm.html'

function firstCreatedDocument(created: unknown): unknown {
    if (Array.isArray(created)) return created[0]
    return created ?? undefined
}

function weaponIdentity(item: Record<string, unknown>): string {
    const name =
        typeof item.name === 'string' ? item.name.trim().toLowerCase() : ''
    if (name) return `name:${name}`
    const uuid = item._sourceUuid
    if (typeof uuid === 'string' && uuid) return `uuid:${uuid}`
    return ''
}

function dedupeWeaponAttacks(
    weapons: WeaponAttackInput[],
): WeaponAttackInput[] {
    return dedupeByWeaponIdentity(weapons, (weapon) => weapon.source)
}

function dedupeByWeaponIdentity<T>(
    items: T[],
    sourceOf: (item: T) => Record<string, unknown>,
): T[] {
    const seen = new Set<string>()
    const unique: T[] = []
    for (const item of items) {
        const source = sourceOf(item)
        if (source.type !== undefined && source.type !== 'weapon') {
            unique.push(item)
            continue
        }
        const key = weaponIdentity(source)
        if (key && seen.has(key)) continue
        if (key) seen.add(key)
        unique.push(item)
    }
    return unique
}

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

let helpersRegistered = false

export function roadmapLabel(key: unknown): string {
    if (typeof key !== 'string') {
        return ''
    }

    const prefix = `${KeyPrefix}.custom.`
    if (key.startsWith(prefix)) {
        const raw = key.slice(prefix.length)
        const normalized = raw
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        if (!normalized) {
            return key
        }
        return normalized
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
    }

    return game.i18n?.localize(key) ?? key
}

export function registerCreatureBuilderHelpers(): void {
    if (helpersRegistered) return
    helpersRegistered = true
    Handlebars.registerHelper('roadmapLabel', roadmapLabel)
}

function onAddLore(
    this: CreatureBuilderForm,
    _event: PointerEvent,
    _target: HTMLElement,
) {
    this.addLore()
}

function onAddAttack(
    this: CreatureBuilderForm,
    _event: PointerEvent,
    _target: HTMLElement,
) {
    this.addAttack()
}

function onResetDefaults(
    this: CreatureBuilderForm,
    _event: PointerEvent,
    _target: HTMLElement,
) {
    this.resetDefaults()
}

function onCreatureBuilderSubmit(
    this: CreatureBuilderForm,
    event: Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
) {
    const flat = foundry.utils.flattenObject(formData.object)
    return this._updateObject(event, flat)
}

export class CreatureBuilderForm extends HandlebarsApplicationMixin(
    ApplicationV2,
) {
    static override DEFAULT_OPTIONS = {
        id: 'creatureBuilderForm',
        tag: 'form',
        classes: ['creatureBuilderForm', 'creatureBuilderFormModern'],
        window: {
            title: 'PF2EMONSTERMAKER.title',
            icon: 'fas fa-book',
            resizable: true,
        },
        position: {
            width: 530,
            height: 620,
        },
        form: {
            handler: onCreatureBuilderSubmit,
            submitOnChange: false,
            closeOnSubmit: true,
        },
        actions: {
            addLore: onAddLore,
            addAttack: onAddAttack,
            resetDefaults: onResetDefaults,
        },
    }

    static override PARTS = {
        body: {
            template: FORM_TEMPLATE,
            scrollable: ['.form-main'],
        },
    }

    data = DefaultCreatureStatistics
    level = DefaultCreatureLevel
    droppedItems: Record<string, unknown>[] = []
    private actorDocument: Actor
    private readonly useDefaultLevel: boolean
    private formUI: CreatureBuilderFormUI | null = null
    private preservedControls: Record<string, string> | null = null

    constructor(actor: any, options?: { useDefaultLevel?: boolean }) {
        const uniqueId = `creatureBuilderForm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        super({ id: uniqueId })

        this.actorDocument = actor
        this.useDefaultLevel = options?.useDefaultLevel === true
    }

    get actor(): Actor {
        return this.actorDocument
    }

    set actor(value: Actor) {
        this.actorDocument = value
    }

    protected _canDragDrop(_selector: string): boolean {
        return true
    }

    protected async _onDrop(event: DragEvent) {
        let data: { type?: string; uuid?: string }
        try {
            data = JSON.parse(event.dataTransfer?.getData('text/plain') ?? '{}')
        } catch {
            return
        }

        if (data.type !== 'Item' || !data.uuid) return

        const item = await (globalThis as any).fromUuid(data.uuid)
        if (!item) return

        const itemType = item.type as string
        if (!ALLOWED_DROP_TYPES.has(itemType)) {
            ui.notifications?.warn?.(
                game.i18n?.localize(`${KeyPrefix}.invalidItemType`) ??
                    'This item type cannot be added',
            )
            return
        }

        const itemData = item.toObject ? item.toObject() : { ...item }
        delete itemData._id

        const uniqueTypes = new Set([
            'spell',
            'action',
            'feat',
            'condition',
            'lore',
        ])
        if (uniqueTypes.has(itemType)) {
            const getSpellLevel = (obj: Record<string, unknown>) =>
                (obj.system as Record<string, unknown> | undefined)?.level as
                    | Record<string, unknown>
                    | undefined
            const spellLevel = getSpellLevel(itemData)?.value
            const isDuplicate = this.droppedItems.some((existing) => {
                if (existing._sourceUuid !== data.uuid) return false
                if (itemType === 'spell') {
                    return getSpellLevel(existing)?.value === spellLevel
                }
                return true
            })
            if (isDuplicate) {
                ui.notifications?.warn?.(
                    game.i18n?.localize(`${KeyPrefix}.duplicateItemType`) ??
                        'This item has already been added',
                )
                return
            }
        }

        itemData._sourceUuid = data.uuid
        this.droppedItems.push(itemData)

        this.formUI?.renderDroppedItem(itemData)
    }

    protected override async _prepareContext(options) {
        const context = await super._prepareContext(options)
        return {
            ...context,
            ...this.getData(),
        }
    }

    /**
     * Read dropdown values before Foundry replaces the form markup.
     */
    protected override async _preRender(context, options) {
        await super._preRender(context, options)
        this.preservedControls = this.captureDropdownValues()
    }

    private captureDropdownValues(): Record<string, string> | null {
        const root = this.element
        if (!root?.querySelectorAll) return null

        const values: Record<string, string> = {}
        for (const select of Array.from(root.querySelectorAll('select'))) {
            const name = select.getAttribute('name')
            if (name) {
                values[name] = select.value
                continue
            }
            if (select.id.endsWith('creatureBuilderRoadmap')) {
                values.creatureBuilderRoadmap = select.value
            }
        }

        for (const input of Array.from(
            root.querySelectorAll<HTMLInputElement>(
                'input[type="checkbox"][name]',
            ),
        )) {
            const name = input.getAttribute?.('name') || input.name
            if (!name) continue
            values[name] = input.checked ? 'true' : 'false'
        }

        for (const input of Array.from(
            root.querySelectorAll<HTMLInputElement>(
                'input[type="text"][name], input[type="hidden"][name]',
            ),
        )) {
            const name = input.getAttribute?.('name') || input.name
            if (!name?.startsWith('attackName')) continue
            values[name] = input.value
        }

        return Object.keys(values).length > 0 ? values : null
    }

    /**
     * Called after the form is rendered to initialize client-side UI behavior
     */
    protected override async _onRender(context, options) {
        await super._onRender(context, options)
        this.initializeClientUi()
        this.bindItemDrop()
    }

    private initializeClientUi() {
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
            spellLists: builtInSpellLists,
            detectedStats: this.useDefaultLevel ? {} : this.detectActorStats(),
            detectedTraits: this.detectTraits(),
            detectedLoreSkills: this.detectLoreSkills(),
            actorLevel,
            droppedItems: this.droppedItems,
            root: this.element,
            idPrefix: this.fieldIdPrefix(),
            preservedControls: this.preservedControls ?? undefined,
        }

        this.formUI?.destroy()
        this.formUI = new CreatureBuilderFormUI(config)
        this.formUI.initialize()
    }

    addLore(): void {
        this.formUI?.addLoreSkill()
    }

    addAttack(): void {
        this.formUI?.addAttack()
    }

    resetDefaults(): void {
        this.formUI?.resetToDefaults()
    }

    private bindItemDrop() {
        const element = this.element
        if (!element) return

        new foundry.applications.ux.DragDrop({
            dropSelector: '.creature-builder-drop-zone',
            permissions: {
                drop: () => this._canDragDrop('.creature-builder-drop-zone'),
            },
            callbacks: {
                drop: (event) => {
                    void this._onDrop(event)
                },
            },
        }).bind(element)
    }

    /**
     * Clean up when the form is closed
     */
    override async close(
        options?: Parameters<
            foundry.applications.api.ApplicationV2['close']
        >[0],
    ) {
        this.formUI?.destroy()
        this.formUI = null
        this.droppedItems = []
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
        const level = parseInt(this.level, 10)
        return {
            'system.details.level.value': level,
            'system.details.level.base': level,
        }
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
        const strike = this.manualStrikeItem(
            game.i18n!.localize(`${KeyPrefix}.strike`),
            formData[Statistics.strikeBonus],
            formData[Statistics.strikeDamage],
        )
        if (!strike) return
        return Item.create(strike, { parent: this.actor })
    }

    async applyManualAttacks(formData: object) {
        const ids = Object.keys(formData)
            .filter((key) => key.startsWith('attackName'))
            .map((key) => key.slice('attackName'.length))
            .sort((a, b) => Number(a) - Number(b))

        for (const id of ids) {
            const rawName = formData[`attackName${id}`]
            const name =
                typeof rawName === 'string' && rawName.trim() !== ''
                    ? rawName.trim()
                    : game.i18n!.localize(`${KeyPrefix}.strike`)
            const strike = this.manualStrikeItem(
                name,
                formData[`attackBonus${id}`],
                formData[`attackDamage${id}`],
            )
            if (!strike) {
                globalLog(true, `Failed to add attack "${name}"`)
                continue
            }
            try {
                await Item.create(strike, { parent: this.actor })
            } catch (error) {
                globalLog(true, `Failed to add attack "${name}"`, error)
            }
        }
    }

    private manualStrikeItem(
        name: string,
        bonusOption: unknown,
        damageOption: unknown,
    ): ItemData | undefined {
        if (
            typeof bonusOption !== 'string' ||
            typeof damageOption !== 'string'
        ) {
            return undefined
        }
        const bonusRaw =
            statisticValues[Statistics.strikeBonus][this.level]?.[bonusOption]
        const strikeDamage =
            statisticValues[Statistics.strikeDamage][this.level]?.[damageOption]
        if (bonusRaw === undefined || strikeDamage === undefined)
            return undefined
        const strikeBonus = parseInt(bonusRaw, 10)
        if (Number.isNaN(strikeBonus)) return undefined
        return {
            name,
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

        const resolvedCasterType = (casterType ??
            'innate') as SpellcastingCasterType

        if (existingEntry) {
            const currentSlots = foundry.utils.getProperty(
                existingEntry,
                'system.slots',
            ) as Record<string, SpellSlot> | undefined
            const updatedSlots = (() => {
                if (!currentSlots) {
                    return generateSpellSlots(resolvedCasterType, this.level)
                }
                if (resolvedCasterType === 'prepared') {
                    return expandPreparedSlotsPreservingSpells(
                        currentSlots,
                        this.level,
                    )
                }
                if (resolvedCasterType === 'spontaneous') {
                    return expandSpontaneousSlotsPreservingValues(
                        currentSlots,
                        this.level,
                    )
                }
                // innate: use strategy or generate new slots
                const strategy = createSpellCopyStrategy(
                    resolvedCasterType,
                    this.actor,
                )
                return strategy
                    ? strategy.buildInitialSlots(currentSlots, this.level)
                    : generateSpellSlots(resolvedCasterType, this.level)
            })()
            const spellsLabel = game.i18n!.localize(`${KeyPrefix}.spells`)
            const entryName = buildSpellcastingName(
                tradition,
                resolvedCasterType,
                spellsLabel,
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
                    name: entryName,
                    'system.spelldc.value': spellcastingBonus,
                    'system.spelldc.dc': spellcastingBonus + 8,
                    'system.tradition.value': tradition,
                    'system.prepared.value': casterType,
                    'system.ability.value': keyAttribute,
                    'system.slots': updatedSlots,
                },
            ])

            await this.applySpellListSafely(
                formData,
                existingEntry.id,
                updatedSlots,
                resolvedCasterType,
            )
            return existingEntry
        }

        // New creature: create entry with generated slots only
        const slots = generateSpellSlots(resolvedCasterType, this.level)
        const spellcasting = buildSpellcastingEntry({
            tradition,
            casterType: resolvedCasterType,
            keyAttribute,
            spellcastingBonus,
            level: this.level,
            slots,
        })

        const created = await Item.create(spellcasting, { parent: this.actor })
        if (created?.id) {
            await this.applySpellListSafely(
                formData,
                created.id,
                slots,
                resolvedCasterType,
            )
        }
        return created
    }

    private async applySpellListSafely(
        formData: object,
        spellcastingEntryId: string,
        slots: Record<string, SpellSlot>,
        casterType: string,
    ): Promise<void> {
        try {
            await this.applySpellList(
                formData,
                spellcastingEntryId,
                slots,
                casterType,
            )
        } catch (error) {
            globalLog(true, 'Failed to apply spell list', error)
        }
    }

    async applySpellList(
        formData: object,
        spellcastingEntryId: string,
        slots: Record<string, SpellSlot>,
        casterType: string,
    ) {
        const spellListKey = formData[Statistics.spellList]
        if (!spellListKey || spellListKey === 'none') return

        const spellList = builtInSpellLists[spellListKey]
        if (!spellList) {
            globalLog(true, `Spell list "${spellListKey}" not found`)
            return
        }

        await resolveAndApplySpellList(
            spellList,
            slots,
            spellcastingEntryId,
            casterType,
            this.actor,
            this.level,
        )
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

            try {
                await Item.create(loreItem, { parent: this.actor })
            } catch (error) {
                globalLog(true, `Failed to add lore "${loreItem.name}"`, error)
            }
        }
    }

    private static stripSourceUuid(
        items: Record<string, unknown>[],
    ): Record<string, unknown>[] {
        return items.map(({ _sourceUuid, ...rest }) => rest)
    }

    async applyDroppedItems(
        spellcastingEntryId?: string,
    ): Promise<WeaponAttackInput[]> {
        if (this.droppedItems.length === 0) return []

        const spells: Record<string, unknown>[] = []
        const nonSpells: Record<string, unknown>[] = []
        for (const item of this.droppedItems) {
            if (item.type === 'spell') {
                spells.push(item)
            } else {
                nonSpells.push(item)
            }
        }

        const createEmbedded = (
            this.actor as {
                createEmbeddedDocuments: (
                    embeddedName: string,
                    data: object[],
                ) => Promise<unknown>
            }
        ).createEmbeddedDocuments.bind(this.actor)

        const weapons: WeaponAttackInput[] = []
        const createEach = async (items: Record<string, unknown>[]) => {
            for (const item of items) {
                try {
                    const created = await createEmbedded('Item', [item])
                    if (item.type === 'weapon') {
                        weapons.push({
                            source: item,
                            document: firstCreatedDocument(created),
                        })
                    }
                } catch (error) {
                    globalLog(
                        true,
                        `Failed to add item "${String(item.name ?? item.type ?? 'item')}"`,
                        error,
                    )
                }
            }
        }

        if (nonSpells.length > 0) {
            await createEach(CreatureBuilderForm.stripSourceUuid(nonSpells))
        }

        if (spells.length > 0 && spellcastingEntryId) {
            const linkedSpells = CreatureBuilderForm.stripSourceUuid(
                spells,
            ).map((spell) => ({
                ...spell,
                system: {
                    ...(spell.system as Record<string, unknown> | undefined),
                    location: { value: spellcastingEntryId },
                },
            }))
            await createEach(linkedSpells)
        } else if (spells.length > 0) {
            globalLog(
                true,
                'Dropped spells skipped: no spellcasting entry available',
            )
        }

        return weapons
    }

    /**
     * Create NPC strikes for dropped weapons with PF2E's Generate Attack values.
     */
    async applyGeneratedWeaponAttacks(
        formData: object,
        weapons?: WeaponAttackInput[] | null,
    ): Promise<boolean> {
        if (!isGenerateAttacksEnabled(formData) || !weapons?.length) {
            return false
        }

        const createEmbedded = (
            this.actor as {
                createEmbeddedDocuments?: (
                    embeddedName: string,
                    data: object[],
                ) => Promise<unknown>
            }
        ).createEmbeddedDocuments?.bind(this.actor)
        if (!createEmbedded) return false

        const context = this.npcAttackContext()
        let createdAny = false
        for (const weapon of dedupeWeaponAttacks(weapons)) {
            for (const attack of attacksFromWeapon(weapon, context)) {
                try {
                    await createEmbedded('Item', [attack])
                    createdAny = true
                } catch (error) {
                    globalLog(
                        true,
                        `Failed to add attack "${String(attack.name ?? 'attack')}"`,
                        error,
                    )
                }
            }
        }
        return createdAny
    }

    private npcAttackContext(): NpcAttackContext {
        return {
            level: Number.parseInt(this.level, 10) || 0,
            strength: this.abilityMod('str'),
            dexterity: this.abilityMod('dex'),
        }
    }

    private abilityMod(ability: 'str' | 'dex'): number {
        const prepared = (
            this.actor as { abilities?: Record<string, { mod?: unknown }> }
        ).abilities?.[ability]?.mod
        if (typeof prepared === 'number' && Number.isFinite(prepared)) {
            return prepared
        }
        const stored = foundry.utils.getProperty(
            this.actor,
            `system.abilities.${ability}.mod`,
        )
        const value = Number(stored)
        return Number.isFinite(value) ? value : 0
    }

    private async applyItemsAndStrikes(
        formData: object,
        spellcastingEntryId?: string,
    ) {
        try {
            const weapons = await this.applyDroppedItems(spellcastingEntryId)
            await this.applyGeneratedWeaponAttacks(formData, weapons)
        } catch (error) {
            globalLog(true, 'Failed to apply dropped items', error)
        }
        await this.applyStrike(formData)
        await this.applyManualAttacks(formData)
    }

    protected async _updateObject(_event: Event, formData?: object) {
        if (formData) {
            const formLevel = String(formData[Statistics.level])
            this.level = Levels.includes(formLevel)
                ? formLevel
                : DefaultCreatureLevel
            globalLog(false, 'Form data:', formData)

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

            // Clone original actor with overrides (copies all data + items; save to world)
            const newActor: Actor | undefined = await this.actor.clone(
                updateData as any,
                { save: true },
            )
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

            let spellcastingEntry: unknown
            try {
                spellcastingEntry = await this.applySpellcasting(formData)
            } catch (error) {
                globalLog(true, 'Failed to apply spellcasting', error)
            }
            const spellcastingEntryId =
                (spellcastingEntry as { id?: string } | undefined)?.id ??
                undefined

            await Promise.allSettled([
                this.applyItemsAndStrikes(formData, spellcastingEntryId),
                this.applySkills(formData),
                this.applyLoreSkills(formData),
            ])
            this.actor = originalActor
            ;(newActor as Actor).sheet?.render(true)
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
                    const modValue = Number(
                        foundry.utils.getProperty(item, 'system.mod.value'),
                    )
                    if (Number.isFinite(modValue) && modValue > 0) {
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

    private fieldIdPrefix(): string {
        return `${this.id}-`
    }

    getData() {
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
            SpellLists: builtInSpellLists,
            name: this.actor.name,
            detectedStats: detectedStats,
            detectedTraits: detectedTraits,
            detectedLoreSkills: detectedLoreSkills,
            actorLevel: actorLevel,
            fieldId: this.fieldIdPrefix(),
        }
    }
}

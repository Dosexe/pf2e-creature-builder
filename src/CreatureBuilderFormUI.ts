/**
 * Creature Builder Form UI Controller
 * Handles client-side form interactions: size, traits, lore skills, and roadmap selection
 * This class is instantiated by the CreatureBuilderForm Application V2 after rendering
 */

import { type RoadmapCollection, Statistics } from '@/Keys'
import type { SpellListCollection } from '@/spellcasting/model/spellList'
import { DEFAULT_CREATURE_SIZE } from '@/systems/creatureSizes'
import { getCreatureSystem } from '@/systems/getCreatureSystem'
import { statisticValues } from '@/Values'
import {
    type ActorIwr,
    availableIwrModifiers,
    availableIwrTypes,
    cloneActorIwr,
    defaultIwrValue,
    emptyActorIwr,
    IWR_KINDS,
    type IwrDraft,
    type IwrKind,
    iwrCollapsedSummary,
    iwrFromControls,
    iwrListKey,
    iwrTypeLabel,
    recommendedIwrText,
    scaleIwrValue,
} from './iwr'
import {
    closestTierForEdit,
    displayEditedDamage,
    displayEditedNumber,
    isStrikeDie,
    manualOverrideKey,
    parseStrikeDamage,
    STRIKE_DICE,
} from './manualValues'
import {
    acuityLabel,
    DEFAULT_LAND_SPEED,
    DEFAULT_SENSE_RANGE,
    isMovementType,
    type MovementType,
    mandatoryAcuity,
    SENSE_ACUITIES,
    type SenseAcuity,
    type SenseDraft,
    SPEED_MENU_ORDER,
    type SpeedChip,
    senseChoices,
    senseCopyLimit,
    senseHasRange,
    sensesFromControls,
    speedLabel,
    speedsFromControls,
} from './movementSenses'

interface StatisticEntry {
    name: string
    availableOptions?: string[]
    defaultValue?: string
}

interface CreatureStatistic {
    name: string
    statisticEntries: StatisticEntry[]
    availableOptions?: string[]
    defaultValue: string
}

interface DetectedStats {
    [key: string]: string
}

interface LoreSkill {
    name: string
    level: string
}

interface DetectedAttack {
    name: string
    bonus: string
    damage: string
    damageType?: string
    source?: string
}

interface CreatureBuilderFormConfig {
    creatureStatistics: CreatureStatistic[]
    creatureRoadmaps: RoadmapCollection
    spellLists: SpellListCollection
    detectedStats: DetectedStats
    detectedTraits: string[]
    detectedSize?: string
    detectedLoreSkills: LoreSkill[]
    detectedAttacks?: DetectedAttack[]
    detectedSpeeds?: SpeedChip[]
    detectedSenses?: SenseDraft[]
    detectedIwr?: ActorIwr
    actorLevel: string
    droppedItems?: Record<string, unknown>[]
    root: HTMLElement
    idPrefix: string
    preservedControls?: Record<string, string>
}

const MANUAL_ATTACKS_PRESENT = 'manualAttacksPresent'

/**
 * Read the controls Foundry would discard when it replaces the form markup.
 */
export function capturePreservedControls(root: {
    querySelectorAll: (selector: string) => ArrayLike<Element>
}): Record<string, string> | null {
    const values: Record<string, string> = {}
    for (const select of Array.from(root.querySelectorAll('select'))) {
        const name = select.getAttribute('name')
        if (name) {
            values[name] = (select as HTMLSelectElement).value
            continue
        }
        if (select.id.endsWith('creatureBuilderRoadmap')) {
            values.creatureBuilderRoadmap = (select as HTMLSelectElement).value
        }
    }

    for (const input of Array.from(
        root.querySelectorAll('input[type="checkbox"][name]'),
    )) {
        const box = input as HTMLInputElement
        const name = box.getAttribute?.('name') || box.name
        if (!name) continue
        values[name] = box.checked ? 'true' : 'false'
    }

    const manual = Array.from(
        root.querySelectorAll('input[type="checkbox"]'),
    ).find((input) => input.id.endsWith('toggleManualInput')) as
        | HTMLInputElement
        | undefined
    if (manual) values.toggleManualInput = manual.checked ? 'true' : 'false'

    for (const input of Array.from(
        root.querySelectorAll(
            'input[type="text"][name], input[type="hidden"][name]',
        ),
    )) {
        const field = input as HTMLInputElement
        const name = field.getAttribute?.('name') || field.name
        if (
            !name?.startsWith('attackName') &&
            !name?.startsWith('attackDamageType') &&
            !name?.startsWith('attackSource') &&
            !name?.startsWith('manualOverride.')
        ) {
            continue
        }
        values[name] = field.value
    }

    for (const input of Array.from(
        root.querySelectorAll(
            'input[name^="speedType-"], input[name^="speedValue-"], input[name^="senseRange"], input[name="sensesInitialized"], input[name="movementSensesPresent"], input[name="iwrPresent"], input[name="iwrPreserved"], input[name^="immunity-"], input[name^="resistance-"], input[name^="weakness-"]',
        ),
    )) {
        const field = input as HTMLInputElement
        const name = field.getAttribute?.('name') || field.name
        if (!name) continue
        values[name] = field.value
    }

    if (root.querySelectorAll('[id$="manualAttacksContainer"]').length > 0) {
        values[MANUAL_ATTACKS_PRESENT] = 'true'
    }

    return Object.keys(values).length > 0 ? values : null
}

/**
 * UI Controller for Creature Builder form interactions
 * Client-side behavior for one Creature Builder window
 */
class CreatureBuilderFormUI {
    private readonly monsterCreatureStatistics: CreatureStatistic[]
    private readonly monsterCreatureRoadmaps: {
        [key: string]: { [key: string]: string }
    }
    private readonly spellLists: { [key: string]: { name: string } }
    private readonly detectedStats: DetectedStats
    private readonly detectedTraits: string[]
    private readonly detectedSize: string
    private readonly detectedLoreSkills: LoreSkill[]
    private readonly detectedAttacks: DetectedAttack[]
    private readonly detectedSpeeds: SpeedChip[]
    private readonly detectedSenses: SenseDraft[]
    private readonly detectedIwr: ActorIwr
    private readonly actorLevel: string
    private readonly droppedItems: Record<string, unknown>[]
    private readonly root: HTMLElement
    private readonly idPrefix: string
    private readonly preservedControls: Record<string, string> | null
    private loreCounter: number = 0
    private attackCounter: number = 0
    private damageEditor: HTMLElement | null = null
    private damageEditorBadge: HTMLElement | null = null
    private senseCounter: number = 0
    private iwr: ActorIwr = emptyActorIwr()
    private expandedIwrKey: string | null = null
    private iwrRendering = false
    private iwrPointerInRow = false
    private iwrPointerTimer: ReturnType<typeof setTimeout> | undefined
    private iwrCollapseTimer: ReturnType<typeof setTimeout> | undefined
    private iwrLevel = '1'
    private traits: string[] = []
    private selectedDropdownIndex: number = -1

    private readonly loreOptions = [
        'PF2EMONSTERMAKER.none',
        'PF2EMONSTERMAKER.terrible',
        'PF2EMONSTERMAKER.low',
        'PF2EMONSTERMAKER.moderate',
        'PF2EMONSTERMAKER.high',
        'PF2EMONSTERMAKER.extreme',
    ]

    private traitNames(): string[] {
        return getCreatureSystem().traitSuggestions()
    }

    // DOM element references
    private traitsInput!: HTMLElement
    private traitsTagify!: HTMLElement
    private traitsHidden!: HTMLInputElement
    private creatureBuilderTraitsDropdown!: HTMLElement
    private traitsDropdownWrapper!: HTMLElement
    private initTimer: ReturnType<typeof setTimeout> | undefined

    private readonly onDocumentClick = (event: Event) => {
        const target = event.target as Node
        const traitsLabel = this.queryById('creatureBuilderTraitsLabel')
        if (
            !this.traitsTagify.contains(target) &&
            !this.creatureBuilderTraitsDropdown.contains(target) &&
            !traitsLabel?.contains(target)
        ) {
            this.hideDropdown()
        }
        const speedsTray = this.queryById('speedsTray')
        if (speedsTray && !speedsTray.contains(target)) {
            this.hideSpeedMenu()
        }
        const element =
            target instanceof Element ? target : target.parentElement
        if (!element?.closest('.iwr-add, .iwr-editor-block')) {
            this.hideIwrMenus()
        }
        const dieField = this.damageEditor?.querySelector(
            '.damage-editor-die-field',
        )
        if (dieField && !dieField.contains(target)) {
            this.hideDamageDieList()
        }
    }

    private readonly onWindowScroll = () => {
        if (this.creatureBuilderTraitsDropdown.classList.contains('show')) {
            this.positionDropdown()
        }
        if (this.damageEditor && !this.damageEditor.hidden) {
            this.closeDamageEditor()
        }
    }

    private readonly onWindowResize = () => {
        if (this.creatureBuilderTraitsDropdown.classList.contains('show')) {
            this.positionDropdown()
        }
    }

    private readonly onBadgeClick = (event: Event) => {
        const target = event.target
        if (!(target instanceof Element)) return
        const badge = target.closest<HTMLElement>('.stat-value-badge--editable')
        if (!badge || !this.root.contains(badge)) return
        if (badge.querySelector('input')) return
        if (badge.dataset.statBadge === Statistics.strikeDamage) {
            this.openDamageEditor(badge)
            return
        }
        this.beginNumericEdit(badge)
    }

    constructor(config: CreatureBuilderFormConfig) {
        this.monsterCreatureStatistics = config.creatureStatistics
        this.monsterCreatureRoadmaps = config.creatureRoadmaps
        this.spellLists = config.spellLists
        this.detectedStats = config.detectedStats
        this.detectedTraits = config.detectedTraits
        this.detectedSize = config.detectedSize ?? DEFAULT_CREATURE_SIZE
        this.detectedLoreSkills = config.detectedLoreSkills
        this.detectedAttacks = config.detectedAttacks ?? []
        this.detectedSpeeds = config.detectedSpeeds ?? []
        this.detectedSenses = config.detectedSenses ?? []
        this.detectedIwr = cloneActorIwr(config.detectedIwr ?? emptyActorIwr())
        this.actorLevel = String(config.actorLevel)
        this.droppedItems = config.droppedItems ?? []
        this.root = config.root
        this.idPrefix = config.idPrefix
        this.preservedControls = config.preservedControls ?? null
    }

    /**
     * Initialize the form - call this after DOM is ready
     */
    public initialize(): void {
        this.cacheDOMElements()
        this.setupEventListeners()
        this.initializeTraits()
        this.initializeLoreSkills()
        this.initializeMovement()
        this.initializeIwr()
        this.restoreManualAttacks()
        this.initializeAttacks()
        this.initCollapsibleSections()
        this.setupSpellcastingVisibility()
        this.setupDropZone()
        this.setupGenerateAttacksToggle()
        this.setupStatHighlightListeners()
        this.setupStatPreviewListeners()
        this.setupBadgeToggle()
        for (const item of this.droppedItems) {
            this.renderDroppedItem(item)
        }

        this.initTimer = setTimeout(() => {
            this.initTimer = undefined
            this.setDetectedStats()
            this.applyPreservedControls()
            this.updateWeaponAttackBadges()
            this.updateSpellcastingOptionsVisibility()
            this.applyAllStatHighlights()
            this.updateStatPreview()
            this.refreshIwrRangeHints()
        }, 0)
    }

    /**
     * Remove document and window listeners and detach the traits dropdown
     * that was moved onto document.body.
     */
    public destroy(): void {
        if (this.initTimer !== undefined) {
            clearTimeout(this.initTimer)
            this.initTimer = undefined
        }
        if (this.iwrCollapseTimer !== undefined) {
            clearTimeout(this.iwrCollapseTimer)
            this.iwrCollapseTimer = undefined
        }
        this.unbindIwrPointerListeners()

        document.removeEventListener('click', this.onDocumentClick)
        this.root.removeEventListener('click', this.onBadgeClick)
        this.damageEditor?.remove()
        this.damageEditor = null
        this.damageEditorBadge = null
        window.removeEventListener('scroll', this.onWindowScroll, true)
        window.removeEventListener('resize', this.onWindowResize)

        this.creatureBuilderTraitsDropdown?.classList.remove('show')
        this.creatureBuilderTraitsDropdown?.remove()
    }

    /**
     * Cache DOM element references
     */
    private cacheDOMElements(): void {
        this.traitsInput = this.getElement('creatureBuilderTraitsInput')
        this.traitsTagify = this.getElement('traitsTagify')
        this.traitsHidden = this.getElement(
            'creatureBuilderTraitsHidden',
        ) as HTMLInputElement
        this.creatureBuilderTraitsDropdown = this.getElement(
            'creatureBuilderTraitsDropdown',
        )
        this.traitsDropdownWrapper =
            this.creatureBuilderTraitsDropdown.querySelector(
                '.tagify__dropdown__wrapper',
            )!
    }

    /**
     * Setup all event listeners
     */
    private setupEventListeners(): void {
        this.traitsInput.addEventListener('input', () => {
            this.showDropdown(this.getInputText())
        })

        this.traitsInput.addEventListener('keydown', (e) =>
            this.handleTraitsKeydown(e as KeyboardEvent),
        )

        this.traitsTagify.addEventListener('click', (e) => {
            if (
                (e.target as HTMLElement).classList.contains(
                    'tagify__tag__removeBtn',
                )
            ) {
                return
            }
            this.focusTraitsInput()
        })

        this.queryById('creatureBuilderTraitsLabel')?.addEventListener(
            'click',
            () => {
                this.focusTraitsInput()
            },
        )

        document.addEventListener('click', this.onDocumentClick)

        window.addEventListener('scroll', this.onWindowScroll, true)

        window.addEventListener('resize', this.onWindowResize)

        const roadmapSelect = this.queryById<HTMLSelectElement>(
            'creatureBuilderRoadmap',
        )
        roadmapSelect?.addEventListener('change', () => {
            this.setRoadmap(roadmapSelect)
        })
    }

    /**
     * Setup event listeners for spellcasting dropdowns to toggle visibility and defaults
     */
    private setupSpellcastingVisibility(): void {
        const spellcastingSelect = this.queryById(
            'creatureBuilderPF2EMONSTERMAKER.spellcasting',
        ) as HTMLSelectElement
        if (spellcastingSelect) {
            spellcastingSelect.addEventListener('change', () => {
                this.updateSpellcastingOptionsVisibility()
            })
        }

        // Add listener for caster type to auto-update key attribute default
        const casterTypeSelect = this.queryById(
            'creatureBuilderPF2EMONSTERMAKER.spellcastingType',
        ) as HTMLSelectElement
        if (casterTypeSelect) {
            casterTypeSelect.addEventListener('change', () => {
                this.updateKeyAttributeDefault()
            })
        }
    }

    /**
     * Update the key attribute default based on caster type selection
     * Innate/Spontaneous -> Charisma, Prepared -> Intelligence
     */
    private updateKeyAttributeDefault(): void {
        const casterTypeSelect = this.queryById(
            'creatureBuilderPF2EMONSTERMAKER.spellcastingType',
        ) as HTMLSelectElement
        const attributeSelect = this.queryById(
            'creatureBuilderPF2EMONSTERMAKER.spellcastingAttribute',
        ) as HTMLSelectElement

        if (!casterTypeSelect || !attributeSelect) return

        const casterType = casterTypeSelect.value

        // Prepared casters default to Intelligence, others to Charisma
        if (casterType === 'PF2EMONSTERMAKER.casterPrepared') {
            attributeSelect.value = 'PF2EMONSTERMAKER.attrInt'
        } else {
            attributeSelect.value = 'PF2EMONSTERMAKER.attrCha'
        }
    }

    /**
     * Update visibility of spellcasting tradition, type, and attribute options based on spellcasting value
     */
    private updateSpellcastingOptionsVisibility(): void {
        const spellcastingSelect = this.queryById(
            'creatureBuilderPF2EMONSTERMAKER.spellcasting',
        ) as HTMLSelectElement
        const traditionSelect = this.queryById(
            'creatureBuilderPF2EMONSTERMAKER.spellcastingTradition',
        ) as HTMLSelectElement
        const typeSelect = this.queryById(
            'creatureBuilderPF2EMONSTERMAKER.spellcastingType',
        ) as HTMLSelectElement
        const attributeSelect = this.queryById(
            'creatureBuilderPF2EMONSTERMAKER.spellcastingAttribute',
        ) as HTMLSelectElement
        const spellListSelect = this.queryById(
            'creatureBuilderPF2EMONSTERMAKER.spellList',
        ) as HTMLSelectElement

        if (!spellcastingSelect) return

        const isNone = spellcastingSelect.value === 'PF2EMONSTERMAKER.none'

        const findParentRow = (el: HTMLElement | null): HTMLElement | null =>
            (el?.closest('.form-group') as HTMLElement) ??
            (el?.closest('.stat-cell') as HTMLElement) ??
            null

        const traditionRow = findParentRow(traditionSelect)
        const typeRow = findParentRow(typeSelect)
        const attributeRow = findParentRow(attributeSelect)
        const spellListRow =
            (spellListSelect?.closest(
                '[id$="spellListFormGroup"]',
            ) as HTMLElement | null) ?? findParentRow(spellListSelect)

        if (traditionRow) {
            traditionRow.style.display = isNone ? 'none' : 'flex'
        }
        if (typeRow) {
            typeRow.style.display = isNone ? 'none' : 'flex'
        }
        if (attributeRow) {
            attributeRow.style.display = isNone ? 'none' : 'flex'
        }
        if (spellListRow) {
            const hasSpellLists = Object.keys(this.spellLists).length > 0
            spellListRow.style.display =
                isNone || !hasSpellLists ? 'none' : 'flex'
        }
    }

    /**
     * Set defaults for all statistics
     */
    private setDefaults(): void {
        for (const category of this.monsterCreatureStatistics) {
            for (const statistic of category.statisticEntries) {
                const element = this.queryById(
                    `creatureBuilder${statistic.name}`,
                ) as HTMLSelectElement
                if (element) {
                    // Use entry's own default if available, otherwise category default
                    element.value =
                        statistic.defaultValue ?? category.defaultValue
                }
            }
        }
    }

    /**
     * Set detected stats from the actor
     */
    private setDetectedStats(): void {
        this.setDefaults()

        const levelSelect = this.queryById(
            'creatureBuilderLevel',
        ) as HTMLSelectElement
        if (
            levelSelect &&
            this.actorLevel &&
            this.actorLevel !== 'undefined' &&
            this.actorLevel !== 'null'
        ) {
            levelSelect.value = String(this.actorLevel)
        }

        this.applyDetectedSize()

        if (
            this.detectedStats &&
            typeof this.detectedStats === 'object' &&
            Object.keys(this.detectedStats).length > 0
        ) {
            for (const [key, value] of Object.entries(this.detectedStats)) {
                const select = this.queryById(
                    `creatureBuilder${key}`,
                ) as HTMLSelectElement
                if (select) {
                    select.value = value
                }
            }
        }

        this.applyAllStatHighlights()
        this.updateStatPreview()
    }

    private applyDetectedSize(): void {
        const select = this.queryById<HTMLSelectElement>('creatureBuilderSize')
        if (!select) return
        const known = Array.from(select.options).some(
            (option) => option.value === this.detectedSize,
        )
        if (known) select.value = this.detectedSize
    }

    /**
     * Put the dropdown values from the previous render back after detected stats.
     */
    private applyPreservedControls(): void {
        if (!this.preservedControls) return

        for (const [key, value] of Object.entries(this.preservedControls)) {
            if (key === 'creatureBuilderRoadmap') {
                const roadmap = this.queryById<HTMLSelectElement>(
                    'creatureBuilderRoadmap',
                )
                if (roadmap) roadmap.value = value
                continue
            }
            if (key === 'toggleManualInput') {
                const manual =
                    this.queryById<HTMLInputElement>('toggleManualInput')
                if (manual) manual.checked = value === 'true'
                continue
            }
            if (key.startsWith('manualOverride.')) {
                this.restoreManualOverride(key, value)
                continue
            }

            const field = this.root.querySelector<
                HTMLSelectElement | HTMLInputElement
            >(`[name="${key}"]`)
            if (
                field instanceof HTMLInputElement &&
                field.type === 'checkbox'
            ) {
                field.checked = value === 'true'
                continue
            }
            if (field) field.value = value
        }
    }

    /**
     * Apply the selected roadmap to statistics in this window
     */
    public setRoadmap(selectedRoadmap: HTMLSelectElement): void {
        const roadmapValue = selectedRoadmap.value

        if (this.monsterCreatureRoadmaps[roadmapValue]) {
            this.clearAllOverrides()
            this.setDefaults()
            const roadmap = this.monsterCreatureRoadmaps[roadmapValue]

            for (const [key, value] of Object.entries(roadmap)) {
                const select = this.queryById(
                    `creatureBuilder${key}`,
                ) as HTMLSelectElement
                if (select) {
                    select.value = value
                }
            }
        }
        this.updateSpellcastingOptionsVisibility()
        this.applyAllStatHighlights()
        this.updateStatPreview()
    }

    /**
     * Update the hidden traits input field
     */
    private updateTraitsHidden(): void {
        this.traitsHidden.value = this.traits.join(',')
    }

    /**
     * Capitalize first letter of a string
     */
    private capitalizeFirst(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1)
    }

    /**
     * Add a trait to the list
     */
    private addTrait(traitName: string, skipFocus: boolean = false): void {
        const trimmed = traitName.trim().toLowerCase()

        if (trimmed && this.traits.indexOf(trimmed) === -1) {
            this.traits.push(trimmed)
            this.renderTraits()
            this.updateTraitsHidden()
        }

        this.hideDropdown()
        this.traitsInput.textContent = ''

        if (!skipFocus) {
            this.traitsInput.focus()
        }
    }

    /**
     * Remove a trait from the list
     */
    private removeTrait(traitToRemove: string): void {
        const index = this.traits.indexOf(traitToRemove)

        if (index > -1) {
            this.traits.splice(index, 1)
            this.renderTraits()
            this.updateTraitsHidden()
        }
    }

    /**
     * Render all trait tags
     */
    private renderTraits(): void {
        const existingTags = this.traitsTagify.querySelectorAll('tag')
        existingTags.forEach((tag) => {
            tag.remove()
        })

        for (const trait of this.traits) {
            const tag = document.createElement('tag')
            tag.className = 'tagify__tag tagify--noAnim'
            tag.setAttribute('contenteditable', 'false')
            tag.setAttribute('spellcheck', 'false')
            tag.setAttribute('tabindex', '-1')
            tag.setAttribute('value', this.capitalizeFirst(trait))
            tag.setAttribute('data-trait', trait)

            const removeBtn = document.createElement('x')
            removeBtn.className = 'tagify__tag__removeBtn'
            removeBtn.setAttribute('role', 'button')
            removeBtn.setAttribute('aria-label', 'remove tag')

            const textDiv = document.createElement('div')
            const textSpan = document.createElement('span')
            textSpan.className = 'tagify__tag-text'
            textSpan.textContent = this.capitalizeFirst(trait)
            textDiv.appendChild(textSpan)

            tag.appendChild(removeBtn)
            tag.appendChild(textDiv)

            this.traitsTagify.insertBefore(tag, this.traitsInput)
        }

        const removeButtons = this.traitsTagify.querySelectorAll(
            '.tagify__tag__removeBtn',
        )
        removeButtons.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation()
                const tag = (e.target as HTMLElement).parentElement!
                const traitToRemove = tag.getAttribute('data-trait')!
                this.removeTrait(traitToRemove)
            })
        })
    }

    /**
     * Focus the traits field and open its suggestion list.
     * The field is a contenteditable span, which a label cannot target.
     */
    private focusTraitsInput(): void {
        this.traitsInput.focus()
        this.showDropdown(this.getInputText())
    }

    /**
     * Position the dropdown relative to the tagify container
     */
    private positionDropdown(): void {
        // Move dropdown to document body for proper fixed positioning
        if (
            this.creatureBuilderTraitsDropdown.parentElement !== document.body
        ) {
            document.body.appendChild(this.creatureBuilderTraitsDropdown)
        }

        const rect = this.traitsTagify.getBoundingClientRect()

        this.creatureBuilderTraitsDropdown.style.left = `${rect.left}px`
        this.creatureBuilderTraitsDropdown.style.top = `${rect.bottom}px`
        this.creatureBuilderTraitsDropdown.style.width = `${rect.width}px`
    }

    /**
     * Show the dropdown with filtered options
     */
    private showDropdown(filter: string): void {
        const filterLower = (filter || '').toLowerCase().trim()
        const filtered = this.traitNames().filter(
            (t) =>
                t.indexOf(filterLower) !== -1 && this.traits.indexOf(t) === -1,
        )

        // Clear existing items from wrapper (keep header)
        const existingItems = this.traitsDropdownWrapper.querySelectorAll(
            '.tagify__dropdown__item',
        )
        existingItems.forEach((item) => {
            item.remove()
        })
        this.selectedDropdownIndex = -1

        let itemCount = 0

        // If user typed something not in the list, offer to add it
        if (
            filterLower &&
            this.traitNames().indexOf(filterLower) === -1 &&
            this.traits.indexOf(filterLower) === -1
        ) {
            const customItem = this.createDropdownItem(
                filterLower,
                `(Add "${filterLower}")`,
                true,
            )
            this.traitsDropdownWrapper.appendChild(customItem)
            itemCount++
        }

        // Show matching traits (limit to 15 for performance)
        let shown = 0
        for (const traitName of filtered) {
            if (shown >= 15) break

            const displayName = this.capitalizeFirst(traitName)
            const item = this.createDropdownItem(traitName, displayName, false)
            this.traitsDropdownWrapper.appendChild(item)
            shown++
            itemCount++
        }

        if (itemCount > 0) {
            this.positionDropdown()
            this.creatureBuilderTraitsDropdown.classList.add('show')
        } else {
            this.hideDropdown()
        }
    }

    /**
     * Create a dropdown item element
     */
    private createDropdownItem(
        traitName: string,
        displayText: string,
        isCustom: boolean,
    ): HTMLElement {
        const item = document.createElement('div')
        item.className = isCustom
            ? 'tagify__dropdown__item customEntry'
            : 'tagify__dropdown__item'
        const itemId = isCustom
            ? `custom-${traitName}`
            : traitName.replace(/\s+/g, '-')
        item.id = this.elementId(itemId)
        item.setAttribute('value', displayText)
        item.setAttribute('mappedvalue', displayText)
        item.setAttribute('data-trait', traitName)
        item.setAttribute('tabindex', '0')
        item.setAttribute('role', 'option')
        item.textContent = displayText

        item.addEventListener('click', () => {
            this.addTrait(traitName)
        })

        return item
    }

    /**
     * Hide the dropdown
     */
    private hideDropdown(): void {
        this.creatureBuilderTraitsDropdown.classList.remove('show')
        this.selectedDropdownIndex = -1
    }

    /**
     * Update the dropdown selection highlight
     */
    private updateDropdownSelection(): void {
        const items = this.traitsDropdownWrapper.querySelectorAll(
            '.tagify__dropdown__item',
        )

        items.forEach((item, index) => {
            if (index === this.selectedDropdownIndex) {
                item.classList.add('tagify__dropdown__item--active')
                item.scrollIntoView({ block: 'nearest' })
            } else {
                item.classList.remove('tagify__dropdown__item--active')
            }
        })
    }

    /**
     * Get the current input text
     */
    private getInputText(): string {
        return this.traitsInput.textContent || ''
    }

    /**
     * Handle keydown events on traits input
     */
    private handleTraitsKeydown(e: KeyboardEvent): void {
        const items = this.traitsDropdownWrapper.querySelectorAll(
            '.tagify__dropdown__item',
        )
        const inputText = this.getInputText()

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                if (
                    this.creatureBuilderTraitsDropdown.classList.contains(
                        'show',
                    )
                ) {
                    this.selectedDropdownIndex = Math.min(
                        this.selectedDropdownIndex + 1,
                        items.length - 1,
                    )
                    this.updateDropdownSelection()
                } else {
                    this.showDropdown(inputText)
                }
                break

            case 'ArrowUp':
                e.preventDefault()
                if (
                    this.creatureBuilderTraitsDropdown.classList.contains(
                        'show',
                    )
                ) {
                    this.selectedDropdownIndex = Math.max(
                        this.selectedDropdownIndex - 1,
                        0,
                    )
                    this.updateDropdownSelection()
                }
                break

            case 'Enter':
                e.preventDefault()
                if (
                    this.selectedDropdownIndex >= 0 &&
                    items[this.selectedDropdownIndex]
                ) {
                    const selectedItem = items[
                        this.selectedDropdownIndex
                    ] as HTMLElement
                    this.addTrait(selectedItem.getAttribute('data-trait')!)
                } else if (inputText.trim()) {
                    this.addTrait(inputText)
                }
                break

            case 'Escape':
                this.hideDropdown()
                break

            case 'Backspace':
                if (inputText === '' && this.traits.length > 0) {
                    e.preventDefault()
                    this.traits.pop()
                    this.renderTraits()
                    this.updateTraitsHidden()
                }
                break
        }
    }

    /**
     * Initialize traits from detected traits
     */
    private initializeTraits(): void {
        if (this.detectedTraits && this.detectedTraits.length > 0) {
            for (const trait of this.detectedTraits) {
                this.addTrait(trait, true)
            }
        }
    }

    /**
     * Add a lore skill entry
     */
    public addLoreSkill(name: string = '', level: string = ''): void {
        const container = this.getElement('loreSkillsContainer')
        const loreId = this.loreCounter++

        const loreDiv = document.createElement('div')
        loreDiv.className = 'form-group loreEntry'
        loreDiv.id = this.elementId(`loreEntry${loreId}`)

        const nameInput = document.createElement('input')
        nameInput.type = 'text'
        nameInput.name = `loreName${loreId}`
        nameInput.value = name || ''
        nameInput.placeholder =
            (window as any).game?.i18n?.localize('PF2EMONSTERMAKER.loreName') ||
            'Lore Name'
        nameInput.className = 'loreNameInput'

        const levelSelect = document.createElement('select')
        levelSelect.name = `loreLevel${loreId}`
        for (const option of this.loreOptions) {
            const opt = document.createElement('option')
            opt.value = option
            opt.textContent =
                (window as any).game?.i18n?.localize(option) || option

            if (
                (level && option === level) ||
                (!level && option === 'PF2EMONSTERMAKER.moderate')
            ) {
                opt.selected = true
            }

            levelSelect.appendChild(opt)
        }

        const removeIcon = document.createElement('span')
        removeIcon.className =
            'creatureBuilderRemoveIcon fa-solid fa-fw fa-trash'
        removeIcon.addEventListener('click', () => {
            container.removeChild(loreDiv)
        })

        const badge = document.createElement('span')
        badge.className = 'stat-value-badge'
        badge.dataset.statBadge = Statistics.acrobatics
        badge.dataset.overrideField = `loreLevel${loreId}`
        badge.textContent = '--'

        loreDiv.appendChild(nameInput)
        loreDiv.appendChild(levelSelect)
        loreDiv.appendChild(badge)
        loreDiv.appendChild(removeIcon)
        container.appendChild(loreDiv)
        this.bindManualSelect(levelSelect)
        this.updateStatPreview()
    }

    /**
     * Add a manual attack entry
     */
    public addAttack(
        name: string = '',
        bonus: string = '',
        damage: string = '',
        attackId?: number,
        damageType: string = '',
        source: string = '',
    ): void {
        const container = this.queryById('manualAttacksContainer')
        if (!container) return

        const id = attackId ?? this.attackCounter
        this.attackCounter = Math.max(this.attackCounter, id + 1)

        const attackDiv = document.createElement('div')
        attackDiv.className = 'form-group attackEntry'
        attackDiv.id = this.elementId(`attackEntry${id}`)

        const nameInput = document.createElement('input')
        nameInput.type = 'text'
        nameInput.name = `attackName${id}`
        nameInput.value = name || ''
        nameInput.placeholder =
            (window as any).game?.i18n?.localize(
                'pf2e-creature-builder.form.strikes.attack-name',
            ) || 'Attack name'
        nameInput.className = 'attackNameInput'

        const damageTypeInput = document.createElement('input')
        damageTypeInput.type = 'hidden'
        damageTypeInput.name = `attackDamageType${id}`
        damageTypeInput.value = damageType || ''

        const sourceInput = document.createElement('input')
        sourceInput.type = 'hidden'
        sourceInput.name = `attackSource${id}`
        sourceInput.value = source || ''

        const removeIcon = document.createElement('span')
        removeIcon.className =
            'creatureBuilderRemoveIcon fa-solid fa-fw fa-trash'
        removeIcon.addEventListener('click', () => {
            container.removeChild(attackDiv)
        })

        attackDiv.appendChild(nameInput)
        attackDiv.appendChild(damageTypeInput)
        attackDiv.appendChild(sourceInput)
        this.appendStrikeSelect(
            attackDiv,
            `attackBonus${id}`,
            bonus || this.currentStrikeOption('PF2EMONSTERMAKER.strikeBonus'),
        )
        this.appendStrikeSelect(
            attackDiv,
            `attackDamage${id}`,
            damage || this.currentStrikeOption('PF2EMONSTERMAKER.strikeDamage'),
        )
        attackDiv.appendChild(removeIcon)
        container.appendChild(attackDiv)
        this.updateStatPreview()
    }

    private appendStrikeSelect(
        parent: HTMLElement,
        name: string,
        selected: string,
    ): void {
        const select = document.createElement('select')
        select.name = name
        select.className = 'stat-select'
        for (const option of this.strikeChoices()) {
            const opt = document.createElement('option')
            opt.value = option
            opt.textContent =
                (window as any).game?.i18n?.localize(option) || option
            if (option === selected) opt.selected = true
            select.appendChild(opt)
        }
        const stat = name.startsWith('attackDamage')
            ? Statistics.strikeDamage
            : Statistics.strikeBonus
        const badge = document.createElement('span')
        badge.className = 'stat-value-badge'
        badge.dataset.statBadge = stat
        badge.dataset.overrideField = name
        badge.textContent = '--'
        parent.append(select, badge)
        this.bindManualSelect(select)
    }

    private strikeChoices(): string[] {
        const strikes = this.monsterCreatureStatistics.find(
            (category) => category.name === 'PF2EMONSTERMAKER.strikes',
        )
        if (strikes?.availableOptions?.length) return strikes.availableOptions
        return [
            'PF2EMONSTERMAKER.low',
            'PF2EMONSTERMAKER.moderate',
            'PF2EMONSTERMAKER.high',
            'PF2EMONSTERMAKER.extreme',
        ]
    }

    private currentStrikeOption(statisticName: string): string {
        const select = this.queryById<HTMLSelectElement>(
            `creatureBuilder${statisticName}`,
        )
        return select?.value || 'PF2EMONSTERMAKER.moderate'
    }

    private restoreManualAttacks(): void {
        if (!this.preservedControls) return
        if (!this.queryById('manualAttacksContainer')) return

        const ids = Object.keys(this.preservedControls)
            .filter((key) => key.startsWith('attackName'))
            .map((key) => key.slice('attackName'.length))
            .sort((a, b) => Number(a) - Number(b))

        for (const id of ids) {
            const numericId = Number(id)
            this.addAttack(
                this.preservedControls[`attackName${id}`] ?? '',
                this.preservedControls[`attackBonus${id}`] ?? '',
                this.preservedControls[`attackDamage${id}`] ?? '',
                Number.isInteger(numericId) ? numericId : undefined,
                this.preservedControls[`attackDamageType${id}`] ?? '',
                this.preservedControls[`attackSource${id}`] ?? '',
            )
        }
    }

    /**
     * Show strikes copied from the creature the form was opened on.
     */
    private initializeAttacks(): void {
        if (!this.queryById('manualAttacksContainer')) return
        const restored = this.preservedControls
            ? this.preservedControls[MANUAL_ATTACKS_PRESENT] === 'true' ||
              Object.keys(this.preservedControls).some((key) =>
                  key.startsWith('attackName'),
              )
            : false
        if (restored) return
        for (const attack of this.detectedAttacks) {
            this.addAttack(
                attack.name,
                attack.bonus,
                attack.damage,
                undefined,
                attack.damageType ?? '',
                attack.source ?? '',
            )
        }
    }

    /**
     * Initialize lore skills from detected lore skills
     */
    private initializeLoreSkills(): void {
        if (this.detectedLoreSkills && this.detectedLoreSkills.length > 0) {
            for (const loreSkill of this.detectedLoreSkills) {
                this.addLoreSkill(loreSkill.name, loreSkill.level)
            }
        }
    }

    /**
     * Speeds and senses are filled from the actor, then from preserved edits.
     */
    private initializeMovement(): void {
        if (
            !this.queryById('speedChips') &&
            !this.queryById('sensesContainer')
        ) {
            return
        }
        const preservedSpeeds = speedsFromControls(this.preservedControls)
        const speeds =
            preservedSpeeds ??
            (this.detectedSpeeds.length > 0
                ? this.detectedSpeeds
                : [{ type: 'land' as const, value: DEFAULT_LAND_SPEED }])
        this.queryById('addSpeedButton')?.addEventListener('click', () => {
            this.toggleSpeedMenu()
        })
        this.queryById('addSenseButton')?.addEventListener('click', () => {
            this.addSense()
        })
        this.renderSpeeds(speeds)
        const preservedSenses = sensesFromControls(this.preservedControls)
        this.renderSenses(preservedSenses ?? this.detectedSenses)
    }

    private renderSpeeds(chips: SpeedChip[]): void {
        const container = this.queryById('speedChips')
        if (!container) return
        container.replaceChildren()
        const unique = chips.filter(
            (chip, index) =>
                chips.findIndex((other) => other.type === chip.type) === index,
        )
        const list =
            unique.length > 0
                ? unique
                : [{ type: 'land' as const, value: DEFAULT_LAND_SPEED }]
        for (const chip of list) {
            this.addSpeedChip(chip.type, chip.value)
        }
        this.updateAddSpeedButton()
    }

    private renderSenses(senses: SenseDraft[]): void {
        const container = this.queryById('sensesContainer')
        if (!container) return
        container.replaceChildren()
        this.senseCounter = 0
        for (const sense of senses) {
            this.addSense(sense)
        }
    }

    private addSpeedChip(
        type: MovementType,
        value: number,
        focus = false,
    ): void {
        const container = this.queryById('speedChips')
        if (
            !container ||
            container.querySelector(`[data-speed-type="${type}"]`)
        ) {
            return
        }

        const chip = document.createElement('div')
        chip.className = 'speed-chip'
        chip.dataset.speedType = type

        const label = document.createElement('span')
        label.className = 'speed-chip-label'
        label.textContent = speedLabel(type)

        const number = document.createElement('input')
        number.type = 'number'
        number.name = `speedValue-${type}`
        number.className = 'speed-chip-value'
        number.min = '0'
        number.step = '1'
        number.value = String(value)
        number.setAttribute('aria-label', speedLabel(type))

        const hidden = document.createElement('input')
        hidden.type = 'hidden'
        hidden.name = `speedType-${type}`
        hidden.value = type

        const remove = document.createElement('button')
        remove.type = 'button'
        remove.className = 'speed-chip-remove'
        remove.textContent = '×'
        remove.setAttribute(
            'aria-label',
            this.movementText(
                'pf2e-creature-builder.form.movement.remove-speed',
                'Remove speed',
            ),
        )
        remove.addEventListener('click', () => this.removeSpeedChip(chip))

        chip.append(label, number, hidden, remove)
        container.append(chip)
        this.updateAddSpeedButton()
        if (focus) number.focus()
    }

    private removeSpeedChip(chip: HTMLElement): void {
        const container = this.queryById('speedChips')
        if (!container) return
        if (container.querySelectorAll('.speed-chip').length <= 1) {
            this.warnSpeedRequired()
            return
        }
        chip.remove()
        this.updateAddSpeedButton()
    }

    private warnSpeedRequired(): void {
        const message = this.movementText(
            'pf2e-creature-builder.form.movement.speed-required',
            'A creature needs at least one speed.',
        )
        const notifications = (
            globalThis as {
                ui?: { notifications?: { warn?: (message: string) => void } }
            }
        ).ui?.notifications
        notifications?.warn?.(message)
    }

    private movementText(key: string, fallback: string): string {
        const i18n = (
            window as {
                game?: { i18n?: { localize?: (key: string) => string } }
            }
        ).game?.i18n
        if (!i18n?.localize) return fallback
        let localized: string
        try {
            localized = i18n.localize(key)
        } catch {
            return fallback
        }
        if (!localized || localized === key) return fallback
        return localized
    }

    private toggleSpeedMenu(): void {
        const menu = this.queryById('speedTypeMenu')
        if (!menu) return
        if (!menu.hidden) {
            this.hideSpeedMenu()
            return
        }
        this.populateSpeedMenu(menu)
        if (menu.childElementCount === 0) return
        menu.hidden = false
    }

    private hideSpeedMenu(): void {
        const menu = this.queryById('speedTypeMenu')
        if (menu) menu.hidden = true
    }

    private populateSpeedMenu(menu: HTMLElement): void {
        menu.replaceChildren()
        for (const type of this.availableSpeedTypes()) {
            const option = document.createElement('button')
            option.type = 'button'
            option.className = 'speed-type-option'
            option.dataset.speedType = type
            option.textContent = speedLabel(type)
            option.addEventListener('click', () => {
                this.addSpeedChip(type, DEFAULT_LAND_SPEED, true)
                this.hideSpeedMenu()
            })
            menu.append(option)
        }
    }

    private availableSpeedTypes(): MovementType[] {
        const chips =
            this.queryById('speedChips')?.querySelectorAll('.speed-chip')
        const used = new Set(
            Array.from(chips ?? []).flatMap((chip) => {
                const type = (chip as HTMLElement).dataset.speedType ?? ''
                return isMovementType(type) ? [type] : []
            }),
        )
        return SPEED_MENU_ORDER.filter((type) => !used.has(type))
    }

    private updateAddSpeedButton(): void {
        const button = this.queryById<HTMLButtonElement>('addSpeedButton')
        if (!button) return
        button.disabled = this.availableSpeedTypes().length === 0
    }

    /**
     * Add a sense row. Range and acuity appear only for senses that use them.
     */
    public addSense(initial?: SenseDraft): void {
        const container = this.queryById('sensesContainer')
        if (!container) return
        const used = this.senseTypeCounts()
        const choices = senseChoices()
        const type =
            initial?.type && this.senseTypeAvailable(initial.type, used)
                ? initial.type
                : choices.find((choice) =>
                      this.senseTypeAvailable(choice.slug, used),
                  )?.slug
        if (!type) return

        const id = this.senseCounter++
        const row = document.createElement('div')
        row.className = 'sense-entry'
        row.dataset.senseId = String(id)

        const select = document.createElement('select')
        select.name = `senseType${id}`
        select.className = 'stat-select sense-type'
        select.setAttribute(
            'aria-label',
            this.movementText(
                'pf2e-creature-builder.form.movement.sense-name',
                'Sense',
            ),
        )
        select.addEventListener('change', () => {
            this.syncSenseFields(row)
            this.refreshSenseOptions()
        })

        const removeLabel = this.movementText(
            'pf2e-creature-builder.form.movement.remove-sense',
            'Remove sense',
        )
        const remove = document.createElement('span')
        remove.className = 'creatureBuilderRemoveIcon fa-solid fa-fw fa-trash'
        remove.title = removeLabel
        remove.addEventListener('click', () => {
            row.remove()
            this.refreshSenseOptions()
        })

        row.append(select, remove)
        container.append(row)
        this.refreshSenseOptions()
        this.selectSenseType(select, type)
        this.syncSenseFields(row, initial)
        this.refreshSenseOptions()
    }

    private selectSenseType(select: HTMLSelectElement, type: string): void {
        select.value = type
        if (select.value === type) return
        const option = document.createElement('option')
        option.value = type
        option.textContent = type
        select.append(option)
        select.value = type
    }

    private senseTypeCounts(): Map<string, number> {
        const counts = new Map<string, number>()
        const selects =
            this.queryById('sensesContainer')?.querySelectorAll('.sense-type')
        for (const select of Array.from(selects ?? [])) {
            const type = (select as HTMLSelectElement).value
            if (!type) continue
            counts.set(type, (counts.get(type) ?? 0) + 1)
        }
        return counts
    }

    private senseTypeAvailable(
        type: string,
        counts: Map<string, number>,
    ): boolean {
        return (counts.get(type) ?? 0) < senseCopyLimit(type)
    }

    private refreshSenseOptions(): void {
        const rows = Array.from(
            this.queryById('sensesContainer')?.querySelectorAll(
                '.sense-entry',
            ) ?? [],
        ) as HTMLElement[]
        const selected = rows.map(
            (row) =>
                (row.querySelector('.sense-type') as HTMLSelectElement | null)
                    ?.value ?? '',
        )
        const choices = senseChoices()
        for (const [index, row] of rows.entries()) {
            const select = row.querySelector(
                '.sense-type',
            ) as HTMLSelectElement | null
            if (!select) continue
            const current = selected[index] ?? ''
            select.replaceChildren()
            for (const choice of choices) {
                const total = selected.filter(
                    (value) => value === choice.slug,
                ).length
                const usedElsewhere =
                    choice.slug === current ? total - 1 : total
                if (usedElsewhere >= senseCopyLimit(choice.slug)) continue
                const option = document.createElement('option')
                option.value = choice.slug
                option.textContent = choice.label
                select.append(option)
            }
            if (current && !choices.some((choice) => choice.slug === current)) {
                const option = document.createElement('option')
                option.value = current
                option.textContent = current
                select.append(option)
            }
            if (current) select.value = current
        }
        const add = this.queryById<HTMLButtonElement>('addSenseButton')
        if (!add) return
        const counts = new Map<string, number>()
        for (const type of selected) {
            if (!type) continue
            counts.set(type, (counts.get(type) ?? 0) + 1)
        }
        add.disabled = choices.every(
            (choice) => !this.senseTypeAvailable(choice.slug, counts),
        )
    }

    private syncSenseFields(row: HTMLElement, initial?: SenseDraft): void {
        const type =
            row.querySelector<HTMLSelectElement>('.sense-type')?.value ?? ''
        const id = row.dataset.senseId ?? '0'
        const remove = row.querySelector('.creatureBuilderRemoveIcon')
        const acuity = row.querySelector('.sense-acuity')
        if (mandatoryAcuity(type)) {
            acuity?.remove()
        } else if (!acuity) {
            this.insertSenseAcuity(row, id, remove, initial?.acuity)
        }

        const rangeField = row.querySelector('.sense-range-field')
        if (senseHasRange(type)) {
            if (!rangeField) this.insertSenseRange(row, id, remove, initial)
        } else {
            rangeField?.remove()
        }

        const range = row.querySelector('.sense-range-field')
        const removeIcon = row.querySelector('.creatureBuilderRemoveIcon')
        if (range && removeIcon) row.insertBefore(range, removeIcon)
        else if (range) row.append(range)
    }

    private insertSenseRange(
        row: HTMLElement,
        id: string,
        remove: Element | null,
        initial?: SenseDraft,
    ): void {
        const field = document.createElement('label')
        field.className = 'sense-range-field'
        const input = document.createElement('input')
        input.type = 'number'
        input.name = `senseRange${id}`
        input.min = '1'
        input.step = '1'
        input.value = String(initial?.range ?? DEFAULT_SENSE_RANGE)
        input.setAttribute(
            'aria-label',
            this.movementText(
                'pf2e-creature-builder.form.movement.sense-range',
                'Sense range',
            ),
        )
        const unit = document.createElement('span')
        unit.textContent = 'ft'
        field.append(input, unit)
        if (remove) row.insertBefore(field, remove)
        else row.append(field)
    }

    private insertSenseAcuity(
        row: HTMLElement,
        id: string,
        remove: Element | null,
        acuity?: SenseAcuity,
    ): void {
        const select = document.createElement('select')
        select.name = `senseAcuity${id}`
        select.className = 'stat-select sense-acuity'
        select.setAttribute(
            'aria-label',
            this.movementText(
                'pf2e-creature-builder.form.movement.sense-acuity',
                'Sense acuity',
            ),
        )
        for (const choice of SENSE_ACUITIES) {
            const option = document.createElement('option')
            option.value = choice
            option.textContent = acuityLabel(choice)
            select.append(option)
        }
        select.value = acuity ?? 'imprecise'
        if (remove) row.insertBefore(select, remove)
        else row.append(select)
    }

    /**
     * Reset form to defaults
     */
    public resetToDefaults(): void {
        this.clearAllOverrides()
        this.closeDamageEditor()
        this.setDefaults()

        const levelSelect = this.queryById(
            'creatureBuilderLevel',
        ) as HTMLSelectElement
        if (levelSelect) levelSelect.value = '-1'

        const sizeSelect = this.queryById(
            'creatureBuilderSize',
        ) as HTMLSelectElement | null
        if (sizeSelect) sizeSelect.value = DEFAULT_CREATURE_SIZE

        const roadmapSelect = this.queryById(
            'creatureBuilderRoadmap',
        ) as HTMLSelectElement
        if (roadmapSelect) roadmapSelect.value = 'Default'

        const spellListSelect = this.queryById(
            'creatureBuilderPF2EMONSTERMAKER.spellList',
        ) as HTMLSelectElement
        if (spellListSelect) spellListSelect.value = 'none'

        this.traits.length = 0
        this.renderTraits()
        this.updateTraitsHidden()

        const loreContainer = this.getElement('loreSkillsContainer')
        loreContainer.querySelectorAll('.loreEntry').forEach((entry) => {
            entry.remove()
        })
        this.loreCounter = 0

        this.queryById('manualAttacksContainer')
            ?.querySelectorAll('.attackEntry')
            .forEach((entry) => {
                entry.remove()
            })
        this.attackCounter = 0

        this.renderSpeeds([{ type: 'land', value: DEFAULT_LAND_SPEED }])
        this.renderSenses([])
        this.hideSpeedMenu()
        this.iwr = emptyActorIwr()
        this.expandedIwrKey = null
        this.renderIwr()
        this.queryById<HTMLDetailsElement>('sectionIwr')?.removeAttribute(
            'open',
        )

        this.updateSpellcastingOptionsVisibility()
        this.clearDroppedItems()
        this.applyAllStatHighlights()
        this.updateStatPreview()
    }

    /**
     * Initialize collapsible sections (collapse Skills and Lore Skills by default)
     */
    private initCollapsibleSections(): void {
        const sections = this.root.querySelectorAll(
            'details.collapsibleSection',
        )

        sections.forEach((section) => {
            const sectionName = section.getAttribute('data-section-name')
            const sectionId = section.getAttribute('id')

            const isSkillsSection =
                sectionName &&
                (sectionName.toLowerCase().indexOf('skill') !== -1 ||
                    sectionName === 'PF2EMONSTERMAKER.skills')
            const isLoreSection = sectionId?.endsWith('sectionLore') ?? false

            if (isSkillsSection || isLoreSection) {
                section.removeAttribute('open')
            }
        })
    }

    /**
     * Get a DOM element by ID with error handling
     */
    private elementId(id: string): string {
        return `${this.idPrefix}${id}`
    }

    private queryById<T extends HTMLElement = HTMLElement>(
        id: string,
    ): T | null {
        return this.root.querySelector<T>(`#${CSS.escape(this.elementId(id))}`)
    }

    private getElement<T extends HTMLElement = HTMLElement>(id: string): T {
        const element = this.queryById<T>(id)
        if (!element) {
            throw new Error(`Element with id '${this.elementId(id)}' not found`)
        }
        return element
    }

    // ========================================================================
    // Drop Zone
    // ========================================================================

    private setupDropZone(): void {
        const dropZone = this.queryById('creatureBuilderDropZone')
        if (!dropZone) return

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault()
            dropZone.classList.add('drag-over')
        })

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over')
        })

        dropZone.addEventListener('drop', () => {
            dropZone.classList.remove('drag-over')
        })
    }

    public renderDroppedItem(itemData: Record<string, unknown>): void {
        const list = this.queryById('droppedItemsList')
        const hint = this.queryById('dropZoneHint')
        if (!list) return

        const index = this.droppedItems.indexOf(itemData)

        const row = document.createElement('div')
        row.className = 'dropped-item-row'
        row.setAttribute('data-drop-index', String(index))
        row.dataset.itemType =
            typeof itemData.type === 'string' ? itemData.type : ''

        const img = document.createElement('img')
        img.className = 'dropped-item-img'
        img.src = (itemData.img as string) || 'icons/svg/item-bag.svg'
        img.alt = ''

        const name = document.createElement('span')
        name.className = 'dropped-item-name'
        name.textContent = (itemData.name as string) || 'Unknown Item'

        const typeBadge = document.createElement('span')
        typeBadge.className = 'dropped-item-type'
        typeBadge.textContent = (itemData.type as string) || ''

        const removeBtn = document.createElement('i')
        removeBtn.className = 'dropped-item-remove fas fa-times'
        removeBtn.title = 'Remove item'
        removeBtn.addEventListener('click', () => {
            const idx = this.droppedItems.indexOf(itemData)
            if (idx > -1) {
                this.droppedItems.splice(idx, 1)
            }
            row.remove()
            if (hint && list.children.length === 0) {
                hint.classList.remove('hidden')
            }
        })

        row.appendChild(img)
        row.appendChild(name)
        row.appendChild(typeBadge)
        row.appendChild(removeBtn)
        list.appendChild(row)

        if (hint) {
            hint.classList.add('hidden')
        }
        this.updateWeaponAttackBadges()
    }

    private setupGenerateAttacksToggle(): void {
        this.generateAttacksCheckbox()?.addEventListener('change', () => {
            this.updateWeaponAttackBadges()
        })
    }

    private generateAttacksCheckbox(): HTMLInputElement | null {
        return this.queryById<HTMLInputElement>('generateAttacksFromWeapons')
    }

    private strikeBadgeLabel(): string {
        const i18n = (
            globalThis as {
                game?: { i18n?: { localize?: (key: string) => string } }
            }
        ).game?.i18n
        if (!i18n?.localize) return 'Strike'
        try {
            return i18n.localize('PF2EMONSTERMAKER.strike') || 'Strike'
        } catch {
            return 'Strike'
        }
    }

    private updateWeaponAttackBadges(): void {
        const show = this.generateAttacksCheckbox()?.checked ?? false
        for (const row of Array.from(
            this.root.querySelectorAll<HTMLElement>('.dropped-item-row'),
        )) {
            const badge = row.querySelector('.dropped-item-attack')
            if (row.dataset.itemType === 'weapon' && show) {
                if (!badge) {
                    const marker = document.createElement('span')
                    marker.className = 'dropped-item-attack'
                    marker.textContent = this.strikeBadgeLabel()
                    const remove = row.querySelector('.dropped-item-remove')
                    if (remove) row.insertBefore(marker, remove)
                    else row.appendChild(marker)
                }
            } else if (badge) {
                badge.remove()
            }
        }
    }

    private clearDroppedItems(): void {
        this.droppedItems.length = 0
        const list = this.queryById('droppedItemsList')
        if (list) {
            list.innerHTML = ''
        }
        const hint = this.queryById('dropZoneHint')
        if (hint) {
            hint.classList.remove('hidden')
        }
    }

    // ========================================================================
    // Stat Color Highlights
    // ========================================================================

    private static readonly STAT_LEVEL_CLASSES = [
        'stat-level-extreme',
        'stat-level-high',
        'stat-level-moderate',
        'stat-level-low',
        'stat-level-terrible',
        'stat-level-abysmal',
        'stat-level-none',
    ] as const

    private static readonly OPTION_TO_CLASS: Record<string, string> = {
        'PF2EMONSTERMAKER.extreme': 'stat-level-extreme',
        'PF2EMONSTERMAKER.high': 'stat-level-high',
        'PF2EMONSTERMAKER.moderate': 'stat-level-moderate',
        'PF2EMONSTERMAKER.low': 'stat-level-low',
        'PF2EMONSTERMAKER.terrible': 'stat-level-terrible',
        'PF2EMONSTERMAKER.abysmal': 'stat-level-abysmal',
        'PF2EMONSTERMAKER.none': 'stat-level-none',
    }

    private applyStatHighlight(selectElement: HTMLSelectElement): void {
        for (const cls of CreatureBuilderFormUI.STAT_LEVEL_CLASSES) {
            selectElement.classList.remove(cls)
        }
        const cssClass =
            CreatureBuilderFormUI.OPTION_TO_CLASS[selectElement.value]
        if (cssClass) {
            selectElement.classList.add(cssClass)
        }
    }

    private applyAllStatHighlights(): void {
        for (const category of this.monsterCreatureStatistics) {
            for (const stat of category.statisticEntries) {
                const select = this.queryById(
                    `creatureBuilder${stat.name}`,
                ) as HTMLSelectElement
                if (select) {
                    this.applyStatHighlight(select)
                }
            }
        }
    }

    private setupStatHighlightListeners(): void {
        for (const category of this.monsterCreatureStatistics) {
            for (const stat of category.statisticEntries) {
                const select = this.queryById(
                    `creatureBuilder${stat.name}`,
                ) as HTMLSelectElement
                if (select) {
                    select.addEventListener('change', () => {
                        this.applyStatHighlight(select)
                    })
                }
            }
        }
    }

    // ========================================================================
    // Live Stat Preview Bar
    // ========================================================================

    private static readonly PREVIEW_STATS: {
        key: string
        labelKey: string
        prefix: string
        icon: string
        offset?: number
    }[] = [
        {
            key: 'PF2EMONSTERMAKER.hp',
            labelKey: 'PF2EMONSTERMAKER.hpShort',
            prefix: '',
            icon: 'fa-heart',
        },
        {
            key: 'PF2EMONSTERMAKER.ac',
            labelKey: 'PF2EMONSTERMAKER.acShort',
            prefix: '',
            icon: 'fa-shield-alt',
        },
        {
            key: 'PF2EMONSTERMAKER.per',
            labelKey: 'PF2EMONSTERMAKER.perShort',
            prefix: '+',
            icon: 'fa-eye',
        },
        {
            key: 'PF2EMONSTERMAKER.fort',
            labelKey: 'PF2EMONSTERMAKER.fortShort',
            prefix: '+',
            icon: 'fa-chess-rook',
        },
        {
            key: 'PF2EMONSTERMAKER.ref',
            labelKey: 'PF2EMONSTERMAKER.refShort',
            prefix: '+',
            icon: 'fa-running',
        },
        {
            key: 'PF2EMONSTERMAKER.wil',
            labelKey: 'PF2EMONSTERMAKER.wilShort',
            prefix: '+',
            icon: 'fa-brain',
        },
        {
            key: 'PF2EMONSTERMAKER.strikeBonus',
            labelKey: 'PF2EMONSTERMAKER.strikeBonusShort',
            prefix: '+',
            icon: 'fa-fist-raised',
        },
        {
            key: 'PF2EMONSTERMAKER.strikeDamage',
            labelKey: 'PF2EMONSTERMAKER.strikeDamageShort',
            prefix: '',
            icon: 'fa-burst',
        },
        {
            key: 'PF2EMONSTERMAKER.spellcasting',
            labelKey: 'pf2e-creature-builder.form.preview.spellcasting',
            prefix: '',
            icon: 'fa-wand-sparkles',
            offset: 8,
        },
    ]

    private static readonly ABILITY_KEYS = [
        'PF2EMONSTERMAKER.str',
        'PF2EMONSTERMAKER.dex',
        'PF2EMONSTERMAKER.con',
        'PF2EMONSTERMAKER.int',
        'PF2EMONSTERMAKER.wis',
        'PF2EMONSTERMAKER.cha',
    ] as const

    private static readonly ABILITY_LABEL_KEYS: Record<string, string> = {
        'PF2EMONSTERMAKER.str': 'PF2EMONSTERMAKER.strShort',
        'PF2EMONSTERMAKER.dex': 'PF2EMONSTERMAKER.dexShort',
        'PF2EMONSTERMAKER.con': 'PF2EMONSTERMAKER.conShort',
        'PF2EMONSTERMAKER.int': 'PF2EMONSTERMAKER.intShort',
        'PF2EMONSTERMAKER.wis': 'PF2EMONSTERMAKER.wisShort',
        'PF2EMONSTERMAKER.cha': 'PF2EMONSTERMAKER.chaShort',
    }

    private localize(key: string): string {
        const i18n = (window as any).game?.i18n
        if (!i18n?.localize) return key
        try {
            return i18n.localize(key) ?? key
        } catch {
            return key
        }
    }

    public updateStatPreview(): void {
        const levelSelect = this.queryById(
            'creatureBuilderLevel',
        ) as HTMLSelectElement
        if (!levelSelect) return

        const level = levelSelect.value

        this.updatePreviewRoadmapLevel(level)
        this.updatePreviewAbilityScores(level)

        for (const {
            key,
            labelKey,
            prefix,
            icon,
            offset,
        } of CreatureBuilderFormUI.PREVIEW_STATS) {
            const span = this.root.querySelector(
                `.preview-stat[data-stat="${key}"]`,
            ) as HTMLElement
            if (!span) continue

            const label = this.localize(labelKey)
            const iconHtml = `<i class="fas ${icon}"></i> `

            const select = this.queryById(
                `creatureBuilder${key}`,
            ) as HTMLSelectElement

            if (!select || select.value === 'PF2EMONSTERMAKER.none') {
                if (key === 'PF2EMONSTERMAKER.spellcasting') {
                    span.style.display = 'none'
                } else {
                    span.innerHTML = `${iconHtml}${label} --`
                }
                this.applyPreviewHighlight(span, null)
                continue
            }

            if (key === 'PF2EMONSTERMAKER.spellcasting') {
                span.style.display = ''
            }

            const saved = this.overrideDisplay(key)
            if (saved !== undefined) {
                span.innerHTML = `${iconHtml}${label} ${saved}`
                this.applyPreviewHighlight(span, select.value)
                continue
            }

            const valueTable = statisticValues[key]
            if (!valueTable?.[level]?.[select.value]) {
                span.innerHTML = `${iconHtml}${label} --`
                this.applyPreviewHighlight(span, null)
                continue
            }

            const rawValue = valueTable[level][select.value]
            const displayValue = offset
                ? String(Number(rawValue) + offset)
                : rawValue
            span.innerHTML = `${iconHtml}${label} ${prefix}${displayValue}`
            this.applyPreviewHighlight(span, select.value)
        }

        this.updateInlineStatBadges(level)
    }

    private updatePreviewRoadmapLevel(level: string): void {
        const el = this.queryById('previewRoadmapLevel')
        if (!el) return

        const roadmapSelect = this.queryById(
            'creatureBuilderRoadmap',
        ) as HTMLSelectElement
        const roadmapText =
            roadmapSelect?.selectedOptions?.[0]?.textContent?.trim() ||
            'Default'
        el.textContent = `${roadmapText} lvl ${level}`
    }

    private updatePreviewAbilityScores(level: string): void {
        for (const key of CreatureBuilderFormUI.ABILITY_KEYS) {
            const span = this.root.querySelector(
                `[data-ability="${key}"]`,
            ) as HTMLElement
            if (!span) continue

            const label = this.localize(
                CreatureBuilderFormUI.ABILITY_LABEL_KEYS[key],
            )
            const select = this.queryById(
                `creatureBuilder${key}`,
            ) as HTMLSelectElement

            if (!select || select.value === 'PF2EMONSTERMAKER.none') {
                span.textContent = `${label} --`
                this.applyPreviewHighlight(span, null)
                continue
            }

            const saved = this.overrideDisplay(key)
            if (saved !== undefined) {
                span.textContent = `${label} ${saved}`
                this.applyPreviewHighlight(span, select.value)
                continue
            }

            const valueTable = statisticValues[key]
            if (!valueTable?.[level]?.[select.value]) {
                span.textContent = `${label} --`
                this.applyPreviewHighlight(span, null)
                continue
            }

            const rawValue = getCreatureSystem().displayValue(
                key,
                level,
                select.value,
                String(valueTable[level][select.value]),
            )
            const num = Number(rawValue)
            const display = num >= 0 ? `+${num}` : `${num}`
            span.textContent = `${label} ${display}`
            this.applyPreviewHighlight(span, select.value)
        }
    }

    private updateInlineStatBadges(level: string): void {
        const badges = Array.from(
            this.root.querySelectorAll<HTMLElement>(
                '.stat-value-badge[data-stat-badge]',
            ),
        )
        for (const badge of badges) {
            const statKey = badge.dataset.statBadge
            if (!statKey) continue
            if (badge.querySelector('input')) continue

            const field = badge.dataset.overrideField || statKey
            const named = this.root.querySelector<HTMLSelectElement>(
                `select[name="${CSS.escape(field)}"]`,
            )
            const select =
                named ??
                this.queryById<HTMLSelectElement>(`creatureBuilder${statKey}`)
            if (!select) {
                badge.textContent = '--'
                continue
            }
            this.bindManualSelect(select)

            const saved = this.overrideDisplay(field)
            if (saved !== undefined) {
                badge.textContent = saved
                continue
            }

            const optionValue = select.value
            if (optionValue === 'PF2EMONSTERMAKER.none') {
                badge.textContent = '--'
                continue
            }

            const valueTable = statisticValues[statKey]
            if (!valueTable?.[level]?.[optionValue]) {
                badge.textContent = '--'
                continue
            }

            const rawValue = valueTable[level][optionValue]
            const displayedValue = getCreatureSystem().displayValue(
                statKey,
                level,
                optionValue,
                String(rawValue),
            )
            const numValue = Number.parseInt(displayedValue, 10)
            const noSignPrefix = new Set([
                'PF2EMONSTERMAKER.hp',
                'PF2EMONSTERMAKER.ac',
            ])
            if (
                !Number.isNaN(numValue) &&
                String(numValue) === displayedValue
            ) {
                if (statKey === 'PF2EMONSTERMAKER.spellcasting') {
                    badge.textContent = String(numValue + 8)
                } else if (noSignPrefix.has(statKey)) {
                    badge.textContent = String(numValue)
                } else {
                    badge.textContent =
                        numValue >= 0 ? `+${numValue}` : `${numValue}`
                }
            } else {
                badge.textContent = rawValue
            }
        }
        this.refreshManualEditing()
    }

    private applyPreviewHighlight(
        span: HTMLElement,
        optionValue: string | null,
    ): void {
        for (const cls of CreatureBuilderFormUI.STAT_LEVEL_CLASSES) {
            span.classList.remove(cls)
        }
        if (optionValue) {
            const cssClass = CreatureBuilderFormUI.OPTION_TO_CLASS[optionValue]
            if (cssClass) {
                span.classList.add(cssClass)
            }
        }
    }

    private setupBadgeToggle(): void {
        const toggle = this.queryById('toggleBadges') as HTMLInputElement
        if (!toggle) return

        const form = toggle.closest('.creatureBuilderFormModern')
        if (!form) return

        this.syncBonusToggles()
        toggle.addEventListener('change', () => {
            this.onShowBonusesChanged()
        })
        this.queryById<HTMLInputElement>('toggleManualInput')?.addEventListener(
            'change',
            () => {
                this.onManualInputChanged()
            },
        )
        this.root.addEventListener('click', this.onBadgeClick)
    }

    private syncBonusToggles(): void {
        const show = this.queryById<HTMLInputElement>('toggleBadges')
        const manual = this.queryById<HTMLInputElement>('toggleManualInput')
        const form = show?.closest('.creatureBuilderFormModern')
        if (show && form) form.classList.toggle('hide-badges', !show.checked)
        const label = manual?.closest('label')
        if (label && show) label.hidden = !show.checked
        if (show && !show.checked && manual) manual.checked = false
    }

    private onShowBonusesChanged(): void {
        const show = this.queryById<HTMLInputElement>('toggleBadges')
        const manual = this.queryById<HTMLInputElement>('toggleManualInput')
        const form = show?.closest('.creatureBuilderFormModern')
        if (!show || !form) return
        form.classList.toggle('hide-badges', !show.checked)
        const label = manual?.closest('label')
        if (label) label.hidden = !show.checked
        if (!show.checked && manual?.checked) {
            manual.checked = false
            this.exitManualInput()
            return
        }
        if (!show.checked) this.closeDamageEditor()
        this.refreshManualEditing()
    }

    private onManualInputChanged(): void {
        const manual = this.queryById<HTMLInputElement>('toggleManualInput')
        const show = this.queryById<HTMLInputElement>('toggleBadges')
        if (!manual) return
        if (manual.checked && show && !show.checked) {
            manual.checked = false
            return
        }
        if (!manual.checked) this.exitManualInput()
        else this.refreshManualEditing()
    }

    private exitManualInput(): void {
        this.closeDamageEditor()
        this.clearAllOverrides()
        this.updateStatPreview()
    }

    private manualInputEnabled(): boolean {
        const manual = this.queryById<HTMLInputElement>('toggleManualInput')
        const show = this.queryById<HTMLInputElement>('toggleBadges')
        return Boolean(manual?.checked && (show?.checked ?? true))
    }

    private refreshManualEditing(): void {
        const enabled = this.manualInputEnabled()
        for (const badge of Array.from(
            this.root.querySelectorAll<HTMLElement>(
                '.stat-value-badge[data-stat-badge]',
            ),
        )) {
            if (badge.querySelector('input')) continue
            const editable =
                enabled &&
                badge.textContent !== '--' &&
                badge.textContent !== ''
            badge.classList.toggle('stat-value-badge--editable', editable)
        }
    }

    private restoreManualOverride(name: string, value: string): void {
        let hidden = this.root.querySelector<HTMLInputElement>(
            `input[name="${CSS.escape(name)}"]`,
        )
        if (!hidden) {
            hidden = document.createElement('input')
            hidden.type = 'hidden'
            hidden.name = name
            this.root.append(hidden)
        }
        hidden.value = value
    }

    private overrideDisplay(field: string | undefined): string | undefined {
        if (!field) return undefined
        const input = this.root.querySelector<HTMLInputElement>(
            `input[name="${CSS.escape(manualOverrideKey(field))}"]`,
        )
        const value = input?.value.trim()
        return value ? value : undefined
    }

    private clearOverride(field: string): void {
        this.root
            .querySelector<HTMLInputElement>(
                `input[name="${CSS.escape(manualOverrideKey(field))}"]`,
            )
            ?.remove()
    }

    private clearAllOverrides(): void {
        for (const input of Array.from(
            this.root.querySelectorAll<HTMLInputElement>(
                'input[name^="manualOverride."]',
            ),
        )) {
            input.remove()
        }
    }

    private fieldForSelect(select: HTMLSelectElement): string {
        if (select.name) return select.name
        return select.id.slice(this.elementId('creatureBuilder').length)
    }

    private selectForBadge(badge: HTMLElement): HTMLSelectElement | null {
        const field = badge.dataset.overrideField
        const stat = badge.dataset.statBadge
        if (field) {
            const named = this.root.querySelector<HTMLSelectElement>(
                `select[name="${CSS.escape(field)}"]`,
            )
            if (named) return named
        }
        if (!stat) return null
        return this.queryById<HTMLSelectElement>(`creatureBuilder${stat}`)
    }

    private currentLevel(): string {
        return (
            this.queryById<HTMLSelectElement>('creatureBuilderLevel')?.value ||
            '1'
        )
    }

    private bindManualSelect(select: HTMLSelectElement): void {
        if (select.dataset.manualBound === 'true') return
        select.dataset.manualBound = 'true'
        select.addEventListener('change', () => {
            const field = this.fieldForSelect(select)
            if (field) this.clearOverride(field)
            this.applyStatHighlight(select)
            this.updateStatPreview()
        })
    }

    private saveOverride(badge: HTMLElement, display: string): void {
        const field = badge.dataset.overrideField
        if (!field) return
        const name = manualOverrideKey(field)
        let hidden = this.root.querySelector<HTMLInputElement>(
            `input[name="${CSS.escape(name)}"]`,
        )
        if (!hidden) {
            hidden = document.createElement('input')
            hidden.type = 'hidden'
            hidden.name = name
            badge.insertAdjacentElement('afterend', hidden)
        }
        hidden.value = display
        badge.textContent = display
        this.snapTier(badge, display)
        this.updateStatPreview()
    }

    private snapTier(badge: HTMLElement, display: string): void {
        const stat = badge.dataset.statBadge
        const select = this.selectForBadge(badge)
        if (!stat || !select) return
        const tier = closestTierForEdit(stat, this.currentLevel(), display)
        if (!tier) return
        const available = Array.from(select.options).some(
            (option) => option.value === tier,
        )
        if (!available) return
        select.value = tier
        this.applyStatHighlight(select)
    }

    private beginNumericEdit(badge: HTMLElement): void {
        const previous = badge.textContent ?? ''
        const stat = badge.dataset.statBadge ?? ''
        const bounds = badge.getBoundingClientRect()
        const input = document.createElement('input')
        input.type = 'text'
        input.className = 'stat-badge-input'
        input.value = previous
        badge.classList.add('stat-value-badge--editing')
        if (bounds.width > 0 && bounds.height > 0) {
            badge.style.width = `${Math.ceil(bounds.width * 1.2)}px`
            badge.style.height = `${Math.ceil(bounds.height * 1.2)}px`
        }
        badge.textContent = ''
        badge.append(input)
        input.focus()
        input.select?.()

        let settled = false
        const finish = (cancel: boolean) => {
            if (settled) return
            settled = true
            input.remove()
            badge.classList.remove('stat-value-badge--editing')
            badge.style.width = ''
            badge.style.height = ''
            if (cancel) {
                badge.textContent = previous
                this.refreshManualEditing()
                return
            }
            const display = displayEditedNumber(stat, input.value)
            if (display === undefined) {
                badge.textContent = previous
                this.refreshManualEditing()
                return
            }
            this.saveOverride(badge, display)
        }
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault()
                finish(false)
            } else if (event.key === 'Escape') {
                event.preventDefault()
                finish(true)
            }
        })
        input.addEventListener('blur', () => finish(false))
    }

    private ensureDamageEditor(): HTMLElement {
        if (this.damageEditor) return this.damageEditor
        const editor = document.createElement('div')
        editor.className = 'damage-editor'
        editor.hidden = true

        const countLabel = document.createElement('label')
        const countCaption = document.createElement('span')
        countCaption.textContent = this.localize(
            'pf2e-creature-builder.form.manual.dice',
        )
        const count = document.createElement('input')
        count.type = 'text'
        count.className = 'damage-editor-count'
        countLabel.append(countCaption, count)

        const dieLabel = document.createElement('label')
        const dieCaption = document.createElement('span')
        dieCaption.textContent = this.localize(
            'pf2e-creature-builder.form.manual.die',
        )
        const dieField = document.createElement('span')
        dieField.className = 'damage-editor-die-field'
        const dieIcon = document.createElement('span')
        dieIcon.className = 'fa-light fa-dice-d6 damage-editor-die-icon'
        dieIcon.setAttribute('aria-hidden', 'true')
        const picker = document.createElement('span')
        picker.className = 'damage-editor-die-picker'
        const trigger = document.createElement('button')
        trigger.type = 'button'
        trigger.className = 'damage-editor-die-trigger'
        trigger.setAttribute('aria-haspopup', 'listbox')
        const dieValue = document.createElement('span')
        dieValue.className = 'damage-editor-die-value'
        dieValue.textContent = 'd6'
        trigger.append(dieValue)
        const list = document.createElement('ul')
        list.className = 'damage-editor-die-list'
        list.hidden = true
        list.setAttribute('role', 'listbox')
        const die = document.createElement('select')
        die.className = 'damage-editor-die'
        die.tabIndex = -1
        die.setAttribute('aria-hidden', 'true')
        for (const face of STRIKE_DICE) {
            const option = document.createElement('option')
            option.value = face
            option.textContent = face
            die.append(option)

            const item = document.createElement('li')
            const choice = document.createElement('button')
            choice.type = 'button'
            choice.className = 'damage-editor-die-option'
            choice.dataset.die = face
            choice.setAttribute('role', 'option')
            const label = document.createElement('span')
            label.className = 'damage-editor-die-option-label'
            label.textContent = face
            const icon = document.createElement('i')
            icon.className = `fa-light fa-dice-${face}`
            icon.setAttribute('aria-hidden', 'true')
            choice.append(label, icon)
            choice.addEventListener('click', () => {
                die.value = face
                die.dispatchEvent(new Event('change'))
                list.hidden = true
            })
            item.append(choice)
            list.append(item)
        }
        die.addEventListener('change', () => this.syncDamageDieIcon(die))
        trigger.addEventListener('click', () => {
            list.hidden = !list.hidden
        })
        picker.append(trigger, list, die)
        dieField.append(dieIcon, picker)
        dieLabel.append(dieCaption, dieField)

        const bonusLabel = document.createElement('label')
        const bonusCaption = document.createElement('span')
        bonusCaption.textContent = this.localize(
            'pf2e-creature-builder.form.manual.bonus',
        )
        const bonus = document.createElement('input')
        bonus.type = 'text'
        bonus.className = 'damage-editor-bonus'
        bonusLabel.append(bonusCaption, bonus)

        const actions = document.createElement('div')
        actions.className = 'damage-editor-actions'
        const apply = document.createElement('button')
        apply.type = 'button'
        apply.className = 'damage-editor-apply'
        apply.textContent = this.localize(
            'pf2e-creature-builder.form.manual.apply',
        )
        apply.addEventListener('click', () => this.applyDamageEditor())
        const cancel = document.createElement('button')
        cancel.type = 'button'
        cancel.className = 'damage-editor-cancel'
        cancel.textContent = this.localize(
            'pf2e-creature-builder.form.manual.cancel',
        )
        cancel.addEventListener('click', () => this.closeDamageEditor())
        actions.append(apply, cancel)

        editor.append(countLabel, dieLabel, bonusLabel, actions)
        editor.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                this.closeDamageEditor()
            }
        })
        this.root.append(editor)
        this.damageEditor = editor
        return editor
    }

    private openDamageEditor(badge: HTMLElement): void {
        const editor = this.ensureDamageEditor()
        this.damageEditorBadge = badge
        const parsed = parseStrikeDamage(badge.textContent ?? '')
        const count = editor.querySelector<HTMLInputElement>(
            '.damage-editor-count',
        )
        const die =
            editor.querySelector<HTMLSelectElement>('.damage-editor-die')
        const bonus = editor.querySelector<HTMLInputElement>(
            '.damage-editor-bonus',
        )
        if (!count || !die || !bonus) return
        count.value = String(parsed?.dice ?? 1)
        die.value = parsed?.die ?? 'd6'
        this.syncDamageDieIcon(die)
        bonus.value = parsed ? String(parsed.bonus) : '0'
        this.placeDamageEditor(editor, badge)
        count.focus()
    }

    private placeDamageEditor(editor: HTMLElement, badge: HTMLElement): void {
        editor.hidden = false
        const frame = this.root.getBoundingClientRect()
        const anchor = badge.getBoundingClientRect()
        const panel = editor.getBoundingClientRect()
        const maxLeft = Math.max(frame.left, frame.right - panel.width)
        const maxTop = Math.max(frame.top, frame.bottom - panel.height)
        const left = Math.min(Math.max(frame.left, anchor.left), maxLeft)
        const top = Math.min(Math.max(frame.top, anchor.bottom + 4), maxTop)
        editor.style.left = `${left}px`
        editor.style.top = `${top}px`
    }

    private applyDamageEditor(): void {
        const editor = this.damageEditor
        const badge = this.damageEditorBadge
        if (!editor || !badge) return
        const count = editor.querySelector<HTMLInputElement>(
            '.damage-editor-count',
        )
        const die =
            editor.querySelector<HTMLSelectElement>('.damage-editor-die')
        const bonus = editor.querySelector<HTMLInputElement>(
            '.damage-editor-bonus',
        )
        if (!count || !die || !bonus) return
        const formula = displayEditedDamage(count.value, die.value, bonus.value)
        if (!formula) return
        this.saveOverride(badge, formula)
        this.closeDamageEditor()
    }

    private syncDamageDieIcon(die: HTMLSelectElement): void {
        const field = die.closest('.damage-editor-die-field')
        if (!field) return
        const face = isStrikeDie(die.value) ? die.value : 'd6'
        const icon = field.querySelector<HTMLElement>('.damage-editor-die-icon')
        if (icon)
            icon.className = `fa-light fa-dice-${face} damage-editor-die-icon`
        const value = field.querySelector<HTMLElement>(
            '.damage-editor-die-value',
        )
        if (value) value.textContent = face
        for (const option of Array.from(
            field.querySelectorAll<HTMLElement>('.damage-editor-die-option'),
        )) {
            option.classList.toggle('is-selected', option.dataset.die === face)
        }
    }

    private hideDamageDieList(): void {
        const list = this.damageEditor?.querySelector<HTMLElement>(
            '.damage-editor-die-list',
        )
        if (list) list.hidden = true
    }

    private closeDamageEditor(): void {
        this.hideDamageDieList()
        if (this.damageEditor) this.damageEditor.hidden = true
        this.damageEditorBadge = null
    }

    private setupStatPreviewListeners(): void {
        const levelSelect = this.queryById(
            'creatureBuilderLevel',
        ) as HTMLSelectElement
        if (levelSelect) {
            levelSelect.addEventListener('change', () => {
                this.clearAllOverrides()
                this.updateStatPreview()
            })
        }

        const roadmapSelect = this.queryById(
            'creatureBuilderRoadmap',
        ) as HTMLSelectElement
        if (roadmapSelect) {
            roadmapSelect.addEventListener('change', () => {
                this.updateStatPreview()
            })
        }

        for (const category of this.monsterCreatureStatistics) {
            for (const stat of category.statisticEntries) {
                const select = this.queryById(
                    `creatureBuilder${stat.name}`,
                ) as HTMLSelectElement
                if (select) {
                    select.addEventListener('change', () => {
                        this.updateStatPreview()
                    })
                }
            }
        }
    }

    private initializeIwr(): void {
        if (!this.queryById('immunityRows')) return
        this.bindIwrPointerListeners()
        const restored = iwrFromControls(this.preservedControls)
        this.iwr = cloneActorIwr(restored ?? this.detectedIwr)
        this.expandedIwrKey = null
        this.renderIwr()
        for (const kind of IWR_KINDS) {
            this.queryById(this.iwrAddId(kind))?.addEventListener(
                'click',
                () => {
                    this.toggleIwrTypeMenu(kind)
                },
            )
        }
        this.iwrLevel = this.currentLevel()
        this.queryById<HTMLSelectElement>(
            'creatureBuilderLevel',
        )?.addEventListener('change', () => {
            const next = this.currentLevel()
            this.scaleIwrForLevel(this.iwrLevel, next)
            this.iwrLevel = next
        })
    }

    private scaleIwrForLevel(from: string, to: string): void {
        if (from === to) {
            this.refreshIwrRangeHints()
            return
        }
        this.commitExpandedIwrValue()
        for (const kind of ['resistance', 'weakness'] as const) {
            for (const draft of this.iwr[iwrListKey(kind)]) {
                draft.value = scaleIwrValue(
                    kind,
                    from,
                    to,
                    draft.value ?? defaultIwrValue(kind, from),
                )
            }
        }
        this.renderIwr()
    }

    private renderIwr(): void {
        if (!this.queryById('immunityRows')) return
        this.iwrRendering = true
        try {
            this.writeIwrPreserved()
            for (const kind of IWR_KINDS) this.renderIwrList(kind)
            this.syncIwrAddButtons()
        } finally {
            this.iwrRendering = false
        }
    }

    private renderIwrList(kind: IwrKind): void {
        const container = this.queryById(this.iwrRowsId(kind))
        if (!container) return
        container.replaceChildren()
        const drafts = this.iwr[iwrListKey(kind)]
        for (let index = 0; index < drafts.length; index++) {
            const draft = drafts[index]
            if (!draft) continue
            container.append(this.buildIwrRow(kind, index, draft))
        }
    }

    private buildIwrRow(
        kind: IwrKind,
        index: number,
        draft: IwrDraft,
    ): HTMLElement {
        const expanded = this.expandedIwrKey === `${kind}:${index}`
        const entry = document.createElement('div')
        entry.className = 'iwr-entry'
        entry.dataset.iwrKind = kind
        entry.dataset.iwrType = draft.type
        entry.dataset.iwrIndex = String(index)
        if (expanded) entry.dataset.iwrExpanded = 'true'
        const row = document.createElement('div')
        row.className = 'iwr-row'

        const bar = document.createElement('div')
        bar.className = 'iwr-row-bar'
        const lead = document.createElement('div')
        lead.className = 'iwr-summary-lead'
        const summary = document.createElement('button')
        summary.type = 'button'
        summary.className = 'iwr-row-summary'
        summary.setAttribute('aria-expanded', expanded ? 'true' : 'false')
        const typeLabel = document.createElement('span')
        typeLabel.className = 'iwr-summary-type'
        typeLabel.textContent = iwrTypeLabel(kind, draft.type)
        summary.append(typeLabel)
        summary.addEventListener('click', () => {
            this.expandIwr(kind, index)
        })
        lead.append(summary)
        if (kind === 'resistance' || kind === 'weakness') {
            const value = document.createElement('span')
            value.className = 'iwr-summary-value'
            value.textContent = String(draft.value ?? '')
            lead.append(value)
            this.appendIwrValueField(lead, kind, draft)
        }
        const meta = document.createElement('span')
        meta.className = 'iwr-summary-meta'
        const collapsedSummary = iwrCollapsedSummary(
            kind,
            draft.exceptions,
            draft.doubleVs,
        )
        meta.textContent = collapsedSummary
        meta.hidden = expanded || collapsedSummary.length === 0
        lead.append(meta)
        bar.addEventListener('click', (event) => {
            const target = event.target
            if (!(target instanceof Element)) return
            if (target.closest('.iwr-row-summary, .iwr-value-field')) {
                return
            }
            this.expandIwr(kind, index)
        })

        const remove = document.createElement('span')
        remove.className =
            'iwr-remove creatureBuilderRemoveIcon fa-solid fa-fw fa-trash'
        const removeLabel = this.iwrLabel(
            'pf2e-creature-builder.form.iwr.remove',
            'Remove',
        )
        remove.title = removeLabel
        remove.setAttribute('aria-label', removeLabel)
        remove.addEventListener('click', (event) => {
            event.preventDefault()
            event.stopPropagation()
            this.removeIwr(kind, index)
        })
        bar.append(lead)

        const editor = document.createElement('div')
        editor.className = 'iwr-row-editor'
        editor.hidden = !expanded
        if (expanded) {
            editor.append(
                this.buildModifierBlock(
                    kind,
                    index,
                    'exceptions',
                    draft.exceptions,
                ),
            )
            if (kind === 'resistance') {
                const divider = document.createElement('div')
                divider.className = 'iwr-editor-divider'
                editor.append(
                    divider,
                    this.buildModifierBlock(
                        kind,
                        index,
                        'doubleVs',
                        draft.doubleVs,
                    ),
                )
            }
        }

        row.append(bar, editor)
        this.appendIwrHidden(row, `${kind}-${index}-type`, draft.type)
        this.appendIwrHidden(
            row,
            `${kind}-${index}-exceptions`,
            draft.exceptions.join(','),
        )
        if (kind !== 'immunity') {
            this.appendIwrHidden(
                row,
                `${kind}-${index}-value`,
                String(draft.value ?? 0),
            )
        }
        if (kind === 'resistance') {
            this.appendIwrHidden(
                row,
                `${kind}-${index}-doubleVs`,
                draft.doubleVs.join(','),
            )
        }

        entry.append(row, remove)
        entry.addEventListener('focusout', (event) => {
            if (this.iwrRendering) return
            const key = `${kind}:${index}`
            if (this.expandedIwrKey !== key) return
            const next = event.relatedTarget
            if (next instanceof Node && entry.contains(next)) return
            // Foundry often focuses the window, not the button, when a row
            // control is clicked. That pointer press still belongs to the row.
            if (this.iwrPointerInRow) return
            this.scheduleIwrCollapse(key)
        })
        return entry
    }

    private appendIwrValueField(
        parent: HTMLElement,
        kind: 'resistance' | 'weakness',
        draft: IwrDraft,
    ): void {
        const field = document.createElement('label')
        field.className = 'iwr-value-field'
        const input = document.createElement('input')
        input.type = 'number'
        input.className = 'iwr-value-input'
        input.setAttribute(
            'aria-label',
            this.iwrLabel('pf2e-creature-builder.form.iwr.value', 'Value'),
        )
        input.value = String(
            draft.value ?? defaultIwrValue(kind, this.currentLevel()),
        )
        input.addEventListener('input', () => {
            const numeric = Number(input.value)
            if (input.value.trim() === '' || !Number.isFinite(numeric)) return
            draft.value = Math.round(numeric)
            const hidden = input
                .closest('.iwr-row')
                ?.querySelector<HTMLInputElement>(`input[name$="-value"]`)
            if (hidden) hidden.value = String(draft.value)
            const summary = input
                .closest('.iwr-row')
                ?.querySelector('.iwr-summary-value')
            if (summary) summary.textContent = String(draft.value)
        })
        const hint = document.createElement('span')
        hint.className = 'iwr-range-hint'
        hint.textContent = recommendedIwrText(this.currentLevel())
        field.append(input, hint)
        parent.append(field)
    }

    private buildModifierBlock(
        kind: IwrKind,
        index: number,
        mode: 'exceptions' | 'doubleVs',
        slugs: string[],
    ): HTMLElement {
        const block = document.createElement('div')
        block.className = `iwr-editor-block iwr-editor-block--${
            mode === 'exceptions' ? 'exceptions' : 'double'
        }`
        const label = document.createElement('span')
        label.className = 'iwr-editor-label'
        label.textContent = this.iwrLabel(
            mode === 'exceptions'
                ? 'pf2e-creature-builder.form.iwr.exceptions'
                : 'pf2e-creature-builder.form.iwr.double-vs',
            mode === 'exceptions' ? 'Exceptions' : 'Double Vs',
        )
        const chips = document.createElement('div')
        chips.className = 'iwr-chips'
        for (const slug of slugs) {
            chips.append(this.buildIwrChip(kind, index, mode, slug))
        }
        const addWrap = document.createElement('div')
        addWrap.className = 'iwr-add-modifier-wrap'
        const add = document.createElement('button')
        add.type = 'button'
        add.className = 'iwr-add-modifier'
        add.textContent = this.iwrLabel(
            mode === 'exceptions'
                ? 'pf2e-creature-builder.form.iwr.add-exception'
                : 'pf2e-creature-builder.form.iwr.add-double-vs',
            '+ Add',
        )
        add.addEventListener('click', (event) => {
            event.preventDefault()
            event.stopPropagation()
            this.toggleModifierMenu(kind, index, mode)
        })
        const menu = document.createElement('div')
        menu.className = 'iwr-type-menu'
        menu.hidden = true
        menu.dataset.modifier = mode
        addWrap.append(add, menu)
        chips.append(addWrap)
        block.append(label, chips)
        return block
    }

    private buildIwrChip(
        kind: IwrKind,
        index: number,
        mode: 'exceptions' | 'doubleVs',
        slug: string,
    ): HTMLElement {
        const chip = document.createElement('span')
        chip.className = 'iwr-chip'
        chip.dataset.slug = slug
        const name = document.createElement('span')
        name.textContent = iwrTypeLabel(kind, slug)
        const remove = document.createElement('button')
        remove.type = 'button'
        remove.className = 'iwr-chip-remove'
        remove.textContent = '×'
        remove.setAttribute(
            'aria-label',
            this.iwrLabel('pf2e-creature-builder.form.iwr.remove', 'Remove'),
        )
        remove.addEventListener('click', (event) => {
            event.preventDefault()
            event.stopPropagation()
            this.removeIwrModifier(kind, index, mode, slug)
        })
        chip.append(name, remove)
        return chip
    }

    private appendIwrHidden(
        row: HTMLElement,
        name: string,
        value: string,
    ): void {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = name
        input.value = value
        row.append(input)
    }

    private toggleIwrTypeMenu(kind: IwrKind): void {
        const menu = this.queryById<HTMLElement>(this.iwrMenuId(kind))
        if (!menu) return
        const opening = menu.hidden
        this.hideIwrMenus()
        if (!opening) return
        const used = this.iwr[iwrListKey(kind)].map((row) => row.type)
        const choices = availableIwrTypes(kind, used)
        this.fillIwrMenu(menu, choices, (slug) => {
            this.addIwr(kind, slug)
        })
        menu.hidden = choices.length === 0
        this.keepExpandedIwrOpen()
        this.focusIwrFilter(menu)
    }

    private toggleModifierMenu(
        kind: IwrKind,
        index: number,
        mode: 'exceptions' | 'doubleVs',
    ): void {
        const menu = this.iwrRowElement(
            kind,
            index,
        )?.querySelector<HTMLElement>(`.iwr-type-menu[data-modifier="${mode}"]`)
        if (!menu) return
        const opening = menu.hidden
        this.hideIwrMenus()
        if (!opening) return
        const draft = this.iwr[iwrListKey(kind)][index]
        if (!draft) return
        const choices = availableIwrModifiers(kind, draft.type, [
            ...draft.exceptions,
            ...draft.doubleVs,
        ])
        this.fillIwrMenu(menu, choices, (slug) => {
            this.addIwrModifier(kind, index, mode, slug)
        })
        menu.hidden = choices.length === 0
        this.keepExpandedIwrOpen()
        this.focusIwrFilter(menu)
    }

    private focusIwrFilter(menu: HTMLElement): void {
        if (menu.hidden) return
        menu.querySelector<HTMLInputElement>('.iwr-type-filter')?.focus()
    }

    private fillIwrMenu(
        menu: HTMLElement,
        choices: { slug: string; label: string }[],
        onChoose: (slug: string) => void,
    ): void {
        menu.replaceChildren()
        const filter = document.createElement('input')
        filter.type = 'search'
        filter.className = 'iwr-type-filter'
        filter.autocomplete = 'off'
        filter.placeholder = this.iwrLabel(
            'pf2e-creature-builder.form.iwr.filter',
            'Filter',
        )
        filter.setAttribute('aria-label', filter.placeholder)
        const buttons: HTMLButtonElement[] = []
        filter.addEventListener('input', () => {
            const query = filter.value.trim().toLowerCase()
            for (const button of buttons) {
                const label = button.textContent?.toLowerCase() ?? ''
                button.hidden = query.length > 0 && !label.includes(query)
            }
        })
        filter.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                menu.hidden = true
                return
            }
            if (event.key !== 'Enter') return
            event.preventDefault()
            buttons.find((button) => !button.hidden)?.click()
        })
        filter.addEventListener('click', (event) => {
            event.stopPropagation()
        })
        menu.append(filter)
        for (const choice of choices) {
            const button = document.createElement('button')
            button.type = 'button'
            button.textContent = choice.label
            button.dataset.iwrType = choice.slug
            button.addEventListener('click', (event) => {
                event.preventDefault()
                event.stopPropagation()
                onChoose(choice.slug)
            })
            buttons.push(button)
            menu.append(button)
        }
    }

    private addIwr(kind: IwrKind, type: string): void {
        const list = this.iwr[iwrListKey(kind)]
        if (list.some((row) => row.type === type)) return
        const draft: IwrDraft = { type, exceptions: [], doubleVs: [] }
        if (kind !== 'immunity') {
            draft.value = defaultIwrValue(kind, this.currentLevel())
        }
        list.push(draft)
        this.expandedIwrKey = `${kind}:${list.length - 1}`
        this.hideIwrMenus()
        this.renderIwr()
        this.focusExpandedIwr()
    }

    private addIwrModifier(
        kind: IwrKind,
        index: number,
        mode: 'exceptions' | 'doubleVs',
        slug: string,
    ): void {
        const draft = this.iwr[iwrListKey(kind)][index]
        if (!draft || slug === draft.type) return
        const other = mode === 'exceptions' ? draft.doubleVs : draft.exceptions
        if (draft[mode].includes(slug) || other.includes(slug)) return
        draft[mode].push(slug)
        this.hideIwrMenus()
        this.renderIwr()
        this.focusExpandedIwr()
    }

    private removeIwrModifier(
        kind: IwrKind,
        index: number,
        mode: 'exceptions' | 'doubleVs',
        slug: string,
    ): void {
        const draft = this.iwr[iwrListKey(kind)][index]
        if (!draft) return
        draft[mode] = draft[mode].filter((item) => item !== slug)
        this.renderIwr()
        this.focusExpandedIwr()
    }

    private removeIwr(kind: IwrKind, index: number): void {
        this.iwr[iwrListKey(kind)].splice(index, 1)
        this.expandedIwrKey = null
        this.hideIwrMenus()
        this.renderIwr()
    }

    private expandIwr(kind: IwrKind, index: number): void {
        const key = `${kind}:${index}`
        if (this.expandedIwrKey === key) return
        this.commitExpandedIwrValue()
        this.expandedIwrKey = key
        this.hideIwrMenus()
        this.renderIwr()
        this.focusExpandedIwr()
    }

    private collapseIwr(): void {
        if (!this.expandedIwrKey) return
        this.commitExpandedIwrValue()
        this.expandedIwrKey = null
        this.hideIwrMenus()
        this.renderIwr()
    }

    private readonly onIwrPointerDown = (event: Event): void => {
        if (!this.expandedIwrKey) return
        const row = this.expandedIwrRow()
        const target = event.target
        if (!row || !(target instanceof Node)) return
        if (row.contains(target)) {
            this.iwrPointerInRow = true
            return
        }
        const element =
            target instanceof Element ? target : target.parentElement
        // Collapse rebuilds the rows. Doing it here removes the button
        // before its click runs, so the next menu never opens.
        if (element?.closest('.iwr-add, .iwr-entry, .iwr-editor-block')) {
            this.iwrPointerInRow = true
            this.commitExpandedIwrValue()
            return
        }
        this.iwrPointerInRow = false
        this.collapseIwr()
    }

    private readonly onIwrPointerUp = (): void => {
        if (this.iwrPointerTimer !== undefined) {
            clearTimeout(this.iwrPointerTimer)
        }
        // Stay set through the click and the focus change it causes.
        this.iwrPointerTimer = setTimeout(() => {
            this.iwrPointerTimer = undefined
            this.iwrPointerInRow = false
        }, 0)
    }

    private bindIwrPointerListeners(): void {
        this.unbindIwrPointerListeners()
        this.root.addEventListener('pointerdown', this.onIwrPointerDown, true)
        this.root.addEventListener('pointerup', this.onIwrPointerUp, true)
        this.root.addEventListener('pointercancel', this.onIwrPointerUp, true)
    }

    private unbindIwrPointerListeners(): void {
        this.root.removeEventListener(
            'pointerdown',
            this.onIwrPointerDown,
            true,
        )
        this.root.removeEventListener('pointerup', this.onIwrPointerUp, true)
        this.root.removeEventListener(
            'pointercancel',
            this.onIwrPointerUp,
            true,
        )
        if (this.iwrPointerTimer !== undefined) {
            clearTimeout(this.iwrPointerTimer)
            this.iwrPointerTimer = undefined
        }
        this.iwrPointerInRow = false
    }

    private scheduleIwrCollapse(key: string): void {
        if (this.iwrCollapseTimer !== undefined) {
            clearTimeout(this.iwrCollapseTimer)
        }
        this.iwrCollapseTimer = setTimeout(() => {
            this.iwrCollapseTimer = undefined
            if (this.iwrRendering || this.expandedIwrKey !== key) return
            if (this.iwrPointerInRow) return
            if (this.root.querySelector('.iwr-type-menu:not([hidden])')) return
            const row = this.expandedIwrRow()
            if (row?.contains(document.activeElement)) return
            this.collapseIwr()
        }, 0)
    }

    private keepExpandedIwrOpen(): void {
        if (this.iwrCollapseTimer !== undefined) {
            clearTimeout(this.iwrCollapseTimer)
            this.iwrCollapseTimer = undefined
        }
    }

    private commitExpandedIwrValue(): void {
        const parsed = this.parseIwrKey(this.expandedIwrKey)
        if (!parsed || parsed.kind === 'immunity') return
        const draft = this.iwr[iwrListKey(parsed.kind)][parsed.index]
        const input = this.iwrRowElement(
            parsed.kind,
            parsed.index,
        )?.querySelector<HTMLInputElement>('.iwr-value-input')
        if (!draft || !input) return
        const numeric = Number(input.value)
        draft.value =
            input.value.trim() !== '' && Number.isFinite(numeric)
                ? Math.round(numeric)
                : defaultIwrValue(parsed.kind, this.currentLevel())
    }

    private focusExpandedIwr(): void {
        this.expandedIwrRow()
            ?.querySelector<HTMLElement>('.iwr-value-input')
            ?.focus()
    }

    private refreshIwrRangeHints(): void {
        const hint = recommendedIwrText(this.currentLevel())
        for (const element of Array.from(
            this.root.querySelectorAll('.iwr-range-hint'),
        )) {
            element.textContent = hint
        }
    }

    private writeIwrPreserved(): void {
        const input = this.queryById<HTMLInputElement>('iwrPreserved')
        if (input) input.value = JSON.stringify(this.iwr.preserved)
    }

    private syncIwrAddButtons(): void {
        for (const kind of IWR_KINDS) {
            const button = this.queryById<HTMLButtonElement>(
                this.iwrAddId(kind),
            )
            if (!button) continue
            const used = this.iwr[iwrListKey(kind)].map((row) => row.type)
            button.disabled = availableIwrTypes(kind, used).length === 0
        }
    }

    private hideIwrMenus(): void {
        for (const menu of Array.from(
            this.root.querySelectorAll<HTMLElement>('.iwr-type-menu'),
        )) {
            menu.hidden = true
            menu.replaceChildren()
        }
    }

    private iwrRowElement(kind: IwrKind, index: number): HTMLElement | null {
        return (
            this.queryById(this.iwrRowsId(kind))?.querySelector<HTMLElement>(
                `[data-iwr-index="${index}"]`,
            ) ?? null
        )
    }

    private expandedIwrRow(): HTMLElement | null {
        const parsed = this.parseIwrKey(this.expandedIwrKey)
        if (!parsed) return null
        return this.iwrRowElement(parsed.kind, parsed.index)
    }

    private parseIwrKey(
        key: string | null,
    ): { kind: IwrKind; index: number } | null {
        if (!key) return null
        const [kind, index] = key.split(':')
        if (!kind || !(IWR_KINDS as readonly string[]).includes(kind)) {
            return null
        }
        return { kind: kind as IwrKind, index: Number(index) }
    }

    private iwrRowsId(kind: IwrKind): string {
        if (kind === 'immunity') return 'immunityRows'
        if (kind === 'resistance') return 'resistanceRows'
        return 'weaknessRows'
    }

    private iwrAddId(kind: IwrKind): string {
        if (kind === 'immunity') return 'addImmunityButton'
        if (kind === 'resistance') return 'addResistanceButton'
        return 'addWeaknessButton'
    }

    private iwrMenuId(kind: IwrKind): string {
        if (kind === 'immunity') return 'immunityTypeMenu'
        if (kind === 'resistance') return 'resistanceTypeMenu'
        return 'weaknessTypeMenu'
    }

    private iwrLabel(key: string, fallback: string): string {
        try {
            const value = (window as any).game?.i18n?.localize?.(key)
            if (!value || value === key) return fallback
            return value
        } catch {
            return fallback
        }
    }
}

export default CreatureBuilderFormUI

export type { CreatureBuilderFormConfig }

if (typeof window !== 'undefined') {
    ;(window as any).CreatureBuilderFormUI = CreatureBuilderFormUI
}

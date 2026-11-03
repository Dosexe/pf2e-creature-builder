/**
 * Creature Builder Form UI Controller
 * Handles client-side form interactions: traits management, lore skills, and roadmap selection
 * This class is instantiated by the CreatureBuilderForm Application V2 after rendering
 */

import type { RoadmapCollection } from '@/Keys'
import type { SpellListCollection } from '@/spellcasting/model/spellList'
import { getCreatureSystem } from '@/systems/getCreatureSystem'
import { statisticValues } from '@/Values'
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
    detectedLoreSkills: LoreSkill[]
    detectedAttacks?: DetectedAttack[]
    detectedSpeeds?: SpeedChip[]
    detectedSenses?: SenseDraft[]
    actorLevel: string
    droppedItems?: Record<string, unknown>[]
    root: HTMLElement
    idPrefix: string
    preservedControls?: Record<string, string>
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
    private readonly detectedLoreSkills: LoreSkill[]
    private readonly detectedAttacks: DetectedAttack[]
    private readonly detectedSpeeds: SpeedChip[]
    private readonly detectedSenses: SenseDraft[]
    private readonly actorLevel: string
    private readonly droppedItems: Record<string, unknown>[]
    private readonly root: HTMLElement
    private readonly idPrefix: string
    private readonly preservedControls: Record<string, string> | null
    private loreCounter: number = 0
    private attackCounter: number = 0
    private senseCounter: number = 0
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
    }

    private readonly onWindowScroll = () => {
        if (this.creatureBuilderTraitsDropdown.classList.contains('show')) {
            this.positionDropdown()
        }
    }

    private readonly onWindowResize = () => {
        if (this.creatureBuilderTraitsDropdown.classList.contains('show')) {
            this.positionDropdown()
        }
    }

    constructor(config: CreatureBuilderFormConfig) {
        this.monsterCreatureStatistics = config.creatureStatistics
        this.monsterCreatureRoadmaps = config.creatureRoadmaps
        this.spellLists = config.spellLists
        this.detectedStats = config.detectedStats
        this.detectedTraits = config.detectedTraits
        this.detectedLoreSkills = config.detectedLoreSkills
        this.detectedAttacks = config.detectedAttacks ?? []
        this.detectedSpeeds = config.detectedSpeeds ?? []
        this.detectedSenses = config.detectedSenses ?? []
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

        document.removeEventListener('click', this.onDocumentClick)
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

        loreDiv.appendChild(nameInput)
        loreDiv.appendChild(levelSelect)
        loreDiv.appendChild(removeIcon)
        container.appendChild(loreDiv)
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
        parent.appendChild(select)
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
            ? Object.keys(this.preservedControls).some((key) =>
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
            option.setAttribute('role', 'option')
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
        const used = this.selectedSenseTypes()
        const choices = senseChoices()
        const type =
            initial?.type && !used.has(initial.type)
                ? initial.type
                : choices.find((choice) => !used.has(choice.slug))?.slug
        if (!type) return

        const id = this.senseCounter++
        const row = document.createElement('div')
        row.className = 'sense-entry'
        row.dataset.senseId = String(id)

        const select = document.createElement('select')
        select.name = `senseType${id}`
        select.className = 'stat-select sense-type'
        select.addEventListener('change', () => {
            this.syncSenseFields(row)
            this.refreshSenseOptions()
        })

        const remove = document.createElement('span')
        remove.className = 'creatureBuilderRemoveIcon fa-solid fa-fw fa-trash'
        remove.title = this.movementText(
            'pf2e-creature-builder.form.movement.remove-sense',
            'Remove sense',
        )
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

    private selectedSenseTypes(): Set<string> {
        const selects =
            this.queryById('sensesContainer')?.querySelectorAll('.sense-type')
        return new Set(
            Array.from(selects ?? [])
                .map((select) => (select as HTMLSelectElement).value)
                .filter((value) => value),
        )
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
                if (choice.slug !== current && selected.includes(choice.slug)) {
                    continue
                }
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
        const used = new Set(selected.filter((value) => value))
        add.disabled = choices.every((choice) => used.has(choice.slug))
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
        this.setDefaults()

        const levelSelect = this.queryById(
            'creatureBuilderLevel',
        ) as HTMLSelectElement
        if (levelSelect) levelSelect.value = '-1'

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

            const select = this.queryById(
                `creatureBuilder${statKey}`,
            ) as HTMLSelectElement
            if (!select) {
                badge.textContent = '--'
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

        toggle.addEventListener('change', () => {
            form.classList.toggle('hide-badges', !toggle.checked)
        })
    }

    private setupStatPreviewListeners(): void {
        const levelSelect = this.queryById(
            'creatureBuilderLevel',
        ) as HTMLSelectElement
        if (levelSelect) {
            levelSelect.addEventListener('change', () => {
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
}

export default CreatureBuilderFormUI

export type { CreatureBuilderFormConfig }

if (typeof window !== 'undefined') {
    ;(window as any).CreatureBuilderFormUI = CreatureBuilderFormUI
}

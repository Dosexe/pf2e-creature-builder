/**
 * Creature Builder Form UI Controller
 * Handles client-side form interactions: traits management, lore skills, and roadmap selection
 * This class is instantiated by the CreatureBuilderForm FormApplication after rendering
 */

interface StatisticEntry {
    name: string
    availableOptions?: string[]
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

interface CreatureBuilderFormConfig {
    creatureStatistics: CreatureStatistic[]
    creatureRoadmaps: { [key: string]: { [key: string]: string } }
    detectedStats: DetectedStats
    detectedTraits: string[]
    detectedLoreSkills: LoreSkill[]
    actorLevel: string
}

/**
 * UI Controller for Creature Builder form interactions
 * Separated from the FormApplication to handle client-side behavior
 */
class CreatureBuilderFormUI {
    private readonly monsterCreatureStatistics: CreatureStatistic[]
    private readonly monsterCreatureRoadmaps: {
        [key: string]: { [key: string]: string }
    }
    private readonly detectedStats: DetectedStats
    private readonly detectedTraits: string[]
    private readonly detectedLoreSkills: LoreSkill[]
    private readonly actorLevel: string
    private loreCounter: number = 0
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

    private readonly pf2eTraits = [
        'aberration',
        'acid',
        'aeon',
        'aesir',
        'agathion',
        'air',
        'aiuvarin',
        'alchemical',
        'amphibious',
        'anadi',
        'android',
        'angel',
        'animal',
        'anugobu',
        'aphorite',
        'aquatic',
        'archon',
        'arcane',
        'ardande',
        'astral',
        'automaton',
        'azarketi',
        'azata',
        'beast',
        'beastkin',
        'boggard',
        'caligni',
        'catfolk',
        'celestial',
        'changeling',
        'chaotic',
        'clockwork',
        'cold',
        'construct',
        'daemon',
        'darvakka',
        'demon',
        'dero',
        'devil',
        'dhampir',
        'dinosaur',
        'divine',
        'dragon',
        'dream',
        'drow',
        'duergar',
        'duskwalker',
        'dwarf',
        'earth',
        'eidolon',
        'electricity',
        'elemental',
        'elf',
        'ethereal',
        'evil',
        'fetchling',
        'fey',
        'fiend',
        'fire',
        'fleshwarp',
        'flumph',
        'force',
        'fungus',
        'ganzi',
        'genie',
        'ghoran',
        'ghost',
        'ghoul',
        'giant',
        'gnoll',
        'gnome',
        'goblin',
        'golem',
        'good',
        'goloma',
        'gremlin',
        'grioth',
        'grippli',
        'hag',
        'half-elf',
        'half-orc',
        'halfling',
        'hobgoblin',
        'human',
        'humanoid',
        'ifrit',
        'illusion',
        'incorporeal',
        'inevitable',
        'kami',
        'kashrishi',
        'kitsune',
        'kobold',
        'lawful',
        'leshy',
        'light',
        'linnorm',
        'lizardfolk',
        'locathah',
        'mental',
        'merfolk',
        'mindless',
        'minion',
        'monitor',
        'morlock',
        'mortic',
        'mummy',
        'munavri',
        'mutant',
        'nagaji',
        'negative',
        'neutral',
        'nightmare',
        'nightshade',
        'nymph',
        'occult',
        'ooze',
        'orc',
        'oread',
        'petitioner',
        'phantom',
        'plant',
        'poison',
        'positive',
        'primal',
        'protean',
        'psychic',
        'psychopomp',
        'poppet',
        'qlippoth',
        'rakshasa',
        'rare',
        'ratfolk',
        'reflection',
        'robot',
        'sahkil',
        'salamander',
        'sea devil',
        'serpentfolk',
        'shadow',
        'shisk',
        'shoony',
        'skelm',
        'skeleton',
        'skulk',
        'sonic',
        'soulbound',
        'spirit',
        'spriggan',
        'sprite',
        'strix',
        'summoned',
        'swarm',
        'sylph',
        'talos',
        'tanuki',
        'tengu',
        'time',
        'titan',
        'troll',
        'troop',
        'uncommon',
        'undead',
        'undine',
        'unique',
        'urdefhan',
        'vampire',
        'vanara',
        'velstrac',
        'vishkanya',
        'vitality',
        'void',
        'water',
        'werecreature',
        'wild hunt',
        'witch',
        'wyrwood',
        'wyvern',
        'xulgath',
        'yaksha',
        'yeti',
        'zombie',
    ]

    // DOM element references
    private traitsInput!: HTMLElement
    private traitsTagify!: HTMLElement
    private traitsHidden!: HTMLInputElement
    private creatureBuilderTraitsDropdown!: HTMLElement
    private traitsDropdownWrapper!: HTMLElement

    constructor(config: CreatureBuilderFormConfig) {
        this.monsterCreatureStatistics = config.creatureStatistics
        this.monsterCreatureRoadmaps = config.creatureRoadmaps
        this.detectedStats = config.detectedStats
        this.detectedTraits = config.detectedTraits
        this.detectedLoreSkills = config.detectedLoreSkills
        this.actorLevel = String(config.actorLevel)
    }

    /**
     * Initialize the form - call this after DOM is ready
     */
    public initialize(): void {
        this.cacheDOMElements()
        this.setupEventListeners()
        this.initializeTraits()
        this.initializeLoreSkills()
        this.initCollapsibleSections()

        setTimeout(() => {
            this.setDetectedStats()
        }, 0)
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
        this.creatureBuilderTraitsDropdown = this.getElement('creatureBuilderTraitsDropdown')
        this.traitsDropdownWrapper = this.creatureBuilderTraitsDropdown.querySelector(
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
            this.traitsInput.focus()
            this.showDropdown(this.getInputText())
        })

        document.addEventListener('click', (e) => {
            if (
                !this.traitsTagify.contains(e.target as Node) &&
                !this.creatureBuilderTraitsDropdown.contains(e.target as Node)
            ) {
                this.hideDropdown()
            }
        })

        window.addEventListener(
            'scroll',
            () => {
                if (this.creatureBuilderTraitsDropdown.classList.contains('show')) {
                    this.positionDropdown()
                }
            },
            true,
        )

        window.addEventListener('resize', () => {
            if (this.creatureBuilderTraitsDropdown.classList.contains('show')) {
                this.positionDropdown()
            }
        })

        const addLoreButton = this.getElement('addLoreButton')
        addLoreButton.addEventListener('click', () => {
            this.addLoreSkill()
        })

        const resetButton = this.getElement('creatureBuilderResetButton')
        resetButton.addEventListener('click', () => {
            this.resetToDefaults()
        })

        ;(window as any).setRoadmap = (selectedRoadmap: HTMLSelectElement) => {
            this.setRoadmap(selectedRoadmap)
        }
    }

    /**
     * Set defaults for all statistics
     */
    private setDefaults(): void {
        for (const category of this.monsterCreatureStatistics) {
            for (const statistic of category.statisticEntries) {
                const element = document.getElementById(
                    `creatureBuilder${statistic.name}`,
                ) as HTMLSelectElement
                if (element) {
                    element.value = category.defaultValue
                }
            }
        }
    }

    /**
     * Set detected stats from the actor
     */
    private setDetectedStats(): void {
        this.setDefaults()

        const levelSelect = document.getElementById(
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
                const select = document.getElementById(
                    `creatureBuilder${key}`,
                ) as HTMLSelectElement
                if (select) {
                    select.value = value
                }
            }
        }
    }

    /**
     * Set roadmap (called from HTML onchange handler)
     */
    public setRoadmap(selectedRoadmap: HTMLSelectElement): void {
        const roadmapValue = selectedRoadmap.value

        if (this.monsterCreatureRoadmaps[roadmapValue]) {
            this.setDefaults()
            const roadmap = this.monsterCreatureRoadmaps[roadmapValue]

            for (const [key, value] of Object.entries(roadmap)) {
                const select = document.getElementById(
                    `creatureBuilder${key}`,
                ) as HTMLSelectElement
                if (select) {
                    select.value = value
                }
            }
        }
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
     * Position the dropdown relative to the tagify container
     */
    private positionDropdown(): void {
        // Move dropdown to document body for proper fixed positioning
        if (this.creatureBuilderTraitsDropdown.parentElement !== document.body) {
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
        const filtered = this.pf2eTraits.filter(
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
            this.pf2eTraits.indexOf(filterLower) === -1 &&
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
        item.id = isCustom
            ? `custom-${traitName}`
            : traitName.replace(/\s+/g, '-')
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
                if (this.creatureBuilderTraitsDropdown.classList.contains('show')) {
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
                if (this.creatureBuilderTraitsDropdown.classList.contains('show')) {
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
    private addLoreSkill(name: string = '', level: string = ''): void {
        const container = this.getElement('loreSkillsContainer')
        const loreId = this.loreCounter++

        const loreDiv = document.createElement('div')
        loreDiv.className = 'form-group setting loreEntry'
        loreDiv.id = `loreEntry${loreId}`

        const nameInput = document.createElement('input')
        nameInput.type = 'text'
        nameInput.name = `loreName${loreId}`
        nameInput.value = name || ''
        nameInput.placeholder =
            (window as any).game?.i18n?.localize('PF2EMONSTERMAKER.loreName') ||
            'Lore Name'
        nameInput.className = 'creatureBuilderFormText loreNameInput'

        const levelSelect = document.createElement('select')
        levelSelect.name = `loreLevel${loreId}`
        levelSelect.className = 'creatureBuilderFormTextSmall'

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
        removeIcon.className = 'creatureBuilderRemoveIcon fa-solid fa-fw fa-trash'
        removeIcon.addEventListener('click', () => {
            container.removeChild(loreDiv)
        })

        loreDiv.appendChild(nameInput)
        loreDiv.appendChild(levelSelect)
        loreDiv.appendChild(removeIcon)
        container.appendChild(loreDiv)
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
     * Reset form to defaults
     */
    private resetToDefaults(): void {
        this.setDefaults()

        const levelSelect = document.getElementById(
            'creatureBuilderLevel',
        ) as HTMLSelectElement
        if (levelSelect) levelSelect.value = '1'

        const roadmapSelect = document.getElementById(
            'creatureBuilderRoadmap',
        ) as HTMLSelectElement
        if (roadmapSelect) roadmapSelect.value = 'Default'

        this.traits.length = 0
        this.renderTraits()
        this.updateTraitsHidden()

        const loreContainer = this.getElement('loreSkillsContainer')
        loreContainer.innerHTML = ''
        this.loreCounter = 0
    }

    /**
     * Initialize collapsible sections (collapse Skills and Lore Skills by default)
     */
    private initCollapsibleSections(): void {
        const sections = document.querySelectorAll(
            'details.collapsibleSection',
        )

        sections.forEach((section) => {
            const sectionName = section.getAttribute('data-section-name')
            const sectionId = section.getAttribute('id')

            const isSkillsSection =
                sectionName &&
                (sectionName.toLowerCase().indexOf('skill') !== -1 ||
                    sectionName === 'PF2EMONSTERMAKER.skills')
            const isLoreSection = sectionId === 'sectionLore'

            if (isSkillsSection || isLoreSection) {
                section.removeAttribute('open')
            }
        })
    }

    /**
     * Get a DOM element by ID with error handling
     */
    private getElement<T extends HTMLElement = HTMLElement>(id: string): T {
        const element = document.getElementById(id)
        if (!element) {
            throw new Error(`Element with id '${id}' not found`)
        }
        return element as T
    }
}

export default CreatureBuilderFormUI

export type { CreatureBuilderFormConfig }

if (typeof window !== 'undefined') {
    ;(window as any).CreatureBuilderFormUI = CreatureBuilderFormUI
}

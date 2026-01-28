// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CreatureBuilderFormUI from './CreatureBuilderFormUI'
import { Options, Statistics } from './Keys'

const buildConfig = (overrides: Partial<ConstructorParameters<typeof CreatureBuilderFormUI>[0]> = {}) => ({
    creatureStatistics: [
        {
            name: 'PF2EMONSTERMAKER.abilityScores',
            defaultValue: Options.moderate,
            statisticEntries: [
                { name: Statistics.str },
                { name: Statistics.dex },
            ],
        },
    ],
    creatureRoadmaps: {
        TestRoadmap: {
            [Statistics.dex]: Options.low,
        },
    },
    detectedStats: {},
    detectedTraits: [],
    detectedLoreSkills: [],
    actorLevel: '1',
    ...overrides,
})

const setupDom = () => {
    document.body.innerHTML = `
        <div class="creatureBuilderForm">
            <input id="creatureBuilderTraitsHidden" />
            <div id="loreSkillsContainer"></div>
            <button id="addLoreButton" type="button">Add Lore</button>
            <button id="creatureBuilderResetButton" type="button">Reset</button>
            <select id="creatureBuilderLevel">
                <option value="-1">-1</option>
                <option value="1">1</option>
                <option value="3">3</option>
            </select>
            <select id="creatureBuilderRoadmap">
                <option value="Default">Default</option>
                <option value="TestRoadmap">TestRoadmap</option>
            </select>
            <select id="creatureBuilder${Statistics.str}">
                <option value="${Options.moderate}">moderate</option>
                <option value="${Options.high}">high</option>
            </select>
            <select id="creatureBuilder${Statistics.dex}">
                <option value="${Options.moderate}">moderate</option>
                <option value="${Options.low}">low</option>
            </select>
        </div>
        <details class="collapsibleSection" id="sectionLore" open>
            <summary class="collapsibleHeader"></summary>
        </details>
        <details class="collapsibleSection" data-section-name="PF2EMONSTERMAKER.skills" open>
            <summary class="collapsibleHeader"></summary>
        </details>
        <tags id="traitsTagify">
            <span id="creatureBuilderTraitsInput" contenteditable="true"></span>
        </tags>
        <div id="creatureBuilderTraitsDropdown" class="tagify__dropdown">
            <div class="tagify__dropdown__wrapper"></div>
        </div>
    `
}

beforeEach(() => {
    setupDom()
    ;(window as any).game = {
        i18n: { localize: (key: string) => key },
    }
    if (!HTMLElement.prototype.scrollIntoView) {
        HTMLElement.prototype.scrollIntoView = () => {}
    }
    if (!HTMLElement.prototype.focus) {
        HTMLElement.prototype.focus = () => {}
    }
})

afterEach(() => {
    document.body.innerHTML = ''
    delete (window as any).game
    delete (window as any).setRoadmap
    vi.useRealTimers()
})

describe('CreatureBuilderFormUI', () => {
    it('initializes defaults, detected stats, and collapses sections', () => {
        vi.useFakeTimers()
        const ui = new CreatureBuilderFormUI(
            buildConfig({
                detectedStats: { [Statistics.str]: Options.high },
                actorLevel: '3',
            }),
        )
        ui.initialize()
        vi.runAllTimers()

        const level = document.getElementById('creatureBuilderLevel') as HTMLSelectElement
        const str = document.getElementById(`creatureBuilder${Statistics.str}`) as HTMLSelectElement
        const dex = document.getElementById(`creatureBuilder${Statistics.dex}`) as HTMLSelectElement

        expect(level.value).toBe('3')
        expect(str.value).toBe(Options.high)
        expect(dex.value).toBe(Options.moderate)

        const loreSection = document.getElementById('sectionLore') as HTMLDetailsElement
        const skillsSection = document.querySelector(
            'details.collapsibleSection[data-section-name="PF2EMONSTERMAKER.skills"]',
        ) as HTMLDetailsElement
        expect(loreSection.open).toBe(false)
        expect(skillsSection.open).toBe(false)
        expect(typeof (window as any).setRoadmap).toBe('function')
    })

    it('adds and removes lore entries from the button', () => {
        const ui = new CreatureBuilderFormUI(buildConfig())
        ui.initialize()

        const addButton = document.getElementById('addLoreButton') as HTMLButtonElement
        addButton.click()

        const entries = document.querySelectorAll('.loreEntry')
        expect(entries.length).toBe(1)
        const select = entries[0].querySelector('select') as HTMLSelectElement
        expect(select.value).toBe(Options.moderate)

        const remove = entries[0].querySelector(
            '.creatureBuilderRemoveIcon',
        ) as HTMLElement
        remove.click()
        expect(document.querySelectorAll('.loreEntry').length).toBe(0)
    })

    it('initializes detected lore skills', () => {
        const ui = new CreatureBuilderFormUI(
            buildConfig({
                detectedLoreSkills: [
                    { name: 'Sailing', level: Options.high },
                ],
            }),
        )
        ui.initialize()

        const entry = document.querySelector('.loreEntry') as HTMLElement
        const input = entry.querySelector('input') as HTMLInputElement
        const select = entry.querySelector('select') as HTMLSelectElement
        expect(input.value).toBe('Sailing')
        expect(select.value).toBe(Options.high)
    })

    it('adds traits via dropdown and updates hidden input', () => {
        const ui = new CreatureBuilderFormUI(buildConfig())
        ui.initialize()

        const input = document.getElementById('creatureBuilderTraitsInput') as HTMLElement
        const hidden = document.getElementById('creatureBuilderTraitsHidden') as HTMLInputElement
        input.textContent = 'undead'
        input.dispatchEvent(new Event('input', { bubbles: true }))

        const item = document.querySelector('.tagify__dropdown__item') as HTMLElement
        expect(item).toBeTruthy()
        item.click()

        expect(hidden.value).toBe('undead')
        const tag = document.querySelector('tag[data-trait="undead"]')
        expect(tag).toBeTruthy()

        const removeButton = tag?.querySelector('.tagify__tag__removeBtn') as HTMLElement
        removeButton.click()
        expect(hidden.value).toBe('')
    })

    it('resets form values and clears lore/traits', () => {
        const ui = new CreatureBuilderFormUI(
            buildConfig({
                detectedTraits: ['undead'],
            }),
        )
        ui.initialize()

        const addButton = document.getElementById('addLoreButton') as HTMLButtonElement
        addButton.click()

        const level = document.getElementById('creatureBuilderLevel') as HTMLSelectElement
        const roadmap = document.getElementById('creatureBuilderRoadmap') as HTMLSelectElement
        level.value = '3'
        roadmap.value = 'TestRoadmap'

        const resetButton = document.getElementById(
            'creatureBuilderResetButton',
        ) as HTMLButtonElement
        resetButton.click()

        const hidden = document.getElementById('creatureBuilderTraitsHidden') as HTMLInputElement
        expect(hidden.value).toBe('')
        expect(document.querySelectorAll('.loreEntry').length).toBe(0)
        expect(level.value).toBe('-1')
        expect(roadmap.value).toBe('Default')
    })

    it('applies roadmap values to selects', () => {
        const ui = new CreatureBuilderFormUI(buildConfig())
        ui.initialize()

        const roadmap = document.getElementById('creatureBuilderRoadmap') as HTMLSelectElement
        roadmap.value = 'TestRoadmap'
        ui.setRoadmap(roadmap)

        const dex = document.getElementById(`creatureBuilder${Statistics.dex}`) as HTMLSelectElement
        expect(dex.value).toBe(Options.low)
    })

    it('supports keyboard navigation in the traits dropdown', () => {
        const ui = new CreatureBuilderFormUI(buildConfig())
        ui.initialize()

        const input = document.getElementById('creatureBuilderTraitsInput') as HTMLElement
        const dropdown = document.getElementById('creatureBuilderTraitsDropdown') as HTMLElement

        input.textContent = 'un'
        input.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
        )
        expect(dropdown.classList.contains('show')).toBe(true)

        input.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
        )

        const items = dropdown.querySelectorAll('.tagify__dropdown__item')
        expect(items.length).toBeGreaterThan(1)
        expect(items[0].classList.contains('tagify__dropdown__item--active')).toBe(
            true,
        )

        input.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
        )
        expect(items[1].classList.contains('tagify__dropdown__item--active')).toBe(
            true,
        )

        input.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
        )
        expect(items[0].classList.contains('tagify__dropdown__item--active')).toBe(
            true,
        )
        expect(items[1].classList.contains('tagify__dropdown__item--active')).toBe(
            false,
        )
    })

    it('handles enter, escape, and backspace keys', () => {
        const ui = new CreatureBuilderFormUI(buildConfig())
        ui.initialize()

        const input = document.getElementById('creatureBuilderTraitsInput') as HTMLElement
        const hidden = document.getElementById('creatureBuilderTraitsHidden') as HTMLInputElement
        const dropdown = document.getElementById('creatureBuilderTraitsDropdown') as HTMLElement

        input.textContent = 'undead'
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
        )
        input.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
        )
        expect(hidden.value).toBe('undead')

        input.textContent = 'un'
        input.dispatchEvent(new Event('input', { bubbles: true }))
        expect(dropdown.classList.contains('show')).toBe(true)
        input.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
        )
        expect(dropdown.classList.contains('show')).toBe(false)

        input.textContent = ''
        input.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }),
        )
        expect(hidden.value).toBe('')
    })

    it('adds a custom trait on enter without selection', () => {
        const ui = new CreatureBuilderFormUI(buildConfig())
        ui.initialize()

        const input = document.getElementById('creatureBuilderTraitsInput') as HTMLElement
        const hidden = document.getElementById('creatureBuilderTraitsHidden') as HTMLInputElement

        input.textContent = 'customtrait'
        input.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
        )

        expect(hidden.value).toBe('customtrait')
        expect(document.querySelector('tag[data-trait="customtrait"]')).toBeTruthy()
    })

    it('shows custom entries and hides when no options remain', () => {
        const ui = new CreatureBuilderFormUI(
            buildConfig({ detectedTraits: ['undead'] }),
        )
        ui.initialize()

        const input = document.getElementById('creatureBuilderTraitsInput') as HTMLElement
        const dropdown = document.getElementById('creatureBuilderTraitsDropdown') as HTMLElement

        input.textContent = 'undead'
        input.dispatchEvent(new Event('input', { bubbles: true }))
        expect(dropdown.classList.contains('show')).toBe(false)

        input.textContent = 'mycustom'
        input.dispatchEvent(new Event('input', { bubbles: true }))
        const custom = dropdown.querySelector('.tagify__dropdown__item.customEntry')
        expect(custom).toBeTruthy()
        expect(dropdown.classList.contains('show')).toBe(true)
    })

    it('moves the dropdown into document.body when positioning', () => {
        const ui = new CreatureBuilderFormUI(buildConfig())
        ui.initialize()

        const dropdown = document.getElementById('creatureBuilderTraitsDropdown') as HTMLElement
        const wrapper = document.createElement('div')
        wrapper.id = 'dropdownWrapper'
        document.querySelector('.creatureBuilderForm')?.appendChild(wrapper)
        wrapper.appendChild(dropdown)

        const input = document.getElementById('creatureBuilderTraitsInput') as HTMLElement
        input.textContent = 'undead'
        input.dispatchEvent(new Event('input', { bubbles: true }))

        expect(dropdown.parentElement).toBe(document.body)
    })

    it('throws when required elements are missing', () => {
        document.getElementById('creatureBuilderTraitsHidden')?.remove()
        const ui = new CreatureBuilderFormUI(buildConfig())
        expect(() => ui.initialize()).toThrow(
            "Element with id 'creatureBuilderTraitsHidden' not found",
        )
    })
})

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CreatureBuilderFormUI from './CreatureBuilderFormUI'
import { Options, Statistics } from './Keys'
import { statisticValues } from './Values'

const buildConfig = (
    overrides: Partial<
        ConstructorParameters<typeof CreatureBuilderFormUI>[0]
    > = {},
) => ({
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
    spellLists: {},
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
            <div id="loreSkillsContainer">
                <button id="addLoreButton" type="button">Add Lore</button>
            </div>
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
            <div class="form-group">
                <select id="creatureBuilderPF2EMONSTERMAKER.spellcasting">
                    <option value="PF2EMONSTERMAKER.none">None</option>
                    <option value="PF2EMONSTERMAKER.moderate">Moderate</option>
                    <option value="PF2EMONSTERMAKER.high">High</option>
                </select>
            </div>
            <div class="form-group">
                <select id="creatureBuilderPF2EMONSTERMAKER.spellcastingTradition">
                    <option value="PF2EMONSTERMAKER.traditionArcane">Arcane</option>
                    <option value="PF2EMONSTERMAKER.traditionPrimal">Primal</option>
                </select>
            </div>
            <div class="form-group">
                <select id="creatureBuilderPF2EMONSTERMAKER.spellcastingType">
                    <option value="PF2EMONSTERMAKER.casterPrepared">Prepared</option>
                    <option value="PF2EMONSTERMAKER.casterSpontaneous">Spontaneous</option>
                    <option value="PF2EMONSTERMAKER.casterInnate">Innate</option>
                </select>
            </div>
            <div class="form-group">
                <select id="creatureBuilderPF2EMONSTERMAKER.spellcastingAttribute">
                    <option value="PF2EMONSTERMAKER.attrInt">Intelligence</option>
                    <option value="PF2EMONSTERMAKER.attrCha">Charisma</option>
                </select>
            </div>
            <div class="form-group">
                <select id="creatureBuilderPF2EMONSTERMAKER.spellList">
                    <option value="none">None</option>
                    <option value="pyromancer">Pyromancer</option>
                </select>
            </div>
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

        const level = document.getElementById(
            'creatureBuilderLevel',
        ) as HTMLSelectElement
        const str = document.getElementById(
            `creatureBuilder${Statistics.str}`,
        ) as HTMLSelectElement
        const dex = document.getElementById(
            `creatureBuilder${Statistics.dex}`,
        ) as HTMLSelectElement

        expect(level.value).toBe('3')
        expect(str.value).toBe(Options.high)
        expect(dex.value).toBe(Options.moderate)

        const loreSection = document.getElementById(
            'sectionLore',
        ) as HTMLDetailsElement
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

        const addButton = document.getElementById(
            'addLoreButton',
        ) as HTMLButtonElement
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
                detectedLoreSkills: [{ name: 'Sailing', level: Options.high }],
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

        const input = document.getElementById(
            'creatureBuilderTraitsInput',
        ) as HTMLElement
        const hidden = document.getElementById(
            'creatureBuilderTraitsHidden',
        ) as HTMLInputElement
        input.textContent = 'undead'
        input.dispatchEvent(new Event('input', { bubbles: true }))

        const item = document.querySelector(
            '.tagify__dropdown__item',
        ) as HTMLElement
        expect(item).toBeTruthy()
        item.click()

        expect(hidden.value).toBe('undead')
        const tag = document.querySelector('tag[data-trait="undead"]')
        expect(tag).toBeTruthy()

        const removeButton = tag?.querySelector(
            '.tagify__tag__removeBtn',
        ) as HTMLElement
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

        const addButton = document.getElementById(
            'addLoreButton',
        ) as HTMLButtonElement
        addButton.click()

        const level = document.getElementById(
            'creatureBuilderLevel',
        ) as HTMLSelectElement
        const roadmap = document.getElementById(
            'creatureBuilderRoadmap',
        ) as HTMLSelectElement
        level.value = '3'
        roadmap.value = 'TestRoadmap'

        const resetButton = document.getElementById(
            'creatureBuilderResetButton',
        ) as HTMLButtonElement
        resetButton.click()

        const hidden = document.getElementById(
            'creatureBuilderTraitsHidden',
        ) as HTMLInputElement
        const addLoreButton = document.getElementById(
            'addLoreButton',
        ) as HTMLButtonElement
        expect(hidden.value).toBe('')
        expect(document.querySelectorAll('.loreEntry').length).toBe(0)
        expect(addLoreButton).toBeTruthy()
        expect(level.value).toBe('-1')
        expect(roadmap.value).toBe('Default')
    })

    it('applies roadmap values to selects', () => {
        const ui = new CreatureBuilderFormUI(buildConfig())
        ui.initialize()

        const roadmap = document.getElementById(
            'creatureBuilderRoadmap',
        ) as HTMLSelectElement
        roadmap.value = 'TestRoadmap'
        ui.setRoadmap(roadmap)

        const dex = document.getElementById(
            `creatureBuilder${Statistics.dex}`,
        ) as HTMLSelectElement
        expect(dex.value).toBe(Options.low)
    })

    it('supports keyboard navigation in the traits dropdown', () => {
        const ui = new CreatureBuilderFormUI(buildConfig())
        ui.initialize()

        const input = document.getElementById(
            'creatureBuilderTraitsInput',
        ) as HTMLElement
        const dropdown = document.getElementById(
            'creatureBuilderTraitsDropdown',
        ) as HTMLElement

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
        expect(
            items[0].classList.contains('tagify__dropdown__item--active'),
        ).toBe(true)

        input.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
        )
        expect(
            items[1].classList.contains('tagify__dropdown__item--active'),
        ).toBe(true)

        input.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
        )
        expect(
            items[0].classList.contains('tagify__dropdown__item--active'),
        ).toBe(true)
        expect(
            items[1].classList.contains('tagify__dropdown__item--active'),
        ).toBe(false)
    })

    it('handles enter, escape, and backspace keys', () => {
        const ui = new CreatureBuilderFormUI(buildConfig())
        ui.initialize()

        const input = document.getElementById(
            'creatureBuilderTraitsInput',
        ) as HTMLElement
        const hidden = document.getElementById(
            'creatureBuilderTraitsHidden',
        ) as HTMLInputElement
        const dropdown = document.getElementById(
            'creatureBuilderTraitsDropdown',
        ) as HTMLElement

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

        const input = document.getElementById(
            'creatureBuilderTraitsInput',
        ) as HTMLElement
        const hidden = document.getElementById(
            'creatureBuilderTraitsHidden',
        ) as HTMLInputElement

        input.textContent = 'customtrait'
        input.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
        )

        expect(hidden.value).toBe('customtrait')
        expect(
            document.querySelector('tag[data-trait="customtrait"]'),
        ).toBeTruthy()
    })

    it('shows custom entries and hides when no options remain', () => {
        const ui = new CreatureBuilderFormUI(
            buildConfig({ detectedTraits: ['undead'] }),
        )
        ui.initialize()

        const input = document.getElementById(
            'creatureBuilderTraitsInput',
        ) as HTMLElement
        const dropdown = document.getElementById(
            'creatureBuilderTraitsDropdown',
        ) as HTMLElement

        input.textContent = 'undead'
        input.dispatchEvent(new Event('input', { bubbles: true }))
        expect(dropdown.classList.contains('show')).toBe(false)

        input.textContent = 'mycustom'
        input.dispatchEvent(new Event('input', { bubbles: true }))
        const custom = dropdown.querySelector(
            '.tagify__dropdown__item.customEntry',
        )
        expect(custom).toBeTruthy()
        expect(dropdown.classList.contains('show')).toBe(true)
    })

    it('moves the dropdown into document.body when positioning', () => {
        const ui = new CreatureBuilderFormUI(buildConfig())
        ui.initialize()

        const dropdown = document.getElementById(
            'creatureBuilderTraitsDropdown',
        ) as HTMLElement
        const wrapper = document.createElement('div')
        wrapper.id = 'dropdownWrapper'
        document.querySelector('.creatureBuilderForm')?.appendChild(wrapper)
        wrapper.appendChild(dropdown)

        const input = document.getElementById(
            'creatureBuilderTraitsInput',
        ) as HTMLElement
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

    describe('spellcasting visibility', () => {
        it('hides spellcasting options when spellcasting is none', () => {
            vi.useFakeTimers()
            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()
            vi.runAllTimers()

            const traditionRow = document
                .getElementById(
                    'creatureBuilderPF2EMONSTERMAKER.spellcastingTradition',
                )
                ?.closest('.form-group') as HTMLElement
            const typeRow = document
                .getElementById(
                    'creatureBuilderPF2EMONSTERMAKER.spellcastingType',
                )
                ?.closest('.form-group') as HTMLElement
            const attributeRow = document
                .getElementById(
                    'creatureBuilderPF2EMONSTERMAKER.spellcastingAttribute',
                )
                ?.closest('.form-group') as HTMLElement
            const spellListRow = document
                .getElementById('creatureBuilderPF2EMONSTERMAKER.spellList')
                ?.closest('.form-group') as HTMLElement

            expect(traditionRow.style.display).toBe('none')
            expect(typeRow.style.display).toBe('none')
            expect(attributeRow.style.display).toBe('none')
            expect(spellListRow.style.display).toBe('none')
        })

        it('shows spellcasting options when spellcasting is not none', () => {
            vi.useFakeTimers()
            const spellcastingSelect = document.getElementById(
                'creatureBuilderPF2EMONSTERMAKER.spellcasting',
            ) as HTMLSelectElement
            spellcastingSelect.value = 'PF2EMONSTERMAKER.moderate'

            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()
            vi.runAllTimers()

            const traditionRow = document
                .getElementById(
                    'creatureBuilderPF2EMONSTERMAKER.spellcastingTradition',
                )
                ?.closest('.form-group') as HTMLElement
            const typeRow = document
                .getElementById(
                    'creatureBuilderPF2EMONSTERMAKER.spellcastingType',
                )
                ?.closest('.form-group') as HTMLElement
            const attributeRow = document
                .getElementById(
                    'creatureBuilderPF2EMONSTERMAKER.spellcastingAttribute',
                )
                ?.closest('.form-group') as HTMLElement
            const spellListRow = document
                .getElementById('creatureBuilderPF2EMONSTERMAKER.spellList')
                ?.closest('.form-group') as HTMLElement

            expect(traditionRow.style.display).toBe('flex')
            expect(typeRow.style.display).toBe('flex')
            expect(attributeRow.style.display).toBe('flex')
            expect(spellListRow.style.display).toBe('flex')
        })

        it('toggles visibility when spellcasting select changes', () => {
            vi.useFakeTimers()
            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()
            vi.runAllTimers()

            const spellcastingSelect = document.getElementById(
                'creatureBuilderPF2EMONSTERMAKER.spellcasting',
            ) as HTMLSelectElement

            spellcastingSelect.value = 'PF2EMONSTERMAKER.high'
            spellcastingSelect.dispatchEvent(
                new Event('change', { bubbles: true }),
            )

            const traditionRow = document
                .getElementById(
                    'creatureBuilderPF2EMONSTERMAKER.spellcastingTradition',
                )
                ?.closest('.form-group') as HTMLElement
            expect(traditionRow.style.display).toBe('flex')

            spellcastingSelect.value = 'PF2EMONSTERMAKER.none'
            spellcastingSelect.dispatchEvent(
                new Event('change', { bubbles: true }),
            )
            expect(traditionRow.style.display).toBe('none')
        })

        it('handles missing spellcasting select in visibility update', () => {
            vi.useFakeTimers()
            document
                .getElementById('creatureBuilderPF2EMONSTERMAKER.spellcasting')
                ?.remove()

            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()
            expect(() => vi.runAllTimers()).not.toThrow()
        })

        it('handles missing caster type or attribute select in updateKeyAttributeDefault', () => {
            vi.useFakeTimers()
            document
                .getElementById(
                    'creatureBuilderPF2EMONSTERMAKER.spellcastingAttribute',
                )
                ?.remove()

            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()
            vi.runAllTimers()

            const casterTypeSelect = document.getElementById(
                'creatureBuilderPF2EMONSTERMAKER.spellcastingType',
            ) as HTMLSelectElement
            expect(() =>
                casterTypeSelect.dispatchEvent(
                    new Event('change', { bubbles: true }),
                ),
            ).not.toThrow()
        })

        it('handles missing tradition/type/attribute selects in visibility update', () => {
            vi.useFakeTimers()
            document
                .getElementById(
                    'creatureBuilderPF2EMONSTERMAKER.spellcastingTradition',
                )
                ?.remove()
            document
                .getElementById(
                    'creatureBuilderPF2EMONSTERMAKER.spellcastingType',
                )
                ?.remove()
            document
                .getElementById(
                    'creatureBuilderPF2EMONSTERMAKER.spellcastingAttribute',
                )
                ?.remove()
            document
                .getElementById('creatureBuilderPF2EMONSTERMAKER.spellList')
                ?.remove()

            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()
            expect(() => vi.runAllTimers()).not.toThrow()
        })

        it('resets spell list select to none on form reset', () => {
            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()

            const spellListSelect = document.getElementById(
                'creatureBuilderPF2EMONSTERMAKER.spellList',
            ) as HTMLSelectElement
            spellListSelect.value = 'pyromancer'

            const resetButton = document.getElementById(
                'creatureBuilderResetButton',
            ) as HTMLButtonElement
            resetButton.click()

            expect(spellListSelect.value).toBe('none')
        })
    })

    describe('updateKeyAttributeDefault', () => {
        it('sets attribute to Intelligence for prepared casters', () => {
            vi.useFakeTimers()
            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()
            vi.runAllTimers()

            const casterTypeSelect = document.getElementById(
                'creatureBuilderPF2EMONSTERMAKER.spellcastingType',
            ) as HTMLSelectElement
            const attributeSelect = document.getElementById(
                'creatureBuilderPF2EMONSTERMAKER.spellcastingAttribute',
            ) as HTMLSelectElement

            attributeSelect.value = 'PF2EMONSTERMAKER.attrCha'
            casterTypeSelect.value = 'PF2EMONSTERMAKER.casterPrepared'
            casterTypeSelect.dispatchEvent(
                new Event('change', { bubbles: true }),
            )

            expect(attributeSelect.value).toBe('PF2EMONSTERMAKER.attrInt')
        })

        it('sets attribute to Charisma for spontaneous casters', () => {
            vi.useFakeTimers()
            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()
            vi.runAllTimers()

            const casterTypeSelect = document.getElementById(
                'creatureBuilderPF2EMONSTERMAKER.spellcastingType',
            ) as HTMLSelectElement
            const attributeSelect = document.getElementById(
                'creatureBuilderPF2EMONSTERMAKER.spellcastingAttribute',
            ) as HTMLSelectElement

            attributeSelect.value = 'PF2EMONSTERMAKER.attrInt'
            casterTypeSelect.value = 'PF2EMONSTERMAKER.casterSpontaneous'
            casterTypeSelect.dispatchEvent(
                new Event('change', { bubbles: true }),
            )

            expect(attributeSelect.value).toBe('PF2EMONSTERMAKER.attrCha')
        })

        it('sets attribute to Charisma for innate casters', () => {
            vi.useFakeTimers()
            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()
            vi.runAllTimers()

            const casterTypeSelect = document.getElementById(
                'creatureBuilderPF2EMONSTERMAKER.spellcastingType',
            ) as HTMLSelectElement
            const attributeSelect = document.getElementById(
                'creatureBuilderPF2EMONSTERMAKER.spellcastingAttribute',
            ) as HTMLSelectElement

            attributeSelect.value = 'PF2EMONSTERMAKER.attrInt'
            casterTypeSelect.value = 'PF2EMONSTERMAKER.casterInnate'
            casterTypeSelect.dispatchEvent(
                new Event('change', { bubbles: true }),
            )

            expect(attributeSelect.value).toBe('PF2EMONSTERMAKER.attrCha')
        })
    })

    describe('edge cases', () => {
        it('hides dropdown on click outside tagify area', () => {
            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()

            const input = document.getElementById(
                'creatureBuilderTraitsInput',
            ) as HTMLElement
            const dropdown = document.getElementById(
                'creatureBuilderTraitsDropdown',
            ) as HTMLElement

            input.textContent = 'und'
            input.dispatchEvent(new Event('input', { bubbles: true }))
            expect(dropdown.classList.contains('show')).toBe(true)

            document.dispatchEvent(new MouseEvent('click', { bubbles: true }))
            expect(dropdown.classList.contains('show')).toBe(false)
        })

        it('does not hide dropdown when clicking inside tagify', () => {
            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()

            const input = document.getElementById(
                'creatureBuilderTraitsInput',
            ) as HTMLElement
            const dropdown = document.getElementById(
                'creatureBuilderTraitsDropdown',
            ) as HTMLElement
            const tagify = document.getElementById(
                'traitsTagify',
            ) as HTMLElement

            input.textContent = 'und'
            input.dispatchEvent(new Event('input', { bubbles: true }))
            expect(dropdown.classList.contains('show')).toBe(true)

            tagify.dispatchEvent(new MouseEvent('click', { bubbles: true }))
            expect(dropdown.classList.contains('show')).toBe(true)
        })

        it('repositions dropdown on scroll when visible', () => {
            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()

            const input = document.getElementById(
                'creatureBuilderTraitsInput',
            ) as HTMLElement
            const dropdown = document.getElementById(
                'creatureBuilderTraitsDropdown',
            ) as HTMLElement

            input.textContent = 'und'
            input.dispatchEvent(new Event('input', { bubbles: true }))
            expect(dropdown.classList.contains('show')).toBe(true)

            window.dispatchEvent(new Event('scroll', { bubbles: true }))
            expect(dropdown.parentElement).toBe(document.body)
        })

        it('repositions dropdown on resize when visible', () => {
            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()

            const input = document.getElementById(
                'creatureBuilderTraitsInput',
            ) as HTMLElement
            const dropdown = document.getElementById(
                'creatureBuilderTraitsDropdown',
            ) as HTMLElement

            input.textContent = 'und'
            input.dispatchEvent(new Event('input', { bubbles: true }))
            expect(dropdown.classList.contains('show')).toBe(true)

            window.dispatchEvent(new Event('resize'))
            expect(dropdown.parentElement).toBe(document.body)
        })

        it('does not reposition dropdown on scroll when hidden', () => {
            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()

            const dropdown = document.getElementById(
                'creatureBuilderTraitsDropdown',
            ) as HTMLElement
            expect(dropdown.classList.contains('show')).toBe(false)

            const originalParent = dropdown.parentElement
            window.dispatchEvent(new Event('scroll', { bubbles: true }))
            expect(dropdown.parentElement).toBe(originalParent)
        })

        it('does not reposition dropdown on resize when hidden', () => {
            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()

            const dropdown = document.getElementById(
                'creatureBuilderTraitsDropdown',
            ) as HTMLElement
            expect(dropdown.classList.contains('show')).toBe(false)

            const originalParent = dropdown.parentElement
            window.dispatchEvent(new Event('resize'))
            expect(dropdown.parentElement).toBe(originalParent)
        })

        it('does not add duplicate traits', () => {
            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()

            const input = document.getElementById(
                'creatureBuilderTraitsInput',
            ) as HTMLElement
            const hidden = document.getElementById(
                'creatureBuilderTraitsHidden',
            ) as HTMLInputElement

            input.textContent = 'undead'
            input.dispatchEvent(new Event('input', { bubbles: true }))
            const item = document.querySelector(
                '.tagify__dropdown__item',
            ) as HTMLElement
            item.click()
            expect(hidden.value).toBe('undead')

            input.textContent = 'undead'
            input.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'Enter',
                    bubbles: true,
                }),
            )
            expect(hidden.value).toBe('undead')
        })

        it('ArrowUp when dropdown is hidden does nothing', () => {
            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()

            const input = document.getElementById(
                'creatureBuilderTraitsInput',
            ) as HTMLElement
            const dropdown = document.getElementById(
                'creatureBuilderTraitsDropdown',
            ) as HTMLElement

            expect(dropdown.classList.contains('show')).toBe(false)
            input.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'ArrowUp',
                    bubbles: true,
                }),
            )
            expect(dropdown.classList.contains('show')).toBe(false)
        })

        it('does not remove trait if not found', () => {
            const ui = new CreatureBuilderFormUI(
                buildConfig({ detectedTraits: ['undead'] }),
            )
            ui.initialize()

            const hidden = document.getElementById(
                'creatureBuilderTraitsHidden',
            ) as HTMLInputElement
            expect(hidden.value).toBe('undead')

            const tag = document.querySelector(
                'tag[data-trait="undead"]',
            ) as HTMLElement
            tag.setAttribute('data-trait', 'nonexistent')
            const removeBtn = tag.querySelector(
                '.tagify__tag__removeBtn',
            ) as HTMLElement
            removeBtn.click()
            expect(hidden.value).toBe('undead')
        })

        it('clicking on tagify area (not remove btn) focuses input and shows dropdown', () => {
            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()

            const tagify = document.getElementById(
                'traitsTagify',
            ) as HTMLElement
            const dropdown = document.getElementById(
                'creatureBuilderTraitsDropdown',
            ) as HTMLElement

            tagify.click()
            expect(dropdown.classList.contains('show')).toBe(true)
        })

        it('clicking on remove button inside tagify triggers early return', () => {
            const ui = new CreatureBuilderFormUI(
                buildConfig({ detectedTraits: ['undead'] }),
            )
            ui.initialize()

            const removeBtn = document.querySelector(
                '.tagify__tag__removeBtn',
            ) as HTMLElement
            const tagify = document.getElementById(
                'traitsTagify',
            ) as HTMLElement
            const dropdown = document.getElementById(
                'creatureBuilderTraitsDropdown',
            ) as HTMLElement

            const event = new MouseEvent('click', { bubbles: false })
            Object.defineProperty(event, 'target', {
                value: removeBtn,
                writable: false,
            })
            tagify.dispatchEvent(event)

            expect(dropdown.classList.contains('show')).toBe(false)
        })

        it('handles setRoadmap with unknown roadmap', () => {
            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()

            const dex = document.getElementById(
                `creatureBuilder${Statistics.dex}`,
            ) as HTMLSelectElement
            dex.value = Options.low

            const fakeSelect = {
                value: 'UnknownRoadmap',
            } as HTMLSelectElement
            ui.setRoadmap(fakeSelect)

            expect(dex.value).toBe(Options.low)
        })

        it('window.setRoadmap callback delegates to instance method', () => {
            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()

            const setRoadmapFn = (window as any).setRoadmap
            expect(typeof setRoadmapFn).toBe('function')

            const roadmapSelect = document.getElementById(
                'creatureBuilderRoadmap',
            ) as HTMLSelectElement
            roadmapSelect.value = 'TestRoadmap'
            setRoadmapFn(roadmapSelect)

            const dex = document.getElementById(
                `creatureBuilder${Statistics.dex}`,
            ) as HTMLSelectElement
            expect(dex.value).toBe(Options.low)
        })

        it('handles detected stat key with no matching DOM element', () => {
            vi.useFakeTimers()
            const ui = new CreatureBuilderFormUI(
                buildConfig({
                    detectedStats: { NonExistentStat: Options.high },
                }),
            )
            ui.initialize()
            expect(() => vi.runAllTimers()).not.toThrow()
        })

        it('handles roadmap key with no matching DOM element', () => {
            const ui = new CreatureBuilderFormUI(
                buildConfig({
                    creatureRoadmaps: {
                        TestRoadmap: {
                            [Statistics.dex]: Options.low,
                            NonExistentStat: Options.high,
                        },
                    },
                }),
            )
            ui.initialize()

            const roadmap = document.getElementById(
                'creatureBuilderRoadmap',
            ) as HTMLSelectElement
            roadmap.value = 'TestRoadmap'
            expect(() => ui.setRoadmap(roadmap)).not.toThrow()

            const dex = document.getElementById(
                `creatureBuilder${Statistics.dex}`,
            ) as HTMLSelectElement
            expect(dex.value).toBe(Options.low)
        })

        it('handles empty detectedStats gracefully', () => {
            vi.useFakeTimers()
            const ui = new CreatureBuilderFormUI(
                buildConfig({ detectedStats: {} }),
            )
            ui.initialize()
            vi.runAllTimers()

            const str = document.getElementById(
                `creatureBuilder${Statistics.str}`,
            ) as HTMLSelectElement
            expect(str.value).toBe(Options.moderate)
        })

        it('handles actorLevel as undefined string', () => {
            vi.useFakeTimers()
            const ui = new CreatureBuilderFormUI(
                buildConfig({ actorLevel: 'undefined' }),
            )
            ui.initialize()
            vi.runAllTimers()

            const level = document.getElementById(
                'creatureBuilderLevel',
            ) as HTMLSelectElement
            expect(level.value).toBe('-1')
        })

        it('handles actorLevel as null string', () => {
            vi.useFakeTimers()
            const ui = new CreatureBuilderFormUI(
                buildConfig({ actorLevel: 'null' }),
            )
            ui.initialize()
            vi.runAllTimers()

            const level = document.getElementById(
                'creatureBuilderLevel',
            ) as HTMLSelectElement
            expect(level.value).toBe('-1')
        })

        it('does not break Backspace when no traits exist and input is empty', () => {
            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()

            const input = document.getElementById(
                'creatureBuilderTraitsInput',
            ) as HTMLElement
            const hidden = document.getElementById(
                'creatureBuilderTraitsHidden',
            ) as HTMLInputElement

            input.textContent = ''
            input.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'Backspace',
                    bubbles: true,
                }),
            )
            expect(hidden.value).toBe('')
        })

        it('enter with no text and no selection does nothing', () => {
            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()

            const input = document.getElementById(
                'creatureBuilderTraitsInput',
            ) as HTMLElement
            const hidden = document.getElementById(
                'creatureBuilderTraitsHidden',
            ) as HTMLInputElement

            input.textContent = ''
            input.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'Enter',
                    bubbles: true,
                }),
            )
            expect(hidden.value).toBe('')
        })

        it('handles collapsible section with skill in name', () => {
            const section = document.createElement('details')
            section.className = 'collapsibleSection'
            section.setAttribute('data-section-name', 'Other Skills Section')
            section.setAttribute('open', '')
            document.body.appendChild(section)

            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()

            expect(section.hasAttribute('open')).toBe(false)
        })

        it('handles collapsible section without section-name or id', () => {
            const section = document.createElement('details')
            section.className = 'collapsibleSection'
            section.setAttribute('open', '')
            document.body.appendChild(section)

            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()

            expect(section.hasAttribute('open')).toBe(true)
        })

        it('adds lore skill with fallback placeholder when game is undefined', () => {
            delete (window as any).game
            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()

            const addButton = document.getElementById(
                'addLoreButton',
            ) as HTMLButtonElement
            addButton.click()

            const entry = document.querySelector('.loreEntry') as HTMLElement
            const input = entry.querySelector('input') as HTMLInputElement
            expect(input.placeholder).toBe('Lore Name')

            const select = entry.querySelector('select') as HTMLSelectElement
            const options = select.querySelectorAll('option')
            expect(options[0].textContent).toBe('PF2EMONSTERMAKER.none')
        })

        it('reset handles missing level, roadmap, and spellList selects', () => {
            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()

            document.getElementById('creatureBuilderLevel')?.remove()
            document.getElementById('creatureBuilderRoadmap')?.remove()
            document
                .getElementById('creatureBuilderPF2EMONSTERMAKER.spellList')
                ?.remove()

            const resetButton = document.getElementById(
                'creatureBuilderResetButton',
            ) as HTMLButtonElement
            expect(() => resetButton.click()).not.toThrow()
        })

        it('handles collapsible section with sectionName equal to PF2EMONSTERMAKER.skills', () => {
            const section = document.createElement('details')
            section.className = 'collapsibleSection'
            section.setAttribute('data-section-name', 'PF2EMONSTERMAKER.skills')
            section.setAttribute('open', '')
            document.body.appendChild(section)

            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()

            expect(section.hasAttribute('open')).toBe(false)
        })

        it('does not collapse non-skill, non-lore collapsible sections', () => {
            const section = document.createElement('details')
            section.className = 'collapsibleSection'
            section.setAttribute('data-section-name', 'Other Section')
            section.id = 'sectionOther'
            section.setAttribute('open', '')
            document.body.appendChild(section)

            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()

            expect(section.hasAttribute('open')).toBe(true)
        })

        it('handles statisticEntry with own defaultValue', () => {
            vi.useFakeTimers()
            const el = document.createElement('select')
            el.id = 'creatureBuilderCustomStat'
            const optHigh = document.createElement('option')
            optHigh.value = Options.high
            optHigh.textContent = 'high'
            el.appendChild(optHigh)
            const optMod = document.createElement('option')
            optMod.value = Options.moderate
            optMod.textContent = 'moderate'
            el.appendChild(optMod)
            document.body.appendChild(el)

            const ui = new CreatureBuilderFormUI(
                buildConfig({
                    creatureStatistics: [
                        {
                            name: 'Custom',
                            defaultValue: Options.moderate,
                            statisticEntries: [
                                {
                                    name: 'CustomStat',
                                    defaultValue: Options.high,
                                },
                            ],
                        },
                    ],
                }),
            )
            ui.initialize()
            vi.runAllTimers()

            expect(el.value).toBe(Options.high)
        })
    })

    describe('Modern UI — Stat Highlights', () => {
        const setupModernDom = () => {
            setupDom()
            const dropZone = document.createElement('div')
            dropZone.id = 'creatureBuilderDropZone'
            dropZone.className = 'creature-builder-drop-zone'
            document.body.appendChild(dropZone)

            const hint = document.createElement('p')
            hint.id = 'dropZoneHint'
            hint.className = 'drop-zone-hint'
            dropZone.appendChild(hint)

            const list = document.createElement('div')
            list.id = 'droppedItemsList'
            list.className = 'dropped-items-list'
            dropZone.appendChild(list)

            const previewBar = document.createElement('div')
            previewBar.id = 'statPreviewBar'
            previewBar.className = 'stat-preview-bar'
            const previewStats = [
                'PF2EMONSTERMAKER.hp',
                'PF2EMONSTERMAKER.ac',
                'PF2EMONSTERMAKER.fort',
                'PF2EMONSTERMAKER.ref',
                'PF2EMONSTERMAKER.wil',
                'PF2EMONSTERMAKER.per',
                'PF2EMONSTERMAKER.strikeBonus',
                'PF2EMONSTERMAKER.strikeDamage',
                'PF2EMONSTERMAKER.spellcasting',
            ]
            for (const key of previewStats) {
                const span = document.createElement('span')
                span.className = 'preview-stat'
                span.dataset.stat = key
                span.textContent = '--'
                previewBar.appendChild(span)
            }
            document.body.appendChild(previewBar)
        }

        it('applies stat-level-high class when option is high', () => {
            vi.useFakeTimers()
            setupModernDom()
            const ui = new CreatureBuilderFormUI(
                buildConfig({
                    detectedStats: { [Statistics.str]: Options.high },
                    isModern: true,
                }),
            )
            ui.initialize()
            vi.runAllTimers()

            const strSelect = document.getElementById(
                `creatureBuilder${Statistics.str}`,
            ) as HTMLSelectElement
            expect(strSelect.classList.contains('stat-level-high')).toBe(true)
        })

        it('applies stat-level-moderate by default', () => {
            vi.useFakeTimers()
            setupModernDom()
            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true }),
            )
            ui.initialize()
            vi.runAllTimers()

            const strSelect = document.getElementById(
                `creatureBuilder${Statistics.str}`,
            ) as HTMLSelectElement
            expect(strSelect.classList.contains('stat-level-moderate')).toBe(
                true,
            )
        })

        it('updates highlight class on select change', () => {
            vi.useFakeTimers()
            setupModernDom()
            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true }),
            )
            ui.initialize()
            vi.runAllTimers()

            const strSelect = document.getElementById(
                `creatureBuilder${Statistics.str}`,
            ) as HTMLSelectElement
            strSelect.value = Options.high
            strSelect.dispatchEvent(new Event('change'))

            expect(strSelect.classList.contains('stat-level-high')).toBe(true)
            expect(strSelect.classList.contains('stat-level-moderate')).toBe(
                false,
            )
        })

        it('applies highlight to all selects after roadmap change', () => {
            vi.useFakeTimers()
            setupModernDom()
            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true }),
            )
            ui.initialize()
            vi.runAllTimers()

            const roadmapSelect = document.getElementById(
                'creatureBuilderRoadmap',
            ) as HTMLSelectElement
            roadmapSelect.value = 'TestRoadmap'
            ui.setRoadmap(roadmapSelect)

            const dexSelect = document.getElementById(
                `creatureBuilder${Statistics.dex}`,
            ) as HTMLSelectElement
            expect(dexSelect.classList.contains('stat-level-low')).toBe(true)
        })

        it('does not apply highlights in classic mode', () => {
            vi.useFakeTimers()
            setupDom()
            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: false }),
            )
            ui.initialize()
            vi.runAllTimers()

            const strSelect = document.getElementById(
                `creatureBuilder${Statistics.str}`,
            ) as HTMLSelectElement
            const hasHighlightClass = (
                CreatureBuilderFormUI as any
            ).STAT_LEVEL_CLASSES.some((cls: string) =>
                strSelect.classList.contains(cls),
            )
            expect(hasHighlightClass).toBe(false)
        })
    })

    describe('Modern UI — Live Preview', () => {
        const setupModernDom = () => {
            setupDom()
            const dropZone = document.createElement('div')
            dropZone.id = 'creatureBuilderDropZone'
            document.body.appendChild(dropZone)

            const hint = document.createElement('p')
            hint.id = 'dropZoneHint'
            dropZone.appendChild(hint)

            const list = document.createElement('div')
            list.id = 'droppedItemsList'
            dropZone.appendChild(list)

            const previewBar = document.createElement('div')
            previewBar.id = 'statPreviewBar'
            previewBar.className = 'stat-preview-bar'
            const previewStats = [
                'PF2EMONSTERMAKER.hp',
                'PF2EMONSTERMAKER.ac',
                'PF2EMONSTERMAKER.fort',
                'PF2EMONSTERMAKER.ref',
                'PF2EMONSTERMAKER.wil',
                'PF2EMONSTERMAKER.per',
                'PF2EMONSTERMAKER.strikeBonus',
                'PF2EMONSTERMAKER.strikeDamage',
                'PF2EMONSTERMAKER.spellcasting',
            ]
            for (const key of previewStats) {
                const span = document.createElement('span')
                span.className = 'preview-stat'
                span.dataset.stat = key
                span.textContent = '--'
                previewBar.appendChild(span)
            }
            document.body.appendChild(previewBar)
        }

        it('shows -- for stats not in the value table', () => {
            vi.useFakeTimers()
            setupModernDom()
            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true }),
            )
            ui.initialize()
            vi.runAllTimers()

            const hpSpan = document.querySelector(
                '.preview-stat[data-stat="PF2EMONSTERMAKER.hp"]',
            ) as HTMLElement
            expect(hpSpan.textContent).toContain('--')
        })

        it('updates preview when level changes', () => {
            vi.useFakeTimers()
            setupModernDom()

            const hpSelect = document.createElement('select')
            hpSelect.id = 'creatureBuilderPF2EMONSTERMAKER.hp'
            const optMod = document.createElement('option')
            optMod.value = Options.moderate
            hpSelect.appendChild(optMod)
            const optHigh = document.createElement('option')
            optHigh.value = Options.high
            hpSelect.appendChild(optHigh)
            document.body.appendChild(hpSelect)
            hpSelect.value = Options.moderate

            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true }),
            )
            ui.initialize()
            vi.runAllTimers()

            const levelSelect = document.getElementById(
                'creatureBuilderLevel',
            ) as HTMLSelectElement
            levelSelect.value = '3'
            levelSelect.dispatchEvent(new Event('change'))
            vi.runAllTimers()

            const hpSpan = document.querySelector(
                '.preview-stat[data-stat="PF2EMONSTERMAKER.hp"]',
            ) as HTMLElement
            expect(hpSpan.textContent).not.toBe('--')
            expect(hpSpan.textContent).toContain('HP')
        })

        it('shows -- when stat option has no value for selected level', () => {
            vi.useFakeTimers()
            setupModernDom()

            const fortSelect = document.createElement('select')
            fortSelect.id = 'creatureBuilderPF2EMONSTERMAKER.fort'
            const optExtreme = document.createElement('option')
            optExtreme.value = 'PF2EMONSTERMAKER.bogusOption'
            optExtreme.textContent = 'Bogus'
            fortSelect.appendChild(optExtreme)
            document.body.appendChild(fortSelect)
            fortSelect.value = 'PF2EMONSTERMAKER.bogusOption'

            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true, actorLevel: '1' }),
            )
            ui.initialize()
            vi.runAllTimers()

            ui.updateStatPreview()

            const fortSpan = document.querySelector(
                '.preview-stat[data-stat="PF2EMONSTERMAKER.fort"]',
            ) as HTMLElement
            expect(fortSpan.textContent).toContain('Fort')
            expect(fortSpan.textContent).toContain('--')
        })

        it('shows -- for stats with none selected', () => {
            vi.useFakeTimers()
            setupModernDom()

            const spellSelect = document.getElementById(
                'creatureBuilderPF2EMONSTERMAKER.spellcasting',
            ) as HTMLSelectElement
            spellSelect.value = 'PF2EMONSTERMAKER.none'

            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true }),
            )
            ui.initialize()
            vi.runAllTimers()

            ui.updateStatPreview()
        })

        it('shows value when stat and level are valid', () => {
            vi.useFakeTimers()
            setupModernDom()

            const acSelect = document.createElement('select')
            acSelect.id = 'creatureBuilderPF2EMONSTERMAKER.ac'
            const optMod = document.createElement('option')
            optMod.value = Options.moderate
            acSelect.appendChild(optMod)
            const optHigh = document.createElement('option')
            optHigh.value = Options.high
            acSelect.appendChild(optHigh)
            document.body.appendChild(acSelect)
            acSelect.value = Options.moderate

            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true, actorLevel: '1' }),
            )
            ui.initialize()
            vi.runAllTimers()

            const acSpan = document.querySelector(
                '.preview-stat[data-stat="PF2EMONSTERMAKER.ac"]',
            ) as HTMLElement
            expect(acSpan.textContent).toContain('AC')
            expect(acSpan.textContent).not.toContain('--')
        })

        it('applies preview highlight with a valid option value', () => {
            vi.useFakeTimers()
            setupModernDom()

            const acSelect = document.createElement('select')
            acSelect.id = 'creatureBuilderPF2EMONSTERMAKER.ac'
            const optHigh = document.createElement('option')
            optHigh.value = Options.high
            acSelect.appendChild(optHigh)
            document.body.appendChild(acSelect)
            acSelect.value = Options.high

            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true, actorLevel: '1' }),
            )
            ui.initialize()
            vi.runAllTimers()

            const acSpan = document.querySelector(
                '.preview-stat[data-stat="PF2EMONSTERMAKER.ac"]',
            ) as HTMLElement
            expect(acSpan.classList.contains('stat-level-high')).toBe(true)
        })

        it('handles updateStatPreview gracefully when no level select exists', () => {
            vi.useFakeTimers()
            setupModernDom()

            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true }),
            )
            ui.initialize()
            vi.runAllTimers()

            const levelSelect = document.getElementById('creatureBuilderLevel')
            levelSelect?.remove()

            ui.updateStatPreview()
        })

        it('applies no highlight class for an unknown option value', () => {
            vi.useFakeTimers()
            setupModernDom()

            const acSelect = document.createElement('select')
            acSelect.id = 'creatureBuilderPF2EMONSTERMAKER.ac'
            const optCustom = document.createElement('option')
            optCustom.value = 'PF2EMONSTERMAKER.unknown'
            acSelect.appendChild(optCustom)
            document.body.appendChild(acSelect)
            acSelect.value = 'PF2EMONSTERMAKER.unknown'

            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true, actorLevel: '1' }),
            )
            ui.initialize()
            vi.runAllTimers()

            const acSpan = document.querySelector(
                '.preview-stat[data-stat="PF2EMONSTERMAKER.ac"]',
            ) as HTMLElement
            const hasHighlightClass = (
                CreatureBuilderFormUI as any
            ).STAT_LEVEL_CLASSES.some((cls: string) =>
                acSpan.classList.contains(cls),
            )
            expect(hasHighlightClass).toBe(false)
        })

        it('does not render preview in classic mode', () => {
            vi.useFakeTimers()
            setupDom()
            const previewBar = document.createElement('div')
            previewBar.className = 'stat-preview-bar'
            const span = document.createElement('span')
            span.className = 'preview-stat'
            span.dataset.stat = 'PF2EMONSTERMAKER.hp'
            span.textContent = 'HP --'
            previewBar.appendChild(span)
            document.body.appendChild(previewBar)

            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: false }),
            )
            ui.initialize()
            vi.runAllTimers()

            expect(span.textContent).toBe('HP --')
        })

        it('updates inline stat badges with numeric values', () => {
            vi.useFakeTimers()
            setupModernDom()

            const strBadge = document.createElement('span')
            strBadge.className = 'stat-value-badge'
            strBadge.dataset.statBadge = Statistics.str
            strBadge.textContent = '--'
            document.body.appendChild(strBadge)

            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true, actorLevel: '1' }),
            )
            ui.initialize()
            vi.runAllTimers()

            expect(strBadge.textContent).toMatch(/^[+-]?\d+$/)
        })

        it('shows -- in inline badge when stat is set to none', () => {
            vi.useFakeTimers()
            setupModernDom()

            const spellBadge = document.createElement('span')
            spellBadge.className = 'stat-value-badge'
            spellBadge.dataset.statBadge = 'PF2EMONSTERMAKER.spellcasting'
            spellBadge.textContent = '--'
            document.body.appendChild(spellBadge)

            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true }),
            )
            ui.initialize()
            vi.runAllTimers()

            expect(spellBadge.textContent).toBe('--')
        })

        it('shows raw value in badge for non-numeric stat values', () => {
            vi.useFakeTimers()
            setupModernDom()

            const dmgSelect = document.createElement('select')
            dmgSelect.id = 'creatureBuilderPF2EMONSTERMAKER.strikeDamage'
            const optMod = document.createElement('option')
            optMod.value = Options.moderate
            dmgSelect.appendChild(optMod)
            document.body.appendChild(dmgSelect)
            dmgSelect.value = Options.moderate

            const dmgBadge = document.createElement('span')
            dmgBadge.className = 'stat-value-badge'
            dmgBadge.dataset.statBadge = 'PF2EMONSTERMAKER.strikeDamage'
            dmgBadge.textContent = '--'
            document.body.appendChild(dmgBadge)

            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true, actorLevel: '1' }),
            )
            ui.initialize()
            vi.runAllTimers()

            expect(dmgBadge.textContent).not.toBe('--')
            expect(dmgBadge.textContent).toContain('d')
        })
    })

    describe('Modern UI — Drop Zone', () => {
        const setupModernDom = () => {
            setupDom()
            const dropZone = document.createElement('div')
            dropZone.id = 'creatureBuilderDropZone'
            dropZone.className = 'creature-builder-drop-zone'
            document.body.appendChild(dropZone)

            const hint = document.createElement('p')
            hint.id = 'dropZoneHint'
            hint.className = 'drop-zone-hint'
            dropZone.appendChild(hint)

            const list = document.createElement('div')
            list.id = 'droppedItemsList'
            list.className = 'dropped-items-list'
            dropZone.appendChild(list)

            const previewBar = document.createElement('div')
            previewBar.id = 'statPreviewBar'
            document.body.appendChild(previewBar)
        }

        it('adds drag-over class on dragover', () => {
            vi.useFakeTimers()
            setupModernDom()
            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true }),
            )
            ui.initialize()
            vi.runAllTimers()

            const dropZone = document.getElementById('creatureBuilderDropZone')!
            dropZone.dispatchEvent(
                new Event('dragover', { bubbles: true, cancelable: true }),
            )
            expect(dropZone.classList.contains('drag-over')).toBe(true)
        })

        it('removes drag-over class on drop', () => {
            vi.useFakeTimers()
            setupModernDom()
            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true }),
            )
            ui.initialize()
            vi.runAllTimers()

            const dropZone = document.getElementById('creatureBuilderDropZone')!
            dropZone.classList.add('drag-over')
            dropZone.dispatchEvent(new Event('drop'))
            expect(dropZone.classList.contains('drag-over')).toBe(false)
        })

        it('removes drag-over class on dragleave', () => {
            vi.useFakeTimers()
            setupModernDom()
            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true }),
            )
            ui.initialize()
            vi.runAllTimers()

            const dropZone = document.getElementById('creatureBuilderDropZone')!
            dropZone.classList.add('drag-over')
            dropZone.dispatchEvent(new Event('dragleave'))
            expect(dropZone.classList.contains('drag-over')).toBe(false)
        })

        it('renders a dropped item row', () => {
            vi.useFakeTimers()
            setupModernDom()
            const droppedItems: Record<string, unknown>[] = []
            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true, droppedItems }),
            )
            ui.initialize()
            vi.runAllTimers()

            const itemData = {
                name: 'Fireball',
                type: 'spell',
                img: 'icons/fireball.svg',
            }
            droppedItems.push(itemData)
            ui.renderDroppedItem(itemData)

            const list = document.getElementById('droppedItemsList')!
            expect(list.children).toHaveLength(1)
            expect(
                list.children[0].querySelector('.dropped-item-name')!
                    .textContent,
            ).toBe('Fireball')
            expect(
                list.children[0].querySelector('.dropped-item-type')!
                    .textContent,
            ).toBe('spell')
        })

        it('removes a dropped item when clicking remove button', () => {
            vi.useFakeTimers()
            setupModernDom()
            const droppedItems: Record<string, unknown>[] = []
            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true, droppedItems }),
            )
            ui.initialize()
            vi.runAllTimers()

            const itemData = {
                name: 'Fireball',
                type: 'spell',
                img: 'icons/fireball.svg',
            }
            droppedItems.push(itemData)
            ui.renderDroppedItem(itemData)

            const removeBtn = document.querySelector(
                '.dropped-item-remove',
            ) as HTMLElement
            removeBtn.click()

            expect(droppedItems).toHaveLength(0)
            expect(
                document.getElementById('droppedItemsList')!.children,
            ).toHaveLength(0)
        })

        it('hides hint when items are present and shows after clearing', () => {
            vi.useFakeTimers()
            setupModernDom()
            const droppedItems: Record<string, unknown>[] = []
            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true, droppedItems }),
            )
            ui.initialize()
            vi.runAllTimers()

            const hint = document.getElementById('dropZoneHint')!

            const itemData = { name: 'Fireball', type: 'spell' }
            droppedItems.push(itemData)
            ui.renderDroppedItem(itemData)
            expect(hint.classList.contains('hidden')).toBe(true)

            const removeBtn = document.querySelector(
                '.dropped-item-remove',
            ) as HTMLElement
            removeBtn.click()
            expect(hint.classList.contains('hidden')).toBe(false)
        })

        it('clears dropped items on reset', () => {
            vi.useFakeTimers()
            setupModernDom()
            const droppedItems: Record<string, unknown>[] = []
            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true, droppedItems }),
            )
            ui.initialize()
            vi.runAllTimers()

            const itemData = { name: 'Fireball', type: 'spell' }
            droppedItems.push(itemData)
            ui.renderDroppedItem(itemData)

            const resetBtn = document.getElementById(
                'creatureBuilderResetButton',
            )!
            resetBtn.click()

            expect(droppedItems).toHaveLength(0)
            expect(
                document.getElementById('droppedItemsList')!.children,
            ).toHaveLength(0)
        })
    })

    describe('Modern UI — Badge Toggle', () => {
        const setupModernDomWithToggle = () => {
            setupDom()
            const wrapper = document.querySelector('.creatureBuilderForm')!
            wrapper.classList.add('creatureBuilderFormModern')

            const toggle = document.createElement('input')
            toggle.type = 'checkbox'
            toggle.id = 'toggleBadges'
            toggle.checked = true
            wrapper.appendChild(toggle)

            const dropZone = document.createElement('div')
            dropZone.id = 'creatureBuilderDropZone'
            document.body.appendChild(dropZone)
            const hint = document.createElement('p')
            hint.id = 'dropZoneHint'
            dropZone.appendChild(hint)
            const list = document.createElement('div')
            list.id = 'droppedItemsList'
            dropZone.appendChild(list)
            const previewBar = document.createElement('div')
            previewBar.id = 'statPreviewBar'
            document.body.appendChild(previewBar)
        }

        it('adds hide-badges class when toggle is unchecked', () => {
            vi.useFakeTimers()
            setupModernDomWithToggle()
            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true }),
            )
            ui.initialize()
            vi.runAllTimers()

            const toggle = document.getElementById(
                'toggleBadges',
            ) as HTMLInputElement
            const form = toggle.closest(
                '.creatureBuilderFormModern',
            ) as HTMLElement

            toggle.checked = false
            toggle.dispatchEvent(new Event('change'))
            expect(form.classList.contains('hide-badges')).toBe(true)
        })

        it('removes hide-badges class when toggle is checked', () => {
            vi.useFakeTimers()
            setupModernDomWithToggle()
            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true }),
            )
            ui.initialize()
            vi.runAllTimers()

            const toggle = document.getElementById(
                'toggleBadges',
            ) as HTMLInputElement
            const form = toggle.closest(
                '.creatureBuilderFormModern',
            ) as HTMLElement

            toggle.checked = false
            toggle.dispatchEvent(new Event('change'))
            expect(form.classList.contains('hide-badges')).toBe(true)

            toggle.checked = true
            toggle.dispatchEvent(new Event('change'))
            expect(form.classList.contains('hide-badges')).toBe(false)
        })

        it('does nothing when toggle element is missing', () => {
            vi.useFakeTimers()
            setupDom()
            const dropZone = document.createElement('div')
            dropZone.id = 'creatureBuilderDropZone'
            document.body.appendChild(dropZone)
            const hint = document.createElement('p')
            hint.id = 'dropZoneHint'
            dropZone.appendChild(hint)
            const list = document.createElement('div')
            list.id = 'droppedItemsList'
            dropZone.appendChild(list)
            const previewBar = document.createElement('div')
            previewBar.id = 'statPreviewBar'
            document.body.appendChild(previewBar)

            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true }),
            )
            expect(() => {
                ui.initialize()
                vi.runAllTimers()
            }).not.toThrow()
        })
    })

    describe('Modern UI — Preview Roadmap Level & Ability Scores', () => {
        const setupFullModernDom = () => {
            setupDom()
            const dropZone = document.createElement('div')
            dropZone.id = 'creatureBuilderDropZone'
            document.body.appendChild(dropZone)
            const hint = document.createElement('p')
            hint.id = 'dropZoneHint'
            dropZone.appendChild(hint)
            const list = document.createElement('div')
            list.id = 'droppedItemsList'
            dropZone.appendChild(list)

            const previewBar = document.createElement('div')
            previewBar.id = 'statPreviewBar'
            previewBar.className = 'stat-preview-bar'

            const roadmapLevel = document.createElement('span')
            roadmapLevel.id = 'previewRoadmapLevel'
            roadmapLevel.className = 'preview-roadmap-level'
            previewBar.appendChild(roadmapLevel)

            const abilityScores = document.createElement('div')
            abilityScores.id = 'previewAbilityScores'
            abilityScores.className = 'preview-ability-scores'
            const abilities = [
                'PF2EMONSTERMAKER.str',
                'PF2EMONSTERMAKER.dex',
                'PF2EMONSTERMAKER.con',
                'PF2EMONSTERMAKER.int',
                'PF2EMONSTERMAKER.wis',
                'PF2EMONSTERMAKER.cha',
            ]
            for (const key of abilities) {
                const span = document.createElement('span')
                span.dataset.ability = key
                span.textContent = '--'
                abilityScores.appendChild(span)
            }
            previewBar.appendChild(abilityScores)

            const previewStats = [
                'PF2EMONSTERMAKER.hp',
                'PF2EMONSTERMAKER.ac',
                'PF2EMONSTERMAKER.per',
                'PF2EMONSTERMAKER.fort',
                'PF2EMONSTERMAKER.ref',
                'PF2EMONSTERMAKER.wil',
                'PF2EMONSTERMAKER.strikeBonus',
                'PF2EMONSTERMAKER.strikeDamage',
                'PF2EMONSTERMAKER.spellcasting',
            ]
            for (const key of previewStats) {
                const span = document.createElement('span')
                span.className = 'preview-stat'
                span.dataset.stat = key
                span.textContent = '--'
                previewBar.appendChild(span)
            }
            document.body.appendChild(previewBar)
        }

        it('displays roadmap name and level in preview', () => {
            vi.useFakeTimers()
            setupFullModernDom()
            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true, actorLevel: '3' }),
            )
            ui.initialize()
            vi.runAllTimers()

            const el = document.getElementById('previewRoadmapLevel')!
            expect(el.textContent).toContain('Default')
            expect(el.textContent).toContain('lvl')
        })

        it('shows ability score values with + prefix for positive mods', () => {
            vi.useFakeTimers()
            setupFullModernDom()
            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true, actorLevel: '1' }),
            )
            ui.initialize()
            vi.runAllTimers()

            const strSpan = document.querySelector(
                '[data-ability="PF2EMONSTERMAKER.str"]',
            ) as HTMLElement
            expect(strSpan.textContent).toContain('STR')
            expect(strSpan.textContent).toContain('+')
        })

        it('shows -- for ability score when set to none', () => {
            vi.useFakeTimers()
            setupFullModernDom()

            const strSelect = document.getElementById(
                `creatureBuilder${Statistics.str}`,
            ) as HTMLSelectElement
            const optNone = document.createElement('option')
            optNone.value = 'PF2EMONSTERMAKER.none'
            strSelect.appendChild(optNone)

            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true, actorLevel: '1' }),
            )
            ui.initialize()
            vi.runAllTimers()

            strSelect.value = 'PF2EMONSTERMAKER.none'
            ui.updateStatPreview()

            const strSpan = document.querySelector(
                '[data-ability="PF2EMONSTERMAKER.str"]',
            ) as HTMLElement
            expect(strSpan.textContent).toContain('STR')
            expect(strSpan.textContent).toContain('--')
        })

        it('shows -- for ability score when value table has no match', () => {
            vi.useFakeTimers()
            setupFullModernDom()

            const strSelect = document.getElementById(
                `creatureBuilder${Statistics.str}`,
            ) as HTMLSelectElement
            const optBogus = document.createElement('option')
            optBogus.value = 'PF2EMONSTERMAKER.bogus'
            strSelect.appendChild(optBogus)

            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true, actorLevel: '1' }),
            )
            ui.initialize()
            vi.runAllTimers()

            strSelect.value = 'PF2EMONSTERMAKER.bogus'
            ui.updateStatPreview()

            const strSpan = document.querySelector(
                '[data-ability="PF2EMONSTERMAKER.str"]',
            ) as HTMLElement
            expect(strSpan.textContent).toContain('--')
        })

        it('hides spell DC preview when spellcasting is none', () => {
            vi.useFakeTimers()
            setupFullModernDom()

            const spellSelect = document.getElementById(
                'creatureBuilderPF2EMONSTERMAKER.spellcasting',
            ) as HTMLSelectElement
            spellSelect.value = 'PF2EMONSTERMAKER.none'

            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true, actorLevel: '1' }),
            )
            ui.initialize()
            vi.runAllTimers()

            const spellSpan = document.querySelector(
                '.preview-stat[data-stat="PF2EMONSTERMAKER.spellcasting"]',
            ) as HTMLElement
            expect(spellSpan.style.display).toBe('none')
        })

        it('shows spell DC preview with offset when spellcasting has a value', () => {
            vi.useFakeTimers()
            setupFullModernDom()

            const spellSelect = document.getElementById(
                'creatureBuilderPF2EMONSTERMAKER.spellcasting',
            ) as HTMLSelectElement
            spellSelect.value = 'PF2EMONSTERMAKER.moderate'
            spellSelect.dispatchEvent(new Event('change', { bubbles: true }))

            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true, actorLevel: '1' }),
            )
            ui.initialize()
            vi.runAllTimers()

            const spellSpan = document.querySelector(
                '.preview-stat[data-stat="PF2EMONSTERMAKER.spellcasting"]',
            ) as HTMLElement
            expect(spellSpan.style.display).not.toBe('none')
            expect(spellSpan.textContent).toContain('Spell DC')
        })

        it('updates preview when roadmap select changes', () => {
            vi.useFakeTimers()
            setupFullModernDom()
            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true, actorLevel: '1' }),
            )
            ui.initialize()
            vi.runAllTimers()

            const roadmapSelect = document.getElementById(
                'creatureBuilderRoadmap',
            ) as HTMLSelectElement
            roadmapSelect.value = 'TestRoadmap'
            roadmapSelect.dispatchEvent(new Event('change'))

            const el = document.getElementById('previewRoadmapLevel')!
            expect(el.textContent).toContain('lvl')
            expect(el.textContent).toContain('TestRoadmap')
        })
    })

    describe('Modern UI — Inline Badge Edge Cases', () => {
        const setupModernDomWithBadges = () => {
            setupDom()
            const dropZone = document.createElement('div')
            dropZone.id = 'creatureBuilderDropZone'
            document.body.appendChild(dropZone)
            const hint = document.createElement('p')
            hint.id = 'dropZoneHint'
            dropZone.appendChild(hint)
            const list = document.createElement('div')
            list.id = 'droppedItemsList'
            dropZone.appendChild(list)
            const previewBar = document.createElement('div')
            previewBar.id = 'statPreviewBar'
            previewBar.className = 'stat-preview-bar'
            const previewStats = [
                'PF2EMONSTERMAKER.hp',
                'PF2EMONSTERMAKER.ac',
                'PF2EMONSTERMAKER.spellcasting',
            ]
            for (const key of previewStats) {
                const span = document.createElement('span')
                span.className = 'preview-stat'
                span.dataset.stat = key
                previewBar.appendChild(span)
            }
            document.body.appendChild(previewBar)
        }

        it('shows spellcasting badge with +8 offset', () => {
            vi.useFakeTimers()
            setupModernDomWithBadges()

            const spellSelect = document.getElementById(
                'creatureBuilderPF2EMONSTERMAKER.spellcasting',
            ) as HTMLSelectElement
            spellSelect.value = 'PF2EMONSTERMAKER.moderate'

            const badge = document.createElement('span')
            badge.className = 'stat-value-badge'
            badge.dataset.statBadge = 'PF2EMONSTERMAKER.spellcasting'
            badge.textContent = '--'
            document.body.appendChild(badge)

            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true, actorLevel: '1' }),
            )
            ui.initialize()
            vi.runAllTimers()

            const expectedBase = Number.parseInt(
                statisticValues[Statistics.spellcasting]['1'][Options.moderate],
                10,
            )
            const rawValue = Number.parseInt(badge.textContent!, 10)
            expect(rawValue).toBe(expectedBase + 8)
        })

        it('shows HP badge without + prefix', () => {
            vi.useFakeTimers()
            setupModernDomWithBadges()

            const hpSelect = document.createElement('select')
            hpSelect.id = 'creatureBuilderPF2EMONSTERMAKER.hp'
            const opt = document.createElement('option')
            opt.value = Options.moderate
            hpSelect.appendChild(opt)
            document.body.appendChild(hpSelect)
            hpSelect.value = Options.moderate

            const badge = document.createElement('span')
            badge.className = 'stat-value-badge'
            badge.dataset.statBadge = 'PF2EMONSTERMAKER.hp'
            badge.textContent = '--'
            document.body.appendChild(badge)

            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true, actorLevel: '1' }),
            )
            ui.initialize()
            vi.runAllTimers()

            expect(badge.textContent).not.toContain('+')
            expect(badge.textContent).not.toBe('--')
        })

        it('shows AC badge without + prefix', () => {
            vi.useFakeTimers()
            setupModernDomWithBadges()

            const acSelect = document.createElement('select')
            acSelect.id = 'creatureBuilderPF2EMONSTERMAKER.ac'
            const opt = document.createElement('option')
            opt.value = Options.moderate
            acSelect.appendChild(opt)
            document.body.appendChild(acSelect)
            acSelect.value = Options.moderate

            const badge = document.createElement('span')
            badge.className = 'stat-value-badge'
            badge.dataset.statBadge = 'PF2EMONSTERMAKER.ac'
            badge.textContent = '--'
            document.body.appendChild(badge)

            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true, actorLevel: '1' }),
            )
            ui.initialize()
            vi.runAllTimers()

            expect(badge.textContent).not.toContain('+')
            expect(badge.textContent).not.toBe('--')
        })

        it('shows -- in badge when no matching select exists', () => {
            vi.useFakeTimers()
            setupModernDomWithBadges()

            const badge = document.createElement('span')
            badge.className = 'stat-value-badge'
            badge.dataset.statBadge = 'PF2EMONSTERMAKER.nonexistent'
            badge.textContent = 'old'
            document.body.appendChild(badge)

            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true, actorLevel: '1' }),
            )
            ui.initialize()
            vi.runAllTimers()

            expect(badge.textContent).toBe('--')
        })

        it('shows -- in badge when value table has no match for option', () => {
            vi.useFakeTimers()
            setupModernDomWithBadges()

            const strSelect = document.getElementById(
                `creatureBuilder${Statistics.str}`,
            ) as HTMLSelectElement
            const optBogus = document.createElement('option')
            optBogus.value = 'PF2EMONSTERMAKER.bogus'
            strSelect.appendChild(optBogus)

            const badge = document.createElement('span')
            badge.className = 'stat-value-badge'
            badge.dataset.statBadge = Statistics.str
            badge.textContent = 'old'
            document.body.appendChild(badge)

            const ui = new CreatureBuilderFormUI(
                buildConfig({ isModern: true, actorLevel: '1' }),
            )
            ui.initialize()
            vi.runAllTimers()

            strSelect.value = 'PF2EMONSTERMAKER.bogus'
            ui.updateStatPreview()

            expect(badge.textContent).toBe('--')
        })
    })
})

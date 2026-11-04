// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import Handlebars from 'handlebars'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SpellListCollection } from '@/spellcasting/model/spellList'
import {
    CREATURE_SIZE_FIELD,
    FALLBACK_CREATURE_SIZES,
} from '@/systems/creatureSizes'
import enLang from '../public/languages/en.json'
import CreatureBuilderFormUI, {
    capturePreservedControls,
} from './CreatureBuilderFormUI'
import { DefaultCreatureStatistics, Levels, Options, Statistics } from './Keys'
import { statisticValues } from './Values'

const buildConfig = (
    overrides: Partial<
        ConstructorParameters<typeof CreatureBuilderFormUI>[0]
    > = {},
) =>
    ({
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
        root: document.body,
        idPrefix: '',
        ...overrides,
    }) as ConstructorParameters<typeof CreatureBuilderFormUI>[0]

const setupDom = () => {
    document.body.innerHTML = `
        <div class="creatureBuilderForm">
            <input id="creatureBuilderTraitsHidden" />
            <div id="loreSkillsContainer">
                <button id="addLoreButton" type="button">Add Lore</button>
            </div>
            <div id="manualAttacksContainer">
                <button id="addAttackButton" type="button" data-action="addAttack">Add Attack</button>
            </div>
            <select id="creatureBuilder${Statistics.strikeBonus}" name="${Statistics.strikeBonus}">
                <option value="${Options.moderate}">moderate</option>
                <option value="${Options.high}">high</option>
                <option value="${Options.low}">low</option>
                <option value="${Options.extreme}">extreme</option>
            </select>
            <select id="creatureBuilder${Statistics.strikeDamage}" name="${Statistics.strikeDamage}">
                <option value="${Options.moderate}">moderate</option>
                <option value="${Options.high}">high</option>
                <option value="${Options.low}">low</option>
                <option value="${Options.extreme}">extreme</option>
            </select>
            <button id="creatureBuilderResetButton" type="button">Reset</button>
            <select id="creatureBuilderSize" name="${CREATURE_SIZE_FIELD}">
                <option value="tiny">Tiny</option>
                <option value="sm">Small</option>
                <option value="med">Medium</option>
                <option value="lg">Large</option>
                <option value="huge">Huge</option>
                <option value="grg">Gargantuan</option>
            </select>
            <select id="creatureBuilderLevel">
                <option value="-1">-1</option>
                <option value="1">1</option>
                <option value="3">3</option>
                <option value="5">5</option>
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
        i18n: {
            localize: (key: string) =>
                (enLang as Record<string, string>)[key] ?? key,
        },
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
    vi.useRealTimers()
})

describe('CreatureBuilderFormUI', () => {
    it('initializes a window rendered from the real template', () => {
        const source = readFileSync(
            'public/forms/creatureBuilderForm.html',
            'utf8',
        )
        const bareIds = [...source.matchAll(/\b(?:id|for)="([^"]*)"/g)]
            .map((match) => match[1])
            .filter((value) => !value?.includes('fieldId'))
        expect(bareIds).toEqual([])

        const handlebars = Handlebars.create()
        handlebars.registerHelper('localize', (key: string) => key)
        handlebars.registerHelper('concat', (...args: unknown[]) =>
            args.filter((arg) => typeof arg !== 'object').join(''),
        )
        handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b)
        handlebars.registerHelper('roadmapLabel', (key: unknown) =>
            String(key ?? ''),
        )

        const fieldId = 'window-a-'
        const root = document.createElement('div')
        root.className = 'creatureBuilderForm creatureBuilderFormModern'
        root.innerHTML = handlebars.compile(source)({
            fieldId,
            name: 'Hero',
            Levels,
            RoadMaps: { TestRoadmap: {} },
            SpellLists: { pyromancer: { name: 'Pyromancer' } },
            Sizes: FALLBACK_CREATURE_SIZES,
            detectedSize: 'med',
            CreatureStatistics: JSON.parse(
                JSON.stringify(DefaultCreatureStatistics),
            ),
        })
        document.body.replaceChildren(root)

        const ui = new CreatureBuilderFormUI(
            buildConfig({
                root,
                idPrefix: fieldId,
                detectedSize: 'lg',
                creatureStatistics: JSON.parse(
                    JSON.stringify(DefaultCreatureStatistics),
                ),
            }),
        )
        vi.useFakeTimers()
        expect(() => ui.initialize()).not.toThrow()
        vi.runAllTimers()

        const str = root.querySelector(
            `#${CSS.escape(`${fieldId}creatureBuilder${Statistics.str}`)}`,
        ) as HTMLSelectElement
        const spellList = root.querySelector(
            `#${CSS.escape(`${fieldId}creatureBuilderPF2EMONSTERMAKER.spellList`)}`,
        )
        const level = root.querySelector(
            `#${CSS.escape(`${fieldId}creatureBuilderLevel`)}`,
        ) as HTMLSelectElement
        const preview = root.querySelector(
            `#${CSS.escape(`${fieldId}previewRoadmapLevel`)}`,
        )
        const ability = root.querySelector(`[data-ability="${Statistics.str}"]`)
        const dropdown = root.querySelector(
            `#${CSS.escape(`${fieldId}creatureBuilderTraitsDropdown`)}`,
        )
        expect(str).toBeTruthy()
        expect(spellList).toBeTruthy()
        expect(level.value).toBe('1')
        expect(str.classList.contains('stat-level-moderate')).toBe(true)
        expect(preview?.textContent).toContain('lvl 1')
        expect(ability?.textContent).toContain('+3')
        expect(ability?.classList.contains('stat-level-moderate')).toBe(true)
        expect(dropdown?.getAttribute('aria-labelledby')).toBe(
            `${fieldId}creatureBuilderTraitsLabel`,
        )
        const traitsLabel = root.querySelector(
            `#${CSS.escape(`${fieldId}creatureBuilderTraitsLabel`)}`,
        ) as HTMLLabelElement
        const traitsInput = root.querySelector(
            `#${CSS.escape(`${fieldId}creatureBuilderTraitsInput`)}`,
        ) as HTMLElement
        expect(traitsLabel.getAttribute('for')).toBeNull()
        expect(traitsInput.getAttribute('aria-labelledby')).toBe(
            `${fieldId}creatureBuilderTraitsLabel`,
        )
        traitsLabel.click()
        expect(document.activeElement).toBe(traitsInput)
        expect(dropdown?.classList.contains('show')).toBe(true)

        const size = root.querySelector(
            `#${CSS.escape(`${fieldId}creatureBuilderSize`)}`,
        ) as HTMLSelectElement
        const traitsGroup = traitsLabel.closest('.form-group')
        expect(size).toBeTruthy()
        expect(
            size.compareDocumentPosition(traitsGroup!) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy()
        expect(Array.from(size.options).map((option) => option.value)).toEqual([
            'tiny',
            'sm',
            'med',
            'lg',
            'huge',
            'grg',
        ])
        expect(size.value).toBe('lg')
        expect(enLang[CREATURE_SIZE_FIELD]).toBe('Size')
        expect(enLang[`${CREATURE_SIZE_FIELD}.gargantuan`]).toBe('Gargantuan')

        const label = root.querySelector(
            `label[for="${fieldId}toggleBadges"]`,
        ) as HTMLLabelElement
        const box = root.querySelector(
            `#${CSS.escape(`${fieldId}toggleBadges`)}`,
        ) as HTMLInputElement
        expect(box.checked).toBe(true)
        label.click()
        expect(box.checked).toBe(false)
        const nameInput = root.querySelector(
            `#${CSS.escape(`${fieldId}creatureBuilderName`)}`,
        ) as HTMLInputElement
        expect(nameInput.type).toBe('text')
        expect(root.querySelector('footer.form-footer')).toBeTruthy()
        ui.addLoreSkill('Forest')
        const loreInput = root.querySelector(
            '.loreNameInput',
        ) as HTMLInputElement
        expect(loreInput.type).toBe(nameInput.type)
        expect(root.querySelector('[data-action="addLore"]')).toBeTruthy()
        expect(root.querySelector('[data-action="resetDefaults"]')).toBeTruthy()
        const addAttack = root.querySelector('[data-action="addAttack"]')
        const strikes = root.querySelector(
            '[data-section-name="PF2EMONSTERMAKER.strikes"]',
        )
        expect(addAttack).toBeTruthy()
        expect(strikes?.contains(addAttack!)).toBe(true)

        const defence = root.querySelector(
            '[data-section-name="Defence + Perception"]',
        )
        const movement = root.querySelector(
            `#${CSS.escape(`${fieldId}sectionMovement`)}`,
        ) as HTMLDetailsElement
        expect(movement.open).toBe(false)
        expect(
            defence?.compareDocumentPosition(movement) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy()
        expect(
            movement.compareDocumentPosition(strikes!) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy()
        const landValue = movement.querySelector(
            'input[name="speedValue-land"]',
        ) as HTMLInputElement
        expect(movement.querySelector('.speed-chip-label')?.textContent).toBe(
            'Land',
        )
        expect(landValue.value).toBe('25')
        expect(
            movement.querySelector('.speed-add')?.getAttribute('aria-haspopup'),
        ).toBeNull()
        expect(
            movement.querySelector('.speed-type-menu')?.getAttribute('role'),
        ).toBeNull()

        const generateAttacks = root.querySelector(
            `#${CSS.escape(`${fieldId}generateAttacksFromWeapons`)}`,
        ) as HTMLInputElement
        const dropZone = root.querySelector(
            `#${CSS.escape(`${fieldId}creatureBuilderDropZone`)}`,
        )
        expect(generateAttacks.checked).toBe(true)
        expect(generateAttacks.name).toBe(
            'PF2EMONSTERMAKER.generateAttacksFromWeapons',
        )
        expect(generateAttacks.closest('label')?.textContent).toContain(
            'pf2e-creature-builder.form.items.generate-attacks',
        )
        expect(
            generateAttacks.compareDocumentPosition(dropZone!) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy()

        ui.destroy()
    })

    it('omits the spell list control when the template has no spell lists', () => {
        const source = readFileSync(
            'public/forms/creatureBuilderForm.html',
            'utf8',
        )
        const handlebars = Handlebars.create()
        handlebars.registerHelper('localize', (key: string) => key)
        handlebars.registerHelper('concat', (...args: unknown[]) =>
            args.filter((arg) => typeof arg !== 'object').join(''),
        )
        handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b)
        handlebars.registerHelper('roadmapLabel', (key: unknown) =>
            String(key ?? ''),
        )

        const root = document.createElement('div')
        root.innerHTML = handlebars.compile(source)({
            fieldId: 'window-a-',
            name: 'Hero',
            Levels,
            RoadMaps: {},
            SpellLists: null,
            CreatureStatistics: JSON.parse(
                JSON.stringify(DefaultCreatureStatistics),
            ),
        })

        expect(root.querySelector('[id$="spellListFormGroup"]')).toBeNull()
    })

    it('restores edited dropdowns over detected actor values', () => {
        vi.useFakeTimers()
        const level = document.getElementById(
            'creatureBuilderLevel',
        ) as HTMLSelectElement
        const roadmap = document.getElementById(
            'creatureBuilderRoadmap',
        ) as HTMLSelectElement
        const str = document.getElementById(
            `creatureBuilder${Statistics.str}`,
        ) as HTMLSelectElement
        level.name = Statistics.level
        str.name = Statistics.str

        const ui = new CreatureBuilderFormUI(
            buildConfig({
                detectedStats: { [Statistics.str]: Options.high },
                actorLevel: '3',
                preservedControls: {
                    [Statistics.str]: Options.moderate,
                    [Statistics.level]: '1',
                    creatureBuilderRoadmap: 'TestRoadmap',
                },
            }),
        )
        ui.initialize()
        vi.runAllTimers()

        expect(str.value).toBe(Options.moderate)
        expect(level.value).toBe('1')
        expect(roadmap.value).toBe('TestRoadmap')
        expect(str.classList.contains('stat-level-moderate')).toBe(true)
        ui.destroy()
    })

    it('restores dropped items when the window is initialized', () => {
        const list = document.createElement('div')
        list.id = 'droppedItemsList'
        document.body.appendChild(list)
        const droppedItems = [{ name: 'Fireball', type: 'spell' }]
        const ui = new CreatureBuilderFormUI(buildConfig({ droppedItems }))
        ui.initialize()

        expect(list.children).toHaveLength(1)
        ui.destroy()
    })

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
        expect((window as any).setRoadmap).toBeUndefined()
    })

    it('shows attacks copied from an existing creature', () => {
        const ui = new CreatureBuilderFormUI(
            buildConfig({
                detectedAttacks: [
                    {
                        name: 'Jaws',
                        bonus: Options.high,
                        damage: Options.moderate,
                        damageType: 'piercing',
                        source: '{"item":{"type":"melee"}}',
                    },
                    {
                        name: 'Tail',
                        bonus: Options.low,
                        damage: Options.low,
                    },
                ],
            }),
        )
        ui.initialize()

        const entry = document.querySelector('.attackEntry') as HTMLElement
        const name = entry.querySelector('.attackNameInput') as HTMLInputElement
        const selects = entry.querySelectorAll('select')
        const damageType = entry.querySelector(
            '[name="attackDamageType0"]',
        ) as HTMLInputElement
        const source = entry.querySelector(
            '[name="attackSource0"]',
        ) as HTMLInputElement
        expect(name.value).toBe('Jaws')
        expect(selects[0].value).toBe(Options.high)
        expect(selects[1].value).toBe(Options.moderate)
        expect(damageType.value).toBe('piercing')
        expect(source.value).toBe('{"item":{"type":"melee"}}')
        const tail = document.querySelectorAll('.attackEntry')[1]
        expect(
            (tail.querySelector('.attackNameInput') as HTMLInputElement).value,
        ).toBe('Tail')
        expect(tail.querySelector('[name="attackSource1"]')).toHaveProperty(
            'value',
            '',
        )
    })

    it('adds and removes manual attacks', () => {
        const ui = new CreatureBuilderFormUI(buildConfig())
        ui.initialize()

        const bonus = document.getElementById(
            `creatureBuilder${Statistics.strikeBonus}`,
        ) as HTMLSelectElement
        const damage = document.getElementById(
            `creatureBuilder${Statistics.strikeDamage}`,
        ) as HTMLSelectElement
        bonus.value = Options.high
        damage.value = Options.low

        ui.addAttack()
        ui.addAttack('Bite', Options.extreme, Options.high)

        const entries = document.querySelectorAll('.attackEntry')
        expect(entries.length).toBe(2)
        const firstName = entries[0].querySelector(
            '.attackNameInput',
        ) as HTMLInputElement
        const selects = entries[0].querySelectorAll('select')
        expect(firstName.name).toBe('attackName0')
        expect(firstName.placeholder).toBe('Attack name')
        expect(selects[0].value).toBe(Options.high)
        expect(selects[1].value).toBe(Options.low)
        expect(
            entries[0].querySelector('[name="attackSource0"]'),
        ).toHaveProperty('value', '')
        const secondName = entries[1].querySelector(
            '.attackNameInput',
        ) as HTMLInputElement
        expect(secondName.value).toBe('Bite')
        expect(entries[1].querySelectorAll('select')[0].value).toBe(
            Options.extreme,
        )

        const remove = entries[0].querySelector(
            '.creatureBuilderRemoveIcon',
        ) as HTMLElement
        remove.click()
        expect(document.querySelectorAll('.attackEntry').length).toBe(1)
        expect(
            document.querySelector('.attackNameInput') as HTMLInputElement,
        ).toHaveProperty('value', 'Bite')
    })

    it('restores added attacks', () => {
        const ui = new CreatureBuilderFormUI(
            buildConfig({
                creatureStatistics: [
                    {
                        name: 'PF2EMONSTERMAKER.strikes',
                        defaultValue: Options.moderate,
                        availableOptions: [
                            Options.low,
                            Options.moderate,
                            Options.high,
                            Options.extreme,
                        ],
                        statisticEntries: [
                            { name: Statistics.strikeBonus },
                            { name: Statistics.strikeDamage },
                        ],
                    },
                ],
                detectedAttacks: [
                    {
                        name: 'Jaws',
                        bonus: Options.high,
                        damage: Options.high,
                        damageType: 'piercing',
                    },
                ],
                preservedControls: {
                    attackName1: 'Claw',
                    attackBonus1: Options.moderate,
                    attackDamage1: Options.low,
                    attackName0: 'Bite',
                    attackBonus0: Options.low,
                    attackDamage0: Options.extreme,
                    attackSource0: '{"kept":true}',
                },
            }),
        )
        ui.initialize()

        const restored = document.querySelector('.attackEntry') as HTMLElement
        const restoredName = restored.querySelector(
            '.attackNameInput',
        ) as HTMLInputElement
        expect(restoredName.value).toBe('Bite')
        expect(restored.querySelectorAll('select')[0].value).toBe(Options.low)
        expect(restored.querySelectorAll('select')[1].value).toBe(
            Options.extreme,
        )
        expect(document.querySelectorAll('.attackEntry')).toHaveLength(2)
        expect(document.querySelectorAll('.attackNameInput')[1]).toHaveProperty(
            'value',
            'Claw',
        )
        expect(restored.querySelector('[name="attackSource0"]')).toHaveProperty(
            'value',
            '{"kept":true}',
        )
        const claw = document.querySelectorAll('.attackEntry')[1]
        expect(claw.querySelector('[name="attackSource1"]')).toHaveProperty(
            'value',
            '',
        )
    })

    it('does not restore detected attacks after the list was cleared', () => {
        const preserved = capturePreservedControls({
            querySelectorAll: (selector: string) =>
                selector === '[id$="manualAttacksContainer"]'
                    ? [{ id: 'manualAttacksContainer' }]
                    : [],
        })
        expect(preserved).toEqual({ manualAttacksPresent: 'true' })

        const ui = new CreatureBuilderFormUI(
            buildConfig({
                detectedAttacks: [
                    {
                        name: 'Jaws',
                        bonus: Options.high,
                        damage: Options.high,
                    },
                ],
                preservedControls: preserved ?? undefined,
            }),
        )
        ui.initialize()
        expect(document.querySelectorAll('.attackEntry')).toHaveLength(0)
        ui.destroy()
    })

    it('adds and removes lore entries from the button', () => {
        const ui = new CreatureBuilderFormUI(buildConfig())
        ui.initialize()

        ui.addLoreSkill()

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

        ui.addLoreSkill()
        ui.addAttack('Bite')

        const level = document.getElementById(
            'creatureBuilderLevel',
        ) as HTMLSelectElement
        const roadmap = document.getElementById(
            'creatureBuilderRoadmap',
        ) as HTMLSelectElement
        level.value = '3'
        roadmap.value = 'TestRoadmap'
        const size = document.getElementById(
            'creatureBuilderSize',
        ) as HTMLSelectElement
        size.value = 'huge'

        ui.resetToDefaults()

        const hidden = document.getElementById(
            'creatureBuilderTraitsHidden',
        ) as HTMLInputElement
        const addLoreButton = document.getElementById(
            'addLoreButton',
        ) as HTMLButtonElement
        expect(hidden.value).toBe('')
        expect(document.querySelectorAll('.loreEntry').length).toBe(0)
        expect(addLoreButton).toBeTruthy()
        expect(document.querySelectorAll('.attackEntry').length).toBe(0)
        expect(document.getElementById('addAttackButton')).toBeTruthy()
        expect(level.value).toBe('-1')
        expect(roadmap.value).toBe('Default')
        expect(size.value).toBe('med')
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

    describe('destroy', () => {
        it('removes document and window listeners and the traits dropdown', () => {
            const documentAdd = vi.spyOn(document, 'addEventListener')
            const documentRemove = vi.spyOn(document, 'removeEventListener')
            const windowAdd = vi.spyOn(window, 'addEventListener')
            const windowRemove = vi.spyOn(window, 'removeEventListener')

            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()

            const documentClick = documentAdd.mock.calls.find(
                (call) => call[0] === 'click',
            )
            const windowScroll = windowAdd.mock.calls.find(
                (call) => call[0] === 'scroll',
            )
            const windowResize = windowAdd.mock.calls.find(
                (call) => call[0] === 'resize',
            )
            expect(documentClick?.[1]).toEqual(expect.any(Function))
            expect(windowScroll?.[2]).toBe(true)
            expect(windowResize?.[1]).toEqual(expect.any(Function))

            const input = document.getElementById(
                'creatureBuilderTraitsInput',
            ) as HTMLElement
            input.textContent = 'undead'
            input.dispatchEvent(new Event('input', { bubbles: true }))
            const dropdown = document.getElementById(
                'creatureBuilderTraitsDropdown',
            ) as HTMLElement
            expect(dropdown.parentElement).toBe(document.body)
            expect(dropdown.classList.contains('show')).toBe(true)

            ui.destroy()

            expect(documentRemove).toHaveBeenCalledWith(
                'click',
                documentClick?.[1],
            )
            expect(windowRemove).toHaveBeenCalledWith(
                'scroll',
                windowScroll?.[1],
                true,
            )
            expect(windowRemove).toHaveBeenCalledWith(
                'resize',
                windowResize?.[1],
            )
            expect(
                document.getElementById('creatureBuilderTraitsDropdown'),
            ).toBeNull()
            expect(dropdown.classList.contains('show')).toBe(false)
            expect((window as any).setRoadmap).toBeUndefined()

            document.body.dispatchEvent(
                new MouseEvent('click', { bubbles: true }),
            )
            window.dispatchEvent(new Event('scroll'))
            window.dispatchEvent(new Event('resize'))

            documentAdd.mockRestore()
            documentRemove.mockRestore()
            windowAdd.mockRestore()
            windowRemove.mockRestore()
        })

        it('leaves the other window intact when one is destroyed', () => {
            const markup = document.body.innerHTML
            const firstHost = document.createElement('div')
            const secondHost = document.createElement('div')
            firstHost.innerHTML = markup
            secondHost.innerHTML = markup
            document.body.replaceChildren(firstHost, secondHost)

            const first = new CreatureBuilderFormUI(
                buildConfig({ root: firstHost }),
            )
            const second = new CreatureBuilderFormUI(
                buildConfig({ root: secondHost }),
            )
            first.initialize()
            second.initialize()

            const firstInput = firstHost.querySelector(
                '#creatureBuilderTraitsInput',
            ) as HTMLElement
            firstInput.textContent = 'undead'
            firstInput.dispatchEvent(new Event('input', { bubbles: true }))

            const firstDropdown = document.body.querySelector(
                '#creatureBuilderTraitsDropdown.show',
            ) as HTMLElement
            const secondDropdown = secondHost.querySelector(
                '#creatureBuilderTraitsDropdown',
            ) as HTMLElement
            expect(firstDropdown).toBeTruthy()
            expect(secondDropdown.classList.contains('show')).toBe(false)

            first.destroy()

            expect(firstDropdown.isConnected).toBe(false)
            expect(secondDropdown.isConnected).toBe(true)
            second.destroy()
            expect(
                document.querySelector('#creatureBuilderTraitsDropdown'),
            ).toBeNull()
        })

        it('cancels deferred initialization', () => {
            vi.useFakeTimers()
            const ui = new CreatureBuilderFormUI(
                buildConfig({
                    detectedStats: { [Statistics.str]: Options.high },
                    actorLevel: '3',
                }),
            )
            ui.initialize()
            ui.destroy()
            vi.runAllTimers()

            const level = document.getElementById(
                'creatureBuilderLevel',
            ) as HTMLSelectElement
            const str = document.getElementById(
                `creatureBuilder${Statistics.str}`,
            ) as HTMLSelectElement
            expect(level.value).toBe('-1')
            expect(str.value).toBe(Options.moderate)
        })

        it('is safe to call before initialize and more than once', () => {
            const ui = new CreatureBuilderFormUI(buildConfig())
            expect(() => ui.destroy()).not.toThrow()
            ui.initialize()
            ui.destroy()
            expect(() => ui.destroy()).not.toThrow()
            expect(
                document.getElementById('creatureBuilderTraitsDropdown'),
            ).toBeNull()
        })
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

            const ui = new CreatureBuilderFormUI(
                buildConfig({
                    spellLists: {
                        pyromancer: { name: 'Pyromancer' },
                    } as SpellListCollection,
                }),
            )
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

        it('hides the spell list when the system has no spell lists', () => {
            vi.useFakeTimers()
            const spellcastingSelect = document.getElementById(
                'creatureBuilderPF2EMONSTERMAKER.spellcasting',
            ) as HTMLSelectElement
            spellcastingSelect.value = 'PF2EMONSTERMAKER.moderate'

            const ui = new CreatureBuilderFormUI(
                buildConfig({ spellLists: {} }),
            )
            ui.initialize()
            vi.runAllTimers()

            const spellListRow = document
                .getElementById('creatureBuilderPF2EMONSTERMAKER.spellList')
                ?.closest('.form-group') as HTMLElement
            const traditionRow = document
                .getElementById(
                    'creatureBuilderPF2EMONSTERMAKER.spellcastingTradition',
                )
                ?.closest('.form-group') as HTMLElement

            expect(spellListRow.style.display).toBe('none')
            expect(traditionRow.style.display).toBe('flex')
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

            ui.resetToDefaults()

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

        it('applies a roadmap change only inside that window', () => {
            const markup = document.body.innerHTML
            const firstHost = document.createElement('div')
            const secondHost = document.createElement('div')
            firstHost.innerHTML = markup
            secondHost.innerHTML = markup
            document.body.replaceChildren(firstHost, secondHost)

            const first = new CreatureBuilderFormUI(
                buildConfig({ root: firstHost }),
            )
            const second = new CreatureBuilderFormUI(
                buildConfig({ root: secondHost }),
            )
            first.initialize()
            second.initialize()

            const roadmapSelect = firstHost.querySelector(
                '#creatureBuilderRoadmap',
            ) as HTMLSelectElement
            roadmapSelect.value = 'TestRoadmap'
            roadmapSelect.dispatchEvent(new Event('change'))

            const dexSelector = `#${CSS.escape(`creatureBuilder${Statistics.dex}`)}`
            const firstDex = firstHost.querySelector(
                dexSelector,
            ) as HTMLSelectElement
            const secondDex = secondHost.querySelector(
                dexSelector,
            ) as HTMLSelectElement
            expect(firstDex.value).toBe(Options.low)
            expect(secondDex.value).toBe(Options.moderate)
            expect((window as any).setRoadmap).toBeUndefined()

            first.destroy()
            second.destroy()
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

            ui.addLoreSkill()

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

            expect(() => ui.resetToDefaults()).not.toThrow()
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

    describe('Stat Highlights', () => {
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
            const ui = new CreatureBuilderFormUI(buildConfig())
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
            const ui = new CreatureBuilderFormUI(buildConfig())
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
            const ui = new CreatureBuilderFormUI(buildConfig())
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
    })

    describe('Live Preview', () => {
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
            const ui = new CreatureBuilderFormUI(buildConfig())
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

            const ui = new CreatureBuilderFormUI(buildConfig())
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
                buildConfig({ actorLevel: '1' }),
            )
            ui.initialize()
            vi.runAllTimers()

            ui.updateStatPreview()

            const fortSpan = document.querySelector(
                '.preview-stat[data-stat="PF2EMONSTERMAKER.fort"]',
            ) as HTMLElement
            expect(fortSpan.textContent).toContain('FORT')
            expect(fortSpan.textContent).toContain('--')
        })

        it('shows -- for stats with none selected', () => {
            vi.useFakeTimers()
            setupModernDom()

            const spellSelect = document.getElementById(
                'creatureBuilderPF2EMONSTERMAKER.spellcasting',
            ) as HTMLSelectElement
            spellSelect.value = 'PF2EMONSTERMAKER.none'

            const ui = new CreatureBuilderFormUI(buildConfig())
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
                buildConfig({ actorLevel: '1' }),
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
                buildConfig({ actorLevel: '1' }),
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

            const ui = new CreatureBuilderFormUI(buildConfig())
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
                buildConfig({ actorLevel: '1' }),
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

        it('updates inline stat badges with numeric values', () => {
            vi.useFakeTimers()
            setupModernDom()

            const strBadge = document.createElement('span')
            strBadge.className = 'stat-value-badge'
            strBadge.dataset.statBadge = Statistics.str
            strBadge.textContent = '--'
            document.body.appendChild(strBadge)

            const ui = new CreatureBuilderFormUI(
                buildConfig({ actorLevel: '1' }),
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

            const ui = new CreatureBuilderFormUI(buildConfig())
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
                buildConfig({ actorLevel: '1' }),
            )
            ui.initialize()
            vi.runAllTimers()

            expect(dmgBadge.textContent).not.toBe('--')
            expect(dmgBadge.textContent).toContain('d')
        })
    })

    describe('Drop Zone', () => {
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
            const ui = new CreatureBuilderFormUI(buildConfig())
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
            const ui = new CreatureBuilderFormUI(buildConfig())
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
            const ui = new CreatureBuilderFormUI(buildConfig())
            ui.initialize()
            vi.runAllTimers()

            const dropZone = document.getElementById('creatureBuilderDropZone')!
            dropZone.classList.add('drag-over')
            dropZone.dispatchEvent(new Event('dragleave'))
            expect(dropZone.classList.contains('drag-over')).toBe(false)
        })

        const addGenerateAttacksCheckbox = (checked = true) => {
            const checkbox = document.createElement('input')
            checkbox.type = 'checkbox'
            checkbox.id = 'generateAttacksFromWeapons'
            checkbox.name = 'PF2EMONSTERMAKER.generateAttacksFromWeapons'
            checkbox.checked = checked
            document.body.appendChild(checkbox)
            return checkbox
        }

        it('marks a dropped weapon as a generated strike', () => {
            vi.useFakeTimers()
            setupModernDom()
            const checkbox = addGenerateAttacksCheckbox(true)
            const droppedItems: Record<string, unknown>[] = [
                { name: 'Longsword', type: 'weapon' },
                { name: 'Fireball', type: 'spell' },
            ]
            const ui = new CreatureBuilderFormUI(buildConfig({ droppedItems }))
            ui.initialize()
            vi.runAllTimers()

            const badges = document.querySelectorAll('.dropped-item-attack')
            expect(checkbox.checked).toBe(true)
            expect(badges).toHaveLength(1)
            expect(badges[0].textContent).toBe('Strike')
            expect(
                badges[0].parentElement?.querySelector('.dropped-item-name')
                    ?.textContent,
            ).toBe('Longsword')

            checkbox.checked = false
            checkbox.dispatchEvent(new Event('change'))
            expect(document.querySelector('.dropped-item-attack')).toBeNull()

            checkbox.checked = true
            checkbox.dispatchEvent(new Event('change'))
            expect(
                document.querySelectorAll('.dropped-item-attack'),
            ).toHaveLength(1)
        })

        it('uses the localized strike label and skips non-weapon rows', () => {
            vi.useFakeTimers()
            setupModernDom()
            const checkbox = addGenerateAttacksCheckbox(true)
            ;(window as any).game = {
                i18n: { localize: () => '' },
            }
            const droppedItems: Record<string, unknown>[] = []
            const ui = new CreatureBuilderFormUI(buildConfig({ droppedItems }))
            ui.initialize()
            vi.runAllTimers()

            const mystery = { name: 'Mystery', type: 4 }
            droppedItems.push(mystery)
            ui.renderDroppedItem(mystery)
            expect(document.querySelector('.dropped-item-attack')).toBeNull()

            const dagger = { name: 'Dagger', type: 'weapon' }
            droppedItems.push(dagger)
            ui.renderDroppedItem(dagger)
            expect(
                document.querySelector('.dropped-item-attack')?.textContent,
            ).toBe('Strike')
            document.querySelector('.dropped-item-attack')?.remove()

            ;(window as any).game.i18n.localize = () => 'Атака'
            const bare = document.createElement('div')
            bare.className = 'dropped-item-row'
            bare.dataset.itemType = 'weapon'
            document.body.appendChild(bare)
            checkbox.dispatchEvent(new Event('change'))
            expect(
                bare.querySelector('.dropped-item-attack')?.textContent,
            ).toBe('Атака')
            expect(
                document.querySelectorAll('.dropped-item-attack'),
            ).toHaveLength(2)
        })

        it('hides weapon strike badges when the checkbox was turned off', () => {
            vi.useFakeTimers()
            setupModernDom()
            const checkbox = addGenerateAttacksCheckbox(true)
            const droppedItems = [{ name: 'Longsword', type: 'weapon' }]
            const ui = new CreatureBuilderFormUI(
                buildConfig({
                    droppedItems,
                    preservedControls: {
                        'PF2EMONSTERMAKER.generateAttacksFromWeapons': 'false',
                    },
                }),
            )
            ui.initialize()
            expect(document.querySelector('.dropped-item-attack')).toBeTruthy()
            vi.runAllTimers()

            expect(checkbox.checked).toBe(false)
            expect(document.querySelector('.dropped-item-attack')).toBeNull()
        })

        it('renders a dropped item row', () => {
            vi.useFakeTimers()
            setupModernDom()
            const droppedItems: Record<string, unknown>[] = []
            const ui = new CreatureBuilderFormUI(buildConfig({ droppedItems }))
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
            const ui = new CreatureBuilderFormUI(buildConfig({ droppedItems }))
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
            const ui = new CreatureBuilderFormUI(buildConfig({ droppedItems }))
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
            const ui = new CreatureBuilderFormUI(buildConfig({ droppedItems }))
            ui.initialize()
            vi.runAllTimers()

            const itemData = { name: 'Fireball', type: 'spell' }
            droppedItems.push(itemData)
            ui.renderDroppedItem(itemData)

            ui.resetToDefaults()

            expect(droppedItems).toHaveLength(0)
            expect(
                document.getElementById('droppedItemsList')!.children,
            ).toHaveLength(0)
        })
    })

    describe('Badge Toggle', () => {
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
            const ui = new CreatureBuilderFormUI(buildConfig())
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
            const ui = new CreatureBuilderFormUI(buildConfig())
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

            const ui = new CreatureBuilderFormUI(buildConfig())
            expect(() => {
                ui.initialize()
                vi.runAllTimers()
            }).not.toThrow()
        })
    })

    describe('Preview Roadmap Level & Ability Scores', () => {
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
                buildConfig({ actorLevel: '3' }),
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
                buildConfig({ actorLevel: '1' }),
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
                buildConfig({ actorLevel: '1' }),
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
                buildConfig({ actorLevel: '1' }),
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
                buildConfig({ actorLevel: '1' }),
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
                buildConfig({ actorLevel: '1' }),
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
                buildConfig({ actorLevel: '1' }),
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

    describe('Inline Badge Edge Cases', () => {
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
                buildConfig({ actorLevel: '1' }),
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
                buildConfig({ actorLevel: '1' }),
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
                buildConfig({ actorLevel: '1' }),
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
                buildConfig({ actorLevel: '1' }),
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
                buildConfig({ actorLevel: '1' }),
            )
            ui.initialize()
            vi.runAllTimers()

            strSelect.value = 'PF2EMONSTERMAKER.bogus'
            ui.updateStatPreview()

            expect(badge.textContent).toBe('--')
        })
    })
})

describe('movement and senses controls', () => {
    const mountMovement = () => {
        const section = document.createElement('details')
        section.id = 'sectionMovement'
        section.className = 'collapsibleSection'
        section.open = true
        section.innerHTML = `
            <div id="speedChips"></div>
            <div id="speedsTray">
                <button type="button" id="addSpeedButton">+</button>
                <div id="speedTypeMenu" hidden></div>
            </div>
            <div id="sensesContainer"></div>
            <button type="button" id="addSenseButton">Add Sense</button>
        `
        const tray = section.querySelector('#speedsTray')
        tray?.prepend(section.querySelector('#speedChips')!)
        document.body.append(section)
    }

    it('adds speeds from the menu and refuses to remove the last chip', () => {
        mountMovement()
        const warn = vi.fn()
        ;(globalThis as { ui?: unknown }).ui = { notifications: { warn } }
        const ui = new CreatureBuilderFormUI(buildConfig())
        ui.initialize()

        const land = document.querySelector(
            'input[name="speedValue-land"]',
        ) as HTMLInputElement
        expect(land.value).toBe('25')
        document.getElementById('addSpeedButton')?.click()
        const menu = document.getElementById('speedTypeMenu') as HTMLElement
        expect(menu.hidden).toBe(false)
        expect(menu.getAttribute('role')).toBeNull()
        expect(menu.querySelector('[role="option"]')).toBeNull()
        expect(
            document
                .getElementById('addSpeedButton')
                ?.getAttribute('aria-haspopup'),
        ).toBeNull()
        expect(
            Array.from(menu.querySelectorAll('button')).map(
                (button) => button.dataset.speedType,
            ),
        ).toEqual(['fly', 'swim', 'climb', 'burrow'])

        menu.querySelector<HTMLButtonElement>(
            '[data-speed-type="fly"]',
        )?.click()
        const fly = document.querySelector(
            'input[name="speedValue-fly"]',
        ) as HTMLInputElement
        expect(fly.value).toBe('25')
        expect(menu.hidden).toBe(true)

        document
            .querySelector('[data-speed-type="land"] .speed-chip-remove')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        expect(document.querySelector('[data-speed-type="land"]')).toBeNull()
        expect(warn).not.toHaveBeenCalled()

        document.getElementById('addSpeedButton')?.click()
        expect(
            document.querySelector('#speedTypeMenu [data-speed-type="land"]'),
        ).toBeTruthy()
        document.body.click()
        expect(
            (document.getElementById('speedTypeMenu') as HTMLElement).hidden,
        ).toBe(true)

        document
            .querySelector('[data-speed-type="fly"] .speed-chip-remove')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        expect(document.querySelector('[data-speed-type="fly"]')).toBeTruthy()
        expect(warn).toHaveBeenCalledWith(
            'A creature needs at least one speed.',
        )

        document.getElementById('addSenseButton')?.click()
        ui.resetToDefaults()
        expect(document.querySelectorAll('.speed-chip')).toHaveLength(1)
        expect(
            (
                document.querySelector(
                    'input[name="speedValue-land"]',
                ) as HTMLInputElement
            ).value,
        ).toBe('25')
        expect(document.querySelectorAll('.sense-entry')).toHaveLength(0)
        delete (globalThis as { ui?: unknown }).ui
    })

    it('shows range and acuity only for senses that use them', () => {
        mountMovement()
        const ui = new CreatureBuilderFormUI(
            buildConfig({
                detectedSpeeds: [
                    { type: 'fly', value: 40 },
                    { type: 'land', value: 25 },
                ],
                detectedSenses: [
                    { type: 'darkvision' },
                    { type: 'scent', acuity: 'vague', range: 30 },
                ],
            }),
        )
        ui.initialize()

        expect(
            document.querySelector('input[name="speedValue-fly"]'),
        ).toBeTruthy()
        const rows = Array.from(document.querySelectorAll('.sense-entry'))
        expect(rows).toHaveLength(2)
        expect(rows[0]?.querySelector('.sense-range-field')).toBeNull()
        expect(rows[0]?.querySelector('.sense-acuity')).toBeNull()
        const scentRange = rows[1]?.querySelector(
            'input[name^="senseRange"]',
        ) as HTMLInputElement
        const scentAcuity = rows[1]?.querySelector(
            '.sense-acuity',
        ) as HTMLSelectElement
        expect(scentRange.value).toBe('30')
        expect(scentAcuity.value).toBe('vague')
        expect(scentAcuity.getAttribute('aria-label')).toBe('Sense acuity')
        expect(
            rows[0]?.querySelector('.sense-type')?.getAttribute('aria-label'),
        ).toBe('Sense')
        const removeSense = rows[1]?.querySelector('.creatureBuilderRemoveIcon')
        expect(removeSense?.tagName).toBe('SPAN')
        expect(removeSense?.classList.contains('fa-trash')).toBe(true)
        expect(removeSense?.getAttribute('title')).toBe('Remove sense')
        expect(scentAcuity.nextElementSibling).toBe(
            rows[1]?.querySelector('.sense-range-field'),
        )

        const scentType = rows[1]?.querySelector(
            '.sense-type',
        ) as HTMLSelectElement
        expect(
            Array.from(scentType.options).some(
                (option) => option.value === 'darkvision',
            ),
        ).toBe(false)
        const scentRow = rows[1]
        if (!scentRow) throw new Error('missing scent row')
        scentType.value = 'echolocation'
        scentType.dispatchEvent(new Event('change'))
        expect(scentRow.querySelector('.sense-acuity')).toBeNull()
        expect(
            (
                scentRow.querySelector(
                    'input[name^="senseRange"]',
                ) as HTMLInputElement
            ).value,
        ).toBe('30')

        scentType.value = 'truesight'
        scentType.dispatchEvent(new Event('change'))
        expect(scentRow.querySelector('.sense-range-field')).toBeNull()
        expect(scentRow.querySelector('.sense-acuity')).toBeNull()

        scentType.value = 'tremorsense'
        scentType.dispatchEvent(new Event('change'))
        expect(
            (scentRow.querySelector('.sense-acuity') as HTMLSelectElement)
                .value,
        ).toBe('imprecise')
        expect(scentRow.querySelector('.sense-range-field')).toBeTruthy()

        rows[1]
            ?.querySelector('.creatureBuilderRemoveIcon')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        expect(document.querySelectorAll('.sense-entry')).toHaveLength(1)
        ui.destroy()
    })

    it('restores preserved speeds and senses instead of detected values', () => {
        mountMovement()
        const ui = new CreatureBuilderFormUI(
            buildConfig({
                detectedSpeeds: [{ type: 'land', value: 25 }],
                detectedSenses: [{ type: 'darkvision' }],
                preservedControls: {
                    sensesInitialized: 'true',
                    'speedType-swim': 'swim',
                    'speedValue-swim': '15',
                    senseType0: 'wavesense',
                    senseAcuity0: 'precise',
                    senseRange0: '20',
                },
            }),
        )
        ui.initialize()

        expect(document.querySelector('[data-speed-type="land"]')).toBeNull()
        expect(
            (
                document.querySelector(
                    'input[name="speedValue-swim"]',
                ) as HTMLInputElement
            ).value,
        ).toBe('15')
        const type = document.querySelector('.sense-type') as HTMLSelectElement
        const acuity = document.querySelector(
            '.sense-acuity',
        ) as HTMLSelectElement
        const range = document.querySelector(
            'input[name="senseRange0"]',
        ) as HTMLInputElement
        expect(type.value).toBe('wavesense')
        expect(acuity.value).toBe('precise')
        expect(range.value).toBe('20')
        expect(document.querySelectorAll('.sense-entry')).toHaveLength(1)
    })

    it('keeps a custom sense and ignores a duplicate add', () => {
        mountMovement()
        const ui = new CreatureBuilderFormUI(buildConfig())
        ui.initialize()
        ui.addSense({ type: 'blood-scent', range: 10, acuity: 'imprecise' })
        const select = document.querySelector(
            '.sense-type',
        ) as HTMLSelectElement
        expect(select.value).toBe('blood-scent')
        expect(
            (
                document.querySelector(
                    'input[name^="senseRange"]',
                ) as HTMLInputElement
            ).value,
        ).toBe('10')
        select.value = 'darkvision'
        select.dispatchEvent(new Event('change'))
        expect(document.querySelector('.sense-range-field')).toBeNull()
        ui.destroy()
    })

    it('closes an open speed menu and stops when every speed exists', () => {
        mountMovement()
        const ui = new CreatureBuilderFormUI(buildConfig())
        ui.initialize()
        const add = document.getElementById(
            'addSpeedButton',
        ) as HTMLButtonElement
        add.click()
        add.click()
        const menu = document.getElementById('speedTypeMenu') as HTMLElement
        expect(menu.hidden).toBe(true)

        for (const type of ['fly', 'swim', 'climb', 'burrow']) {
            add.click()
            document
                .querySelector<HTMLButtonElement>(`[data-speed-type="${type}"]`)
                ?.click()
        }
        expect(add.disabled).toBe(true)
        add.disabled = false
        add.click()
        expect(menu.hidden).toBe(true)

        const fake = document.createElement('div')
        fake.className = 'speed-chip'
        fake.dataset.speedType = 'teleport'
        document.getElementById('speedChips')?.append(fake)
        add.click()
        expect(
            document.querySelector(
                '#speedTypeMenu [data-speed-type="teleport"]',
            ),
        ).toBeNull()

        add.remove()
        document
            .querySelector('.speed-chip-remove')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

        menu.remove()
        const chip = document.querySelector('.speed-chip')
        if (!chip) throw new Error('missing speed chip')
        document.body.append(chip)
        document.getElementById('speedChips')?.remove()
        chip.querySelector('button')?.dispatchEvent(
            new MouseEvent('click', { bubbles: true }),
        )
        ui.destroy()
    })

    it('stops adding senses when none remain and still renders loose rows', () => {
        const ui = new CreatureBuilderFormUI(buildConfig())
        ui.initialize()
        expect(() => ui.addSense()).not.toThrow()

        mountMovement()
        ui.addSense({ type: 'darkvision' })
        const row = document.querySelector('.sense-entry')
        row?.querySelector('.creatureBuilderRemoveIcon')?.remove()
        const select = row?.querySelector('.sense-type') as HTMLSelectElement
        select.value = 'scent'
        select.dispatchEvent(new Event('change'))
        expect(row?.querySelector('.sense-range-field')).toBeTruthy()
        expect(row?.querySelector('.sense-acuity')).toBeTruthy()

        ui.addSense({ type: 'darkvision' })
        const types = Array.from(
            document.querySelectorAll<HTMLSelectElement>('.sense-type'),
        ).map((entry) => entry.value)
        expect(types.filter((type) => type === 'darkvision')).toHaveLength(1)

        document.querySelector('.sense-type')?.remove()
        ui.addSense()
        const add = document.getElementById(
            'addSenseButton',
        ) as HTMLButtonElement
        while (!add.disabled) ui.addSense()
        expect(add.disabled).toBe(true)
        ui.addSense()
        document.querySelector('.sense-entry')?.remove()
        add.remove()
        ui.addSense()
        ui.destroy()
    })

    it('adds Starfinder emotionsense and a second echolocation', () => {
        mountMovement()
        ;(window as any).game.system = { id: 'sf2e' }
        const ui = new CreatureBuilderFormUI(buildConfig())
        ui.initialize()
        ui.addSense({
            type: 'echolocation',
            acuity: 'precise',
            range: 30,
        })
        ui.addSense({
            type: 'echolocation',
            acuity: 'imprecise',
            range: 60,
        })

        const rows = Array.from(document.querySelectorAll('.sense-entry'))
        expect(rows).toHaveLength(2)
        expect(
            rows.map(
                (row) =>
                    (row.querySelector('.sense-acuity') as HTMLSelectElement)
                        .value,
            ),
        ).toEqual(['precise', 'imprecise'])
        expect(
            rows.map(
                (row) =>
                    (
                        row.querySelector(
                            'input[name^="senseRange"]',
                        ) as HTMLInputElement
                    ).value,
            ),
        ).toEqual(['30', '60'])
        for (const row of rows) {
            const type = row.querySelector('.sense-type') as HTMLSelectElement
            expect(type.value).toBe('echolocation')
            expect(
                Array.from(type.options).some(
                    (option) => option.value === 'emotionsense',
                ),
            ).toBe(true)
        }

        ui.addSense({ type: 'emotionsense' })
        const emotion = Array.from(
            document.querySelectorAll('.sense-entry'),
        ).find(
            (row) =>
                (row.querySelector('.sense-type') as HTMLSelectElement)
                    .value === 'emotionsense',
        )
        if (!emotion) throw new Error('missing emotionsense row')
        expect(
            (emotion.querySelector('.sense-acuity') as HTMLSelectElement).value,
        ).toBe('imprecise')
        expect(
            (
                emotion.querySelector(
                    'input[name^="senseRange"]',
                ) as HTMLInputElement
            ).value,
        ).toBe('30')

        ui.addSense({ type: 'echolocation', acuity: 'vague', range: 10 })
        expect(
            Array.from(document.querySelectorAll('.sense-type')).filter(
                (select) =>
                    (select as HTMLSelectElement).value === 'echolocation',
            ),
        ).toHaveLength(2)
        ui.destroy()
    })

    it('uses the fallback warning when the message is not translated', () => {
        mountMovement()
        ;(window as any).game.i18n.localize = (key: string) => key
        const warn = vi.fn()
        ;(globalThis as { ui?: unknown }).ui = { notifications: { warn } }
        const ui = new CreatureBuilderFormUI(buildConfig())
        ui.initialize()
        document
            .querySelector('.speed-chip-remove')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        expect(warn).toHaveBeenCalledWith(
            'A creature needs at least one speed.',
        )
        delete (globalThis as { ui?: unknown }).ui
        ui.destroy()
    })
})

describe('Manual Input', () => {
    const mount = () => {
        const form = document.querySelector('.creatureBuilderForm')!
        form.classList.add('creatureBuilderFormModern')

        const show = document.createElement('input')
        show.type = 'checkbox'
        show.id = 'toggleBadges'
        show.checked = true
        const manualLabel = document.createElement('label')
        manualLabel.htmlFor = 'toggleManualInput'
        manualLabel.className = 'toggle-badges-label'
        const manual = document.createElement('input')
        manual.type = 'checkbox'
        manual.id = 'toggleManualInput'
        manualLabel.append(manual, document.createTextNode('Manual Input'))
        form.append(show, manualLabel)

        const str = document.getElementById(
            `creatureBuilder${Statistics.str}`,
        ) as HTMLSelectElement
        for (const option of [
            Options.extreme,
            Options.low,
            Options.terrible,
            Options.abysmal,
        ]) {
            const element = document.createElement('option')
            element.value = option
            element.textContent = option
            str.append(element)
        }
        str.value = Options.moderate

        const strBadge = document.createElement('span')
        strBadge.className = 'stat-value-badge'
        strBadge.dataset.statBadge = Statistics.str
        strBadge.dataset.overrideField = Statistics.str
        strBadge.textContent = '--'
        form.append(strBadge)

        const hp = document.createElement('select')
        hp.id = `creatureBuilder${Statistics.hp}`
        hp.name = Statistics.hp
        for (const option of [
            Options.low,
            Options.moderate,
            Options.high,
            Options.extreme,
        ]) {
            const element = document.createElement('option')
            element.value = option
            element.textContent = option
            hp.append(element)
        }
        hp.value = Options.moderate
        const hpBadge = document.createElement('span')
        hpBadge.className = 'stat-value-badge'
        hpBadge.dataset.statBadge = Statistics.hp
        hpBadge.dataset.overrideField = Statistics.hp
        form.append(hp, hpBadge)

        const spell = document.getElementById(
            'creatureBuilderPF2EMONSTERMAKER.spellcasting',
        ) as HTMLSelectElement
        const spellBadge = document.createElement('span')
        spellBadge.className = 'stat-value-badge'
        spellBadge.dataset.statBadge = Statistics.spellcasting
        spellBadge.dataset.overrideField = Statistics.spellcasting
        form.append(spellBadge)

        const damage = document.getElementById(
            `creatureBuilder${Statistics.strikeDamage}`,
        ) as HTMLSelectElement
        const damageBadge = document.createElement('span')
        damageBadge.className = 'stat-value-badge'
        damageBadge.dataset.statBadge = Statistics.strikeDamage
        damageBadge.dataset.overrideField = Statistics.strikeDamage
        form.append(damageBadge)

        const ability = document.createElement('span')
        ability.dataset.ability = Statistics.str
        const damagePreview = document.createElement('span')
        damagePreview.className = 'preview-stat'
        damagePreview.dataset.stat = Statistics.strikeDamage
        const spellPreview = document.createElement('span')
        spellPreview.className = 'preview-stat'
        spellPreview.dataset.stat = Statistics.spellcasting
        document.body.append(ability, damagePreview, spellPreview)

        return {
            show,
            manual,
            manualLabel,
            str,
            strBadge,
            hp,
            hpBadge,
            spell,
            spellBadge,
            damage,
            damageBadge,
            ability,
            damagePreview,
            spellPreview,
        }
    }

    const start = () => {
        vi.useFakeTimers()
        const controls = mount()
        const ui = new CreatureBuilderFormUI(buildConfig())
        ui.initialize()
        vi.runAllTimers()
        return { ui, ...controls }
    }

    const enableManual = (manual: HTMLInputElement) => {
        manual.checked = true
        manual.dispatchEvent(new Event('change'))
    }

    const commitBadge = (badge: HTMLElement, value: string) => {
        badge.click()
        const input = badge.querySelector('input') as HTMLInputElement
        expect(input).toBeTruthy()
        input.value = value
        input.dispatchEvent(new Event('blur'))
    }

    const overrideInput = (field: string) =>
        document.querySelector<HTMLInputElement>(
            `input[name="${CSS.escape(`manualOverride.${field}`)}"]`,
        )

    it('places Manual Input beside Show Bonuses in the form template', () => {
        const source = readFileSync(
            'public/forms/creatureBuilderForm.html',
            'utf8',
        )
        const bonuses = source.indexOf('toggleBadges')
        const manual = source.indexOf('toggleManualInput')
        expect(bonuses).toBeGreaterThan(-1)
        expect(manual).toBeGreaterThan(bonuses)
        expect(source).toContain('pf2e-creature-builder.form.manualInput')
        expect(enLang['pf2e-creature-builder.form.manualInput']).toBe(
            'Manual Input',
        )
    })

    it('shows Manual Input only while Show Bonuses is on', () => {
        const { ui, show, manual, manualLabel } = start()
        expect(manualLabel.hidden).toBe(false)

        show.checked = false
        show.dispatchEvent(new Event('change'))
        expect(manualLabel.hidden).toBe(true)
        expect(manual.checked).toBe(false)
        expect(document.querySelector('.hide-badges')).toBeTruthy()

        show.checked = true
        show.dispatchEvent(new Event('change'))
        expect(manualLabel.hidden).toBe(false)
        expect(manual.checked).toBe(false)
        ui.destroy()
    })

    it('hides Manual Input when Show Bonuses starts unchecked', () => {
        vi.useFakeTimers()
        const { manualLabel, show } = mount()
        show.checked = false
        const ui = new CreatureBuilderFormUI(buildConfig())
        ui.initialize()
        vi.runAllTimers()
        expect(manualLabel.hidden).toBe(true)
        ui.destroy()
    })

    it('saves a modifier on blur and snaps the tier without replacing the typed number', () => {
        const { ui, manual, str, strBadge, ability } = start()
        expect(strBadge.textContent).toBe('+3')
        enableManual(manual)
        expect(strBadge.classList.contains('stat-value-badge--editable')).toBe(
            true,
        )

        commitBadge(strBadge, '5')
        expect(strBadge.textContent).toBe('+5')
        expect(str.value).toBe(Options.extreme)
        expect(str.classList.contains('stat-level-extreme')).toBe(true)
        expect(overrideInput(Statistics.str)?.value).toBe('+5')
        expect(ability.textContent).toContain('+5')

        commitBadge(strBadge, '+7')
        expect(strBadge.textContent).toBe('+7')
        expect(str.value).toBe(Options.extreme)
        expect(overrideInput(Statistics.str)?.value).toBe('+7')
        expect(ability.textContent).toContain('+7')
        ui.destroy()
    })

    it('restores a saved override and the manual toggle after another render', () => {
        const { ui, manual, strBadge } = start()
        enableManual(manual)
        commitBadge(strBadge, '+7')

        const preserved = capturePreservedControls(document.body)
        expect(preserved?.toggleManualInput).toBe('true')
        expect(preserved?.[`manualOverride.${Statistics.str}`]).toBe('+7')

        ui.destroy()
        for (const input of Array.from(
            document.querySelectorAll('input[name^="manualOverride."]'),
        )) {
            input.remove()
        }
        const dropdown = document.createElement('div')
        dropdown.id = 'creatureBuilderTraitsDropdown'
        dropdown.className = 'tagify__dropdown'
        dropdown.innerHTML = '<div class="tagify__dropdown__wrapper"></div>'
        document.body.append(dropdown)
        manual.checked = false
        strBadge.textContent = '+3'

        const restored = new CreatureBuilderFormUI(
            buildConfig({ preservedControls: preserved ?? undefined }),
        )
        restored.initialize()
        vi.runAllTimers()

        expect(manual.checked).toBe(true)
        expect(overrideInput(Statistics.str)?.value).toBe('+7')
        expect(strBadge.textContent).toBe('+7')
        restored.destroy()
    })

    it('commits a modifier with Enter and restores the previous value on Escape', () => {
        const { ui, manual, str, strBadge } = start()
        enableManual(manual)

        strBadge.click()
        const entering = strBadge.querySelector('input') as HTMLInputElement
        entering.value = '4'
        entering.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
        )
        expect(strBadge.textContent).toBe('+4')
        expect(str.value).toBe(Options.high)

        strBadge.click()
        const escaping = strBadge.querySelector('input') as HTMLInputElement
        escaping.value = '9'
        escaping.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
        )
        expect(strBadge.textContent).toBe('+4')
        expect(str.value).toBe(Options.high)
        ui.destroy()
    })

    it('grows the badge by about a fifth while editing and then restores it', () => {
        const { ui, manual, strBadge } = start()
        enableManual(manual)
        strBadge.getBoundingClientRect = () =>
            ({
                width: 40,
                height: 22,
                top: 0,
                left: 0,
                bottom: 22,
                right: 40,
                x: 0,
                y: 0,
                toJSON() {
                    return {}
                },
            }) as DOMRect

        strBadge.click()
        expect(strBadge.classList.contains('stat-value-badge--editing')).toBe(
            true,
        )
        expect(strBadge.style.width).toBe('48px')
        expect(strBadge.style.height).toBe('27px')

        const input = strBadge.querySelector('input') as HTMLInputElement
        input.value = '5'
        input.dispatchEvent(new Event('blur'))
        expect(strBadge.classList.contains('stat-value-badge--editing')).toBe(
            false,
        )
        expect(strBadge.style.width).toBe('')
        expect(strBadge.style.height).toBe('')
        ui.destroy()
    })

    it('keeps the previous badge when the typed text is not a number', () => {
        const { ui, manual, str, strBadge } = start()
        enableManual(manual)
        commitBadge(strBadge, 'nope')
        expect(strBadge.textContent).toBe('+3')
        expect(str.value).toBe(Options.moderate)
        expect(overrideInput(Statistics.str)).toBeNull()
        ui.destroy()
    })

    it('does not open an editor for a stat set to None', () => {
        const { ui, manual, spellBadge } = start()
        expect(spellBadge.textContent).toBe('--')
        enableManual(manual)
        expect(
            spellBadge.classList.contains('stat-value-badge--editable'),
        ).toBe(false)
        spellBadge.click()
        expect(spellBadge.querySelector('input')).toBeNull()
        ui.destroy()
    })

    it('saves HP without a plus and snaps its tier', () => {
        const { ui, manual, hp, hpBadge } = start()
        expect(hpBadge.textContent).toBe('20')
        enableManual(manual)
        commitBadge(hpBadge, '+28')
        expect(hpBadge.textContent).toBe('28')
        expect(hp.value).toBe(Options.extreme)
        expect(overrideInput(Statistics.hp)?.value).toBe('28')
        ui.destroy()
    })

    it('saves the spell box as a DC and leaves the select when that tier is missing', () => {
        const { ui, manual, spell, spellBadge, spellPreview } = start()
        spell.value = Options.moderate
        spell.dispatchEvent(new Event('change'))
        expect(spellBadge.textContent).toBe('14')

        enableManual(manual)
        commitBadge(spellBadge, '18')
        expect(spellBadge.textContent).toBe('18')
        expect(spell.value).toBe(Options.high)
        expect(spellPreview.textContent).toContain('18')
        expect(spellPreview.textContent).not.toContain('26')

        commitBadge(spellBadge, '+20')
        expect(spellBadge.textContent).toBe('20')
        expect(spell.value).toBe(Options.high)
        expect(overrideInput(Statistics.spellcasting)?.value).toBe('20')
        ui.destroy()
    })

    it('keeps the damage editor inside the form window', () => {
        const { ui, manual, damageBadge } = start()
        enableManual(manual)
        const previousRect = HTMLElement.prototype.getBoundingClientRect
        const frame = { left: 100, top: 50, width: 500, height: 400 }
        let anchor = { left: 120, bottom: 80 }
        let panel = { width: 100, height: 80 }
        const box = (
            left: number,
            top: number,
            width: number,
            height: number,
        ) =>
            ({
                x: left,
                y: top,
                left,
                top,
                right: left + width,
                bottom: top + height,
                width,
                height,
                toJSON() {
                    return {}
                },
            }) as DOMRect
        HTMLElement.prototype.getBoundingClientRect = function () {
            if (this.classList.contains('damage-editor')) {
                return box(0, 0, panel.width, panel.height)
            }
            if (this === document.body) {
                return box(frame.left, frame.top, frame.width, frame.height)
            }
            if (this === damageBadge) {
                return box(anchor.left, 0, 40, anchor.bottom)
            }
            return previousRect.call(this)
        }

        try {
            damageBadge.click()
            const editor = document.querySelector(
                '.damage-editor',
            ) as HTMLElement
            expect(editor.hidden).toBe(false)
            expect(editor.style.left).toBe('120px')
            expect(editor.style.top).toBe('84px')

            anchor = { left: 550, bottom: 420 }
            panel = { width: 200, height: 160 }
            damageBadge.click()
            expect(editor.style.left).toBe('400px')
            expect(editor.style.top).toBe('290px')

            panel = { width: 2000, height: 2000 }
            damageBadge.click()
            expect(editor.style.left).toBe('100px')
            expect(editor.style.top).toBe('50px')
        } finally {
            HTMLElement.prototype.getBoundingClientRect = previousRect
            ui.destroy()
        }
    })

    it('closes the damage editor on scroll without hiding the traits list', () => {
        const { ui, manual, damageBadge } = start()
        enableManual(manual)
        damageBadge.click()
        const editor = document.querySelector('.damage-editor') as HTMLElement
        expect(editor.hidden).toBe(false)

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
        expect(editor.hidden).toBe(true)
        expect(dropdown.classList.contains('show')).toBe(true)
        expect(dropdown.parentElement).toBe(document.body)
        ui.destroy()
    })

    it('opens a damage panel and saves the formula from its three fields', () => {
        const { ui, manual, damage, damageBadge, damagePreview } = start()
        expect(damageBadge.textContent).toBe('1d6+2')
        enableManual(manual)
        damageBadge.click()

        const editor = document.querySelector('.damage-editor') as HTMLElement
        expect(editor.hidden).toBe(false)
        const count = editor.querySelector(
            '.damage-editor-count',
        ) as HTMLInputElement
        const die = editor.querySelector(
            '.damage-editor-die',
        ) as HTMLSelectElement
        const bonus = editor.querySelector(
            '.damage-editor-bonus',
        ) as HTMLInputElement
        expect(count.value).toBe('1')
        expect(die.value).toBe('d6')
        expect(bonus.value).toBe('2')
        expect(Array.from(die.options).map((option) => option.value)).toEqual([
            'd4',
            'd6',
            'd8',
            'd10',
            'd12',
        ])
        const dieValue = editor.querySelector(
            '.damage-editor-die-value',
        ) as HTMLElement
        const dieIcon = editor.querySelector(
            '.damage-editor-die-icon',
        ) as HTMLElement
        expect(dieValue.textContent).toBe('d6')
        expect(dieIcon.tagName).toBe('SPAN')
        expect(dieIcon.closest('.damage-editor-die-trigger')).toBeNull()
        expect(dieIcon.nextElementSibling?.contains(dieValue)).toBe(true)
        expect(dieIcon.className).toBe(
            'fa-light fa-dice-d6 damage-editor-die-icon',
        )
        const choices = Array.from(
            editor.querySelectorAll<HTMLButtonElement>(
                '.damage-editor-die-option',
            ),
        )
        expect(choices.map((choice) => choice.dataset.die)).toEqual([
            'd4',
            'd6',
            'd8',
            'd10',
            'd12',
        ])
        for (const choice of choices) {
            const label = choice.querySelector(
                '.damage-editor-die-option-label',
            )
            const icon = choice.querySelector('i')
            expect(label?.textContent).toBe(choice.dataset.die)
            expect(label?.nextElementSibling).toBe(icon)
            expect(icon?.className).toBe(
                `fa-light fa-dice-${choice.dataset.die}`,
            )
        }
        const list = editor.querySelector(
            '.damage-editor-die-list',
        ) as HTMLElement
        expect(list.hidden).toBe(true)
        ;(
            editor.querySelector(
                '.damage-editor-die-trigger',
            ) as HTMLButtonElement
        ).click()
        expect(list.hidden).toBe(false)
        count.click()
        expect(list.hidden).toBe(true)
        ;(
            editor.querySelector(
                '.damage-editor-die-trigger',
            ) as HTMLButtonElement
        ).click()
        choices[3].click()
        expect(die.value).toBe('d10')
        expect(list.hidden).toBe(true)
        expect(dieValue.textContent).toBe('d10')
        expect(dieIcon.className).toBe(
            'fa-light fa-dice-d10 damage-editor-die-icon',
        )
        die.value = 'd6'
        die.dispatchEvent(new Event('change'))

        count.value = '2'
        die.value = 'd6'
        bonus.value = '-1'
        editor
            .querySelector('.damage-editor-apply')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        expect(damageBadge.textContent).toBe('2d6-1')
        expect(damage.value).toBe(Options.high)
        expect(overrideInput(Statistics.strikeDamage)?.value).toBe('2d6-1')
        expect(damagePreview.textContent).toContain('2d6-1')
        expect(editor.hidden).toBe(true)
        ui.destroy()
    })

    it('leaves attack damage unchanged when the panel is cancelled or the bonus is invalid', () => {
        const { ui, manual, damage, damageBadge } = start()
        enableManual(manual)
        damageBadge.click()
        const editor = document.querySelector('.damage-editor') as HTMLElement
        const bonus = editor.querySelector(
            '.damage-editor-bonus',
        ) as HTMLInputElement
        bonus.value = 'nope'
        editor
            .querySelector('.damage-editor-apply')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        expect(damageBadge.textContent).toBe('1d6+2')
        expect(editor.hidden).toBe(false)

        editor
            .querySelector('.damage-editor-cancel')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        expect(editor.hidden).toBe(true)
        expect(damageBadge.textContent).toBe('1d6+2')
        expect(damage.value).toBe(Options.moderate)
        expect(overrideInput(Statistics.strikeDamage)).toBeNull()
        ui.destroy()
    })

    it('saves a damage formula with no bonus', () => {
        const { ui, manual, damage, damageBadge } = start()
        enableManual(manual)
        damageBadge.click()
        const editor = document.querySelector('.damage-editor') as HTMLElement
        ;(
            editor.querySelector('.damage-editor-count') as HTMLInputElement
        ).value = '1'
        ;(
            editor.querySelector('.damage-editor-die') as HTMLSelectElement
        ).value = 'd8'
        ;(
            editor.querySelector('.damage-editor-bonus') as HTMLInputElement
        ).value = ''
        editor
            .querySelector('.damage-editor-apply')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        expect(damageBadge.textContent).toBe('1d8')
        expect(damage.value).toBe(Options.low)
        ui.destroy()
    })

    it('closes the damage panel on Escape without saving', () => {
        const { ui, manual, damageBadge } = start()
        enableManual(manual)
        damageBadge.click()
        const editor = document.querySelector('.damage-editor') as HTMLElement
        editor.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
        )
        expect(editor.hidden).toBe(false)
        editor.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
        )
        expect(editor.hidden).toBe(true)
        expect(damageBadge.textContent).toBe('1d6+2')
        ui.destroy()
    })

    it('shows and edits lore and extra-attack boxes', () => {
        const { ui, manual } = start()
        enableManual(manual)
        ui.addLoreSkill('Forest')
        const lore = document.querySelector('.loreEntry')!
        const loreBadge = lore.querySelector('.stat-value-badge') as HTMLElement
        const loreSelect = lore.querySelector('select') as HTMLSelectElement
        expect(loreBadge.textContent).toBe('+6')
        commitBadge(loreBadge, '10')
        expect(loreBadge.textContent).toBe('+10')
        expect(loreSelect.value).toBe(Options.extreme)
        expect(overrideInput('loreLevel0')?.value).toBe('+10')

        loreSelect.value = Options.low
        loreSelect.dispatchEvent(new Event('change'))
        expect(loreBadge.textContent).toBe('+4')
        expect(overrideInput('loreLevel0')).toBeNull()

        ui.addAttack('Claw')
        const attack = document.querySelector('.attackEntry')!
        const [bonusBadge, attackDamage] = Array.from(
            attack.querySelectorAll<HTMLElement>('.stat-value-badge'),
        )
        expect(bonusBadge.textContent).toBe('+7')
        expect(attackDamage.textContent).toBe('1d6+2')

        commitBadge(bonusBadge, '11')
        expect(bonusBadge.textContent).toBe('+11')
        expect(
            (
                attack.querySelector(
                    'select[name="attackBonus0"]',
                ) as HTMLSelectElement
            ).value,
        ).toBe(Options.extreme)
        expect(overrideInput('attackBonus0')?.value).toBe('+11')

        attackDamage.click()
        const editor = document.querySelector('.damage-editor') as HTMLElement
        ;(
            editor.querySelector('.damage-editor-count') as HTMLInputElement
        ).value = '3'
        ;(
            editor.querySelector('.damage-editor-die') as HTMLSelectElement
        ).value = 'd10'
        ;(
            editor.querySelector('.damage-editor-bonus') as HTMLInputElement
        ).value = '+2'
        editor
            .querySelector('.damage-editor-apply')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        expect(attackDamage.textContent).toBe('3d10+2')
        expect(
            (
                attack.querySelector(
                    'select[name="attackDamage0"]',
                ) as HTMLSelectElement
            ).value,
        ).toBe(Options.extreme)
        expect(overrideInput('attackDamage0')?.value).toBe('3d10+2')
        ui.destroy()
    })

    it('clears one edit when its select is changed by hand', () => {
        const { ui, manual, str, strBadge } = start()
        enableManual(manual)
        commitBadge(strBadge, '+7')
        str.value = Options.low
        str.dispatchEvent(new Event('change'))
        expect(strBadge.textContent).toBe('+1')
        expect(overrideInput(Statistics.str)).toBeNull()
        ui.destroy()
    })

    it('scales a typed value to its detected tier when the level changes', () => {
        const { ui, manual, str, strBadge } = start()
        enableManual(manual)
        commitBadge(strBadge, '+4')
        expect(str.value).toBe(Options.high)

        ui.addLoreSkill('Forest')
        const lore = document.querySelector('.loreEntry')!
        const loreBadge = lore.querySelector('.stat-value-badge') as HTMLElement
        const loreSelect = lore.querySelector('select') as HTMLSelectElement
        commitBadge(loreBadge, '+10')
        expect(loreSelect.value).toBe(Options.extreme)

        ui.addAttack('Claw')
        const attack = document.querySelector('.attackEntry')!
        const [bonusBadge, attackDamage] = Array.from(
            attack.querySelectorAll<HTMLElement>('.stat-value-badge'),
        )
        const bonusSelect = attack.querySelector(
            'select[name="attackBonus0"]',
        ) as HTMLSelectElement
        const damageSelect = attack.querySelector(
            'select[name="attackDamage0"]',
        ) as HTMLSelectElement
        commitBadge(bonusBadge, '11')
        attackDamage.click()
        const editor = document.querySelector('.damage-editor') as HTMLElement
        ;(
            editor.querySelector('.damage-editor-count') as HTMLInputElement
        ).value = '2'
        ;(
            editor.querySelector('.damage-editor-die') as HTMLSelectElement
        ).value = 'd6'
        ;(
            editor.querySelector('.damage-editor-bonus') as HTMLInputElement
        ).value = '-1'
        editor
            .querySelector('.damage-editor-apply')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        expect(bonusSelect.value).toBe(Options.extreme)
        expect(damageSelect.value).toBe(Options.high)

        const level = document.getElementById(
            'creatureBuilderLevel',
        ) as HTMLSelectElement
        level.value = '5'
        level.dispatchEvent(new Event('change'))

        expect(str.value).toBe(Options.high)
        expect(strBadge.textContent).toBe('+5')
        expect(overrideInput(Statistics.str)).toBeNull()
        expect(loreSelect.value).toBe(Options.extreme)
        expect(loreBadge.textContent).toBe('+16')
        expect(overrideInput('loreLevel0')).toBeNull()
        expect(bonusSelect.value).toBe(Options.extreme)
        expect(bonusBadge.textContent).toBe('+17')
        expect(overrideInput('attackBonus0')).toBeNull()
        expect(damageSelect.value).toBe(Options.high)
        expect(attackDamage.textContent).toBe('2d8+7')
        expect(overrideInput('attackDamage0')).toBeNull()
        ui.destroy()
    })

    it('clears roadmap stats and scales lore and extra attacks to their tiers', () => {
        const { ui, manual, str, strBadge } = start()
        enableManual(manual)
        commitBadge(strBadge, '+7')
        expect(str.value).toBe(Options.extreme)

        ui.addLoreSkill('Forest')
        const lore = document.querySelector('.loreEntry')!
        const loreBadge = lore.querySelector('.stat-value-badge') as HTMLElement
        const loreSelect = lore.querySelector('select') as HTMLSelectElement
        commitBadge(loreBadge, '+9')
        expect(loreSelect.value).toBe(Options.extreme)

        ui.addAttack('Claw')
        const attack = document.querySelector('.attackEntry')!
        const [bonusBadge, attackDamage] = Array.from(
            attack.querySelectorAll<HTMLElement>('.stat-value-badge'),
        )
        const bonusSelect = attack.querySelector(
            'select[name="attackBonus0"]',
        ) as HTMLSelectElement
        const damageSelect = attack.querySelector(
            'select[name="attackDamage0"]',
        ) as HTMLSelectElement
        commitBadge(bonusBadge, '+10')
        attackDamage.click()
        const editor = document.querySelector('.damage-editor') as HTMLElement
        ;(
            editor.querySelector('.damage-editor-count') as HTMLInputElement
        ).value = '2'
        ;(
            editor.querySelector('.damage-editor-die') as HTMLSelectElement
        ).value = 'd6'
        ;(
            editor.querySelector('.damage-editor-bonus') as HTMLInputElement
        ).value = '-1'
        editor
            .querySelector('.damage-editor-apply')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

        const roadmap = document.getElementById(
            'creatureBuilderRoadmap',
        ) as HTMLSelectElement
        roadmap.value = 'TestRoadmap'
        roadmap.dispatchEvent(new Event('change'))

        expect(str.value).toBe(Options.moderate)
        expect(strBadge.textContent).toBe('+3')
        expect(overrideInput(Statistics.str)).toBeNull()
        expect(loreSelect.value).toBe(Options.extreme)
        expect(loreBadge.textContent).toBe('+10')
        expect(overrideInput('loreLevel0')).toBeNull()
        expect(bonusSelect.value).toBe(Options.extreme)
        expect(bonusBadge.textContent).toBe('+11')
        expect(overrideInput('attackBonus0')).toBeNull()
        expect(damageSelect.value).toBe(Options.high)
        expect(attackDamage.textContent).toBe('1d6+3')
        expect(overrideInput('attackDamage0')).toBeNull()
        ui.destroy()
    })

    it('drops every edit when Manual Input or Show Bonuses is turned off', () => {
        const { ui, show, manual, str, strBadge } = start()
        enableManual(manual)
        commitBadge(strBadge, '+7')
        expect(str.value).toBe(Options.extreme)

        manual.checked = false
        manual.dispatchEvent(new Event('change'))
        expect(strBadge.textContent).toBe('+5')
        expect(overrideInput(Statistics.str)).toBeNull()
        expect(strBadge.classList.contains('stat-value-badge--editable')).toBe(
            false,
        )

        enableManual(manual)
        commitBadge(strBadge, '+7')
        show.checked = false
        show.dispatchEvent(new Event('change'))
        expect(manual.checked).toBe(false)
        expect(strBadge.textContent).toBe('+5')
        expect(overrideInput(Statistics.str)).toBeNull()
        ui.destroy()
    })

    it('drops edits on reset', () => {
        const { ui, manual, strBadge } = start()
        enableManual(manual)
        commitBadge(strBadge, '+7')
        ui.addLoreSkill('Forest')
        ui.resetToDefaults()
        expect(strBadge.textContent).toBe('+2')
        expect(overrideInput(Statistics.str)).toBeNull()
        expect(document.querySelector('.loreEntry')).toBeNull()
        ui.destroy()
    })
})

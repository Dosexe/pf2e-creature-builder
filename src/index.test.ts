// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const renderSpy = vi.fn()
const CreatureBuilderFormMock = vi.fn(function (
    this: any,
    actor: unknown,
    options?: unknown,
) {
    this.actor = actor
    this.options = options
    this.render = renderSpy
})

const loadCustomRoadmapsSpy = vi.fn().mockResolvedValue(undefined)
const RoadMapRegistryMock = {
    getInstance: vi.fn(() => ({
        loadCustomRoadmaps: loadCustomRoadmapsSpy,
    })),
}

type HookCallback = (...args: any[]) => void
let hooks: Record<string, HookCallback[]> = {}

class MockJQ {
    elements: Element[]

    constructor(elements: Element[]) {
        this.elements = elements
    }

    get length() {
        return this.elements.length
    }

    find(selector: string) {
        let baseSelector = selector
        let containsText: string | null = null
        const containsMatch = selector.match(/:contains\(['"](.+)['"]\)/)
        if (containsMatch) {
            containsText = containsMatch[1]
            baseSelector = selector.replace(containsMatch[0], '').trim()
        }

        const found: Element[] = []
        for (const el of this.elements) {
            const matches = baseSelector
                ? Array.from(el.querySelectorAll(baseSelector))
                : Array.from(el.querySelectorAll('*'))
            if (containsText) {
                found.push(
                    ...matches.filter((node) =>
                        (node.textContent || '').includes(containsText!),
                    ),
                )
            } else {
                found.push(...matches)
            }
        }
        return new MockJQ(found)
    }

    append(child: MockJQ | Element) {
        const childElements = child instanceof MockJQ ? child.elements : [child]
        this.elements.forEach((el) => {
            for (const childEl of childElements) {
                el.appendChild(childEl)
            }
        })
    }

    after(child: MockJQ | Element) {
        const childElement = child instanceof MockJQ ? child.elements[0] : child
        for (const el of this.elements) {
            el.after(childElement)
        }
    }

    on(event: string, handler: EventListenerOrEventListenerObject) {
        for (const el of this.elements) {
            el.addEventListener(event, handler)
        }
    }
}

const $ = (input: string | Element) => {
    if (typeof input === 'string') {
        const trimmed = input.trim()
        if (trimmed.startsWith('<')) {
            const template = document.createElement('template')
            template.innerHTML = trimmed
            return new MockJQ([template.content.firstElementChild!])
        }
        return new MockJQ(Array.from(document.querySelectorAll(trimmed)))
    }
    return new MockJQ([input])
}

const setupModule = async () => {
    hooks = {}
    vi.resetModules()
    vi.doMock(
        '@/utils',
        () => ({
            globalLog: vi.fn(),
        }),
        { virtual: true },
    )
    vi.doMock('./CreatureBuilderForm', () => ({
        CreatureBuilderForm: CreatureBuilderFormMock,
    }))
    vi.doMock('./RoadMapRegistry', () => ({
        RoadMapRegistry: RoadMapRegistryMock,
    }))
    CreatureBuilderFormMock.mockClear()
    renderSpy.mockClear()
    loadCustomRoadmapsSpy.mockClear()
    RoadMapRegistryMock.getInstance.mockClear()

    ;(globalThis as any).Hooks = {
        on: vi.fn((event: string, callback: HookCallback) => {
            hooks[event] = hooks[event] || []
            hooks[event].push(callback)
        }),
    }

    ;(globalThis as any).game = {
        settings: {
            register: vi.fn(),
            get: vi.fn().mockReturnValue(false),
        },
        user: {},
    }
    ;(globalThis as any).Actor = vi.fn(function (this: any, data: any) {
        Object.assign(this, data)
    })
    ;(globalThis as any).$ = $

    await import('./index')
}

const setupDom = () => {
    document.body.innerHTML = `
        <div id="sheet">
            <div class="window-header">
                <div class="window-title"></div>
            </div>
        </div>
        <div id="actors">
            <div class="directory-footer action-buttons"></div>
        </div>
    `
}

beforeEach(async () => {
    setupDom()
    await setupModule()
})

describe('index hooks', () => {
    it('registers settings and initializes RoadMapRegistry on init', async () => {
        await hooks.init?.[0]?.()
        const register = (globalThis as any).game.settings.register
        expect(register).toHaveBeenCalledTimes(2)
        expect(register).toHaveBeenCalledWith(
            'foundryvtt-pf2e-creature-builder',
            'roadmaps',
            expect.objectContaining({ scope: 'world', default: {} }),
        )
        expect(register).toHaveBeenCalledWith(
            'pf2e-creature-builder',
            'abbreviateName',
            expect.objectContaining({ type: Boolean, default: false }),
        )
        expect(RoadMapRegistryMock.getInstance).toHaveBeenCalled()
    })

    it('loads custom roadmaps on ready hook', async () => {
        await hooks.ready?.[0]?.()
        expect(loadCustomRoadmapsSpy).toHaveBeenCalled()
    })

    it('adds the Creature Builder button to npc sheets and opens form', () => {
        const actor = {
            type: 'npc',
            canUserModify: vi.fn().mockReturnValue(true),
        }
        const html = $('#sheet')

        hooks.renderActorSheet?.[0]?.({ object: actor }, html)

        const button = document.querySelector(
            '.window-header .popout',
        ) as HTMLElement
        expect(button).toBeTruthy()
        expect(button.textContent).toContain('Creature Builder')

        button.click()
        expect(CreatureBuilderFormMock).toHaveBeenCalledWith(actor)
        expect(renderSpy).toHaveBeenCalledWith(true)
    })

    it('skips non-npc actor sheets', () => {
        const actor = {
            type: 'character',
            canUserModify: vi.fn().mockReturnValue(true),
        }
        const html = $('#sheet')

        hooks.renderActorSheet?.[0]?.({ object: actor }, html)

        const button = document.querySelector('.window-header .popout')
        expect(button).toBeNull()
    })

    it('skips sheets when user cannot modify actor', () => {
        const actor = {
            type: 'npc',
            canUserModify: vi.fn().mockReturnValue(false),
        }
        const html = $('#sheet')

        hooks.renderActorSheet?.[0]?.({ object: actor }, html)

        const button = document.querySelector('.window-header .popout')
        expect(button).toBeNull()
    })

    it('uses abbreviated label when setting is enabled', () => {
        ;(globalThis as any).game.settings.get = vi.fn().mockReturnValue(true)
        const actor = {
            type: 'npc',
            canUserModify: vi.fn().mockReturnValue(true),
        }

        hooks.renderActorSheet?.[0]?.({ object: actor }, $('#sheet'))

        const button = document.querySelector(
            '.window-header .popout',
        ) as HTMLElement
        expect(button.textContent).toContain('CB')
    })

    it('does not add the directory button twice', () => {
        hooks.renderActorDirectory?.[0]?.()
        hooks.renderActorDirectory?.[0]?.()

        const buttons = document.querySelectorAll(
            '#actors .directory-footer.action-buttons button',
        )
        expect(buttons.length).toBe(1)
    })

    it('creates a new actor and opens form when directory button is clicked', () => {
        hooks.renderActorDirectory?.[0]?.()

        const button = document.querySelector(
            '#actors .directory-footer.action-buttons button',
        ) as HTMLElement
        expect(button).toBeTruthy()

        button.click()

        expect((globalThis as any).Actor).toHaveBeenCalledWith({
            name: 'Monster',
            type: 'npc',
            system: {
                details: {
                    level: {
                        value: '-1',
                    },
                },
            },
        })
        expect(CreatureBuilderFormMock).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Monster', type: 'npc' }),
            { useDefaultLevel: true },
        )
        expect(renderSpy).toHaveBeenCalledWith(true)
    })
})

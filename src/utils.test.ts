import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { globalLog } from './utils'

const MODULE_ID = 'pf2e-creature-builder'

describe('globalLog', () => {
    const originalGame = (globalThis as { game?: unknown }).game
    let logSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
        logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        delete (globalThis as { game?: unknown }).game
    })

    afterEach(() => {
        logSpy.mockRestore()
        if (originalGame === undefined) {
            delete (globalThis as { game?: unknown }).game
        } else {
            ;(globalThis as { game?: unknown }).game = originalGame
        }
    })

    it('logs when force is true without game', () => {
        globalLog(true, 'message', 123)
        expect(logSpy).toHaveBeenCalledWith(MODULE_ID, '|', 'message', 123)
    })

    it('logs when dev mode is enabled', () => {
        ;(globalThis as { game?: any }).game = {
            modules: new Map([
                [
                    '_dev-mode',
                    { api: { getPackageDebugValue: () => true } },
                ],
            ]),
        }
        globalLog(false, 'dev mode')
        expect(logSpy).toHaveBeenCalledWith(MODULE_ID, '|', 'dev mode')
    })

    it('does not log when dev mode is disabled', () => {
        ;(globalThis as { game?: any }).game = {
            modules: new Map([
                [
                    '_dev-mode',
                    { api: { getPackageDebugValue: () => false } },
                ],
            ]),
        }
        globalLog(false, 'quiet')
        expect(logSpy).not.toHaveBeenCalled()
    })

    it('does not log when dev mode module is missing', () => {
        ;(globalThis as { game?: any }).game = {
            modules: new Map(),
        }
        globalLog(false, 'quiet')
        expect(logSpy).not.toHaveBeenCalled()
    })
})

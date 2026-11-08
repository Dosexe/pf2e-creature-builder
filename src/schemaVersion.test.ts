import { beforeEach, describe, expect, it } from 'vitest'
import {
    currentSchemaVersion,
    schemaVersionUpdate,
    withSchemaVersion,
} from './schemaVersion'

function setGame(game: unknown) {
    ;(globalThis as { game?: unknown }).game = game
}

describe('currentSchemaVersion', () => {
    beforeEach(() => {
        setGame(undefined)
    })

    it('uses the registered latest schema version', () => {
        setGame({
            system: { id: 'sf2e' },
            settings: {
                settings: {
                    get: (key: string) =>
                        key === 'sf2e.worldSchemaVersion'
                            ? { default: 0.961 }
                            : undefined,
                },
                get: () => 0.841,
            },
        })

        expect(currentSchemaVersion()).toBe(0.961)
        expect(schemaVersionUpdate()).toEqual({
            'system._migration.version': 0.961,
        })
        expect(schemaVersionUpdate({ schemaVersion: 0.95 })).toEqual({})
    })

    it('falls back to the stored world schema version', () => {
        setGame({
            system: { id: 'pf2e' },
            settings: {
                settings: { get: () => undefined },
                get: () => 0.955,
            },
        })

        expect(currentSchemaVersion()).toBe(0.955)
    })

    it('returns nothing when the running system is not Pathfinder or Starfinder', () => {
        setGame({
            system: { id: 'dnd5e' },
            settings: {
                settings: { get: () => ({ default: 0.961 }) },
            },
        })

        expect(currentSchemaVersion()).toBeUndefined()
        expect(schemaVersionUpdate()).toEqual({})
    })
})

describe('withSchemaVersion', () => {
    beforeEach(() => {
        setGame({
            system: { id: 'sf2e' },
            settings: {
                settings: { get: () => ({ default: 0.961 }) },
            },
        })
    })

    it('records the current version on a new item', () => {
        expect(
            withSchemaVersion({
                name: 'Strike',
                type: 'melee',
                system: { bonus: { value: 8 } },
            }),
        ).toEqual({
            name: 'Strike',
            type: 'melee',
            system: {
                bonus: { value: 8 },
                _migration: { version: 0.961 },
            },
        })
    })

    it('keeps a version that is already recorded', () => {
        const item = {
            type: 'weapon',
            system: { _migration: { version: 0.9, previous: null } },
        }

        expect(withSchemaVersion(item)).toBe(item)
    })
})

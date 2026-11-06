import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
    CREATURE_SIZE_FIELD,
    FALLBACK_CREATURE_SIZES,
} from '@/systems/creatureSizes'

const SIZE_LABEL_KEY = `${CREATURE_SIZE_FIELD}.label`
const LANGUAGE_DIR = 'public/languages'

/**
 * Foundry expands dotted translation keys, then drops the whole file if that
 * throws. A label stored on a key that is also the parent of another key throws.
 */
function expandTranslations(
    source: Record<string, string>,
): Record<string, unknown> {
    const expanded: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(source)) {
        const parts = key.split('.')
        const leaf = parts.pop()
        if (!leaf) continue
        let target: Record<string, unknown> = expanded
        for (const part of parts) {
            if (target[part] === undefined) target[part] = {}
            const next = target[part]
            if (typeof next !== 'object' || next === null) {
                throw new TypeError(
                    `Cannot use 'in' operator to search for '${leaf}' in ${String(next)}`,
                )
            }
            target = next as Record<string, unknown>
        }
        if (typeof target[leaf] === 'string' || !(leaf in target)) {
            target[leaf] = value
            continue
        }
        throw new TypeError(
            `Cannot use 'in' operator to search for '${leaf}' in ${String(target[leaf])}`,
        )
    }
    return expanded
}

function translationAt(source: Record<string, unknown>, key: string): unknown {
    return key.split('.').reduce<unknown>((current, part) => {
        if (typeof current !== 'object' || current === null) return undefined
        return (current as Record<string, unknown>)[part]
    }, source)
}

function languageFiles(): string[] {
    return readdirSync(LANGUAGE_DIR)
        .filter((name) => name.endsWith('.json'))
        .sort()
}

describe('language files', () => {
    it('rejects a size label that is also the parent of the size options', () => {
        expect(() =>
            expandTranslations({
                [CREATURE_SIZE_FIELD]: 'Size',
                [`${CREATURE_SIZE_FIELD}.tiny`]: 'Tiny',
            }),
        ).toThrow(TypeError)
    })

    it('expands every language file, including size labels and size options', () => {
        const files = languageFiles()
        expect(files.length).toBeGreaterThan(0)
        const template = readFileSync(
            'public/forms/creatureBuilderForm.html',
            'utf8',
        )
        expect(template).toContain(`{{localize "${SIZE_LABEL_KEY}"}}`)
        expect(template).not.toContain(`{{localize "${CREATURE_SIZE_FIELD}"}}`)

        for (const file of files) {
            const translations = JSON.parse(
                readFileSync(`${LANGUAGE_DIR}/${file}`, 'utf8'),
            ) as Record<string, string>
            const keys = Object.keys(translations)
            const sorted = [...keys].sort()
            for (const [index, key] of sorted.entries()) {
                const child = sorted[index + 1]
                expect(child?.startsWith(`${key}.`) ?? false).toBe(false)
            }

            const expanded = expandTranslations(translations)
            expect(translationAt(expanded, 'PF2EMONSTERMAKER.str')).toEqual(
                expect.any(String),
            )
            expect(translationAt(expanded, SIZE_LABEL_KEY)).toEqual(
                expect.any(String),
            )
            for (const size of FALLBACK_CREATURE_SIZES) {
                expect(translationAt(expanded, size.label)).toEqual(
                    expect.any(String),
                )
            }
        }
    })
})

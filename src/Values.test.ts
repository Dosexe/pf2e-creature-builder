import { describe, it, expect } from 'vitest'
import { detectStatLevel, detectHPLevel } from './Values'
import { Options, Statistics } from './Keys'

describe('detectStatLevel', () => {
    describe('ability scores', () => {
        it('should detect extreme strength at level 1', () => {
            // At level 1, extreme STR is 5
            const result = detectStatLevel(Statistics.str, '1', 5)
            expect(result).toBe(Options.extreme)
        })

        it('should detect high strength at level 1', () => {
            // At level 1, high STR is 4
            const result = detectStatLevel(Statistics.str, '1', 4)
            expect(result).toBe(Options.high)
        })

        it('should detect moderate strength at level 1', () => {
            // At level 1, moderate STR is 3
            const result = detectStatLevel(Statistics.str, '1', 3)
            expect(result).toBe(Options.moderate)
        })

        it('should detect low strength at level 1', () => {
            // At level 1, low STR is 1
            const result = detectStatLevel(Statistics.str, '1', 1)
            expect(result).toBe(Options.low)
        })

        it('should find closest match for in-between values', () => {
            // Value 2 is between low (1) and moderate (3), should pick closest
            const result = detectStatLevel(Statistics.str, '1', 2)
            // 2 is equidistant from 1 and 3, but 1 comes first in iteration
            expect([Options.low, Options.moderate]).toContain(result)
        })
    })

    describe('perception', () => {
        it('should detect high perception at level 5', () => {
            // At level 5, high perception is 15
            const result = detectStatLevel(Statistics.per, '5', 15)
            expect(result).toBe(Options.high)
        })

        it('should detect moderate perception at level 5', () => {
            // At level 5, moderate perception is 12
            const result = detectStatLevel(Statistics.per, '5', 12)
            expect(result).toBe(Options.moderate)
        })
    })

    describe('armor class', () => {
        it('should detect extreme AC at level 10', () => {
            // At level 10, extreme AC is 33
            const result = detectStatLevel(Statistics.ac, '10', 33)
            expect(result).toBe(Options.extreme)
        })

        it('should detect low AC at level 10', () => {
            // At level 10, low AC is 27
            const result = detectStatLevel(Statistics.ac, '10', 27)
            expect(result).toBe(Options.low)
        })
    })

    describe('skills', () => {
        it('should detect high athletics at level 3', () => {
            // At level 3, high skill is 10
            const result = detectStatLevel(Statistics.athletics, '3', 10)
            expect(result).toBe(Options.high)
        })
    })

    describe('edge cases', () => {
        it('should return moderate for invalid statistic type', () => {
            const result = detectStatLevel('invalid' as Statistics, '1', 10)
            expect(result).toBe(Options.moderate)
        })

        it('should return moderate for invalid level', () => {
            const result = detectStatLevel(Statistics.str, '999', 10)
            expect(result).toBe(Options.moderate)
        })
    })
})

describe('detectHPLevel', () => {
    it('should detect high HP at level 5', () => {
        // At level 5, high HP is 94
        const result = detectHPLevel('5', 94)
        expect(result).toBe(Options.high)
    })

    it('should detect moderate HP at level 5', () => {
        // At level 5, moderate HP is 75
        const result = detectHPLevel('5', 75)
        expect(result).toBe(Options.moderate)
    })

    it('should detect low HP at level 5', () => {
        // At level 5, low HP is 56
        const result = detectHPLevel('5', 56)
        expect(result).toBe(Options.low)
    })

    it('should handle values between brackets', () => {
        // At level 5: low=56, moderate=75, high=94
        // midpoint between low and moderate is 65.5
        // Value 60 should be low
        const result = detectHPLevel('5', 60)
        expect(result).toBe(Options.low)
    })

    it('should handle values in upper bracket', () => {
        // At level 5: low=56, moderate=75, high=94
        // midpoint between moderate and high is 84.5
        // Value 90 should be high
        const result = detectHPLevel('5', 90)
        expect(result).toBe(Options.high)
    })

    it('should return moderate for invalid level', () => {
        const result = detectHPLevel('999', 100)
        expect(result).toBe(Options.moderate)
    })
})

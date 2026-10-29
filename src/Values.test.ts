import { describe, expect, it } from 'vitest'
import { Options, Statistics } from './Keys'
import {
    detectHPLevel,
    detectStatLevel,
    detectStrikeDamage,
    scaleStrikeBonus,
    scaleStrikeDamage,
    statisticValues,
} from './Values'

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

        it('should skip non-numeric table values and return closest match', () => {
            const levelTable = statisticValues[Statistics.str]['1']
            const origModerate = levelTable[Options.moderate]
            levelTable[Options.moderate] = 'not-a-number' as any
            try {
                const result = detectStatLevel(Statistics.str, '1', 3)
                expect([Options.low, Options.high, Options.extreme]).toContain(
                    result,
                )
            } finally {
                levelTable[Options.moderate] = origModerate
            }
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

describe('scaleStrikeBonus', () => {
    it('keeps an offset from the source tier when the level changes', () => {
        expect(scaleStrikeBonus('1', '5', Options.high, Options.high, 9)).toBe(
            15,
        )
        expect(scaleStrikeBonus('1', '5', Options.high, Options.high, 8)).toBe(
            14,
        )
    })

    it('uses the target tier when the original bonus is missing', () => {
        expect(
            scaleStrikeBonus('1', '5', Options.high, Options.extreme, null),
        ).toBe(17)
    })

    it('returns the original bonus when a tier has no table', () => {
        expect(
            scaleStrikeBonus('1', '999', Options.high, Options.high, 9),
        ).toBe(9)
        expect(
            scaleStrikeBonus('999', '5', Options.high, Options.high, null),
        ).toBe(0)
        expect(scaleStrikeBonus('1', '5', 'nope', Options.high, 4)).toBe(4)
    })
})

describe('detectStrikeDamage', () => {
    it('matches an exact formula and otherwise the closest tier', () => {
        expect(detectStrikeDamage('1', '1d6+3')).toBe(Options.high)
        expect(detectStrikeDamage('1', '1d8+2')).toBe(Options.high)
        expect(detectStrikeDamage('1', '2')).toBe(Options.moderate)
        expect(detectStrikeDamage('999', '1d6+3')).toBe(Options.moderate)
    })
})

describe('scaleStrikeDamage', () => {
    it('changes the dice count and bonus while keeping the die size', () => {
        expect(
            scaleStrikeDamage('1', '5', Options.high, Options.high, '1d6+3'),
        ).toBe('2d6+7')
        expect(
            scaleStrikeDamage('1', '5', Options.high, Options.high, '1d8+4'),
        ).toBe('2d8+8')
        expect(
            scaleStrikeDamage('1', '5', Options.high, Options.high, 'd8'),
        ).toBe('2d8+4')
        expect(
            scaleStrikeDamage('1', '5', Options.high, Options.high, '1d8-1'),
        ).toBe('2d8+3')
    })

    it('leaves the formula unchanged when the tier and level do not move it', () => {
        expect(
            scaleStrikeDamage('1', '1', Options.high, Options.high, '1d6 + 3'),
        ).toBe('1d6 + 3')
    })

    it('follows the selected target tier', () => {
        expect(
            scaleStrikeDamage('1', '5', Options.high, Options.low, '1d6+3'),
        ).toBe('2d6+6')
    })

    it('scales a flat bonus and drops a zero modifier', () => {
        expect(
            scaleStrikeDamage('1', '5', Options.high, Options.high, '2'),
        ).toBe('6')
        expect(
            scaleStrikeDamage(
                '1',
                '-1',
                Options.extreme,
                Options.extreme,
                '1d10+3',
            ),
        ).toBe('1d10')
    })

    it('keeps at least one die and leaves unusual formulas unchanged', () => {
        expect(
            scaleStrikeDamage('4', '1', Options.high, Options.high, '1d12+1'),
        ).toBe('1d12-1')
        expect(
            scaleStrikeDamage('1', '5', Options.high, Options.high, '1d6+1d4'),
        ).toBe('1d6+1d4')
        expect(
            scaleStrikeDamage('1', '999', Options.high, Options.high, '1d6+3'),
        ).toBe('1d6+3')
        expect(
            scaleStrikeDamage('999', '5', Options.high, Options.high, '1d6+3'),
        ).toBe('1d6+3')
    })
})

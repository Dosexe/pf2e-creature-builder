import { describe, expect, it } from 'vitest'
import { Options, Statistics } from './Keys'
import {
    closestTierForEdit,
    displayEditedDamage,
    displayEditedNumber,
    formatStrikeDamage,
    manualOverrideKey,
    manualOverrideNumber,
    manualOverrideText,
    parseStrikeDamage,
} from './manualValues'

describe('manual value parsing', () => {
    it('treats a bare number and a plus number as the same positive modifier', () => {
        expect(displayEditedNumber(Statistics.str, '5')).toBe('+5')
        expect(displayEditedNumber(Statistics.str, '+5')).toBe('+5')
        expect(displayEditedNumber(Statistics.str, '  +5 ')).toBe('+5')
        expect(displayEditedNumber(Statistics.per, '0')).toBe('+0')
    })

    it('keeps a minus only when the user typed one', () => {
        expect(displayEditedNumber(Statistics.str, '-2')).toBe('-2')
        expect(displayEditedNumber(Statistics.ref, ' -4 ')).toBe('-4')
    })

    it('rejects blank and non-integer text', () => {
        expect(displayEditedNumber(Statistics.str, '')).toBeUndefined()
        expect(displayEditedNumber(Statistics.str, '   ')).toBeUndefined()
        expect(displayEditedNumber(Statistics.str, 'abc')).toBeUndefined()
        expect(displayEditedNumber(Statistics.str, '++5')).toBeUndefined()
        expect(displayEditedNumber(Statistics.str, '5.5')).toBeUndefined()
        expect(displayEditedNumber(Statistics.str, '+')).toBeUndefined()
        expect(displayEditedNumber(Statistics.str, '+ 5')).toBeUndefined()
        expect(
            displayEditedNumber(Statistics.str, '999999999999999999999'),
        ).toBeUndefined()
    })

    it('shows HP, AC, and spell DC without a plus', () => {
        expect(displayEditedNumber(Statistics.hp, '25')).toBe('25')
        expect(displayEditedNumber(Statistics.hp, '+25')).toBe('25')
        expect(displayEditedNumber(Statistics.ac, '+16')).toBe('16')
        expect(displayEditedNumber(Statistics.spellcasting, '+18')).toBe('18')
        expect(displayEditedNumber(Statistics.hp, '-1')).toBe('-1')
    })
})

describe('attack damage formulas', () => {
    it('builds a formula from dice count, die, and bonus', () => {
        expect(displayEditedDamage('2', 'd6', '4')).toBe('2d6+4')
        expect(displayEditedDamage('+2', 'd6', '+4')).toBe('2d6+4')
        expect(displayEditedDamage('2', 'd6', '-1')).toBe('2d6-1')
        expect(displayEditedDamage('1', 'd8', '')).toBe('1d8')
        expect(displayEditedDamage('1', 'd8', '0')).toBe('1d8')
        expect(displayEditedDamage('1', 'd8', '+0')).toBe('1d8')
    })

    it('rejects an unusable dice count, die, or bonus', () => {
        expect(displayEditedDamage('0', 'd6', '1')).toBeUndefined()
        expect(displayEditedDamage('-1', 'd6', '1')).toBeUndefined()
        expect(displayEditedDamage('1.5', 'd6', '1')).toBeUndefined()
        expect(displayEditedDamage('2', 'd20', '1')).toBeUndefined()
        expect(displayEditedDamage('2', 'd6', 'nope')).toBeUndefined()
        expect(displayEditedDamage('', 'd6', '1')).toBeUndefined()
        expect(formatStrikeDamage(0, 'd6', 1)).toBeUndefined()
        expect(formatStrikeDamage(1.5, 'd6', 1)).toBeUndefined()
        expect(formatStrikeDamage(1, 'd20', 1)).toBeUndefined()
        expect(formatStrikeDamage(1, 'd6', 1.5)).toBeUndefined()
    })

    it('reads an existing formula back into its three parts', () => {
        expect(parseStrikeDamage('2d6+4')).toEqual({
            dice: 2,
            die: 'd6',
            bonus: 4,
        })
        expect(parseStrikeDamage('2d6-1')).toEqual({
            dice: 2,
            die: 'd6',
            bonus: -1,
        })
        expect(parseStrikeDamage('1d8')).toEqual({
            dice: 1,
            die: 'd8',
            bonus: 0,
        })
        expect(parseStrikeDamage('1d20+1')).toBeUndefined()
        expect(parseStrikeDamage('2d6+4+1')).toBeUndefined()
    })
})

describe('closest tier for a saved edit', () => {
    it('snaps modifiers, HP, spell DC, and damage to the nearest level 1 tier', () => {
        expect(closestTierForEdit(Statistics.str, '1', '+7')).toBe(
            Options.extreme,
        )
        expect(closestTierForEdit(Statistics.str, '1', '4')).toBe(Options.high)
        expect(closestTierForEdit(Statistics.hp, '1', '+28')).toBe(
            Options.extreme,
        )
        expect(closestTierForEdit(Statistics.spellcasting, '1', '18')).toBe(
            Options.high,
        )
        expect(closestTierForEdit(Statistics.spellcasting, '1', '20')).toBe(
            Options.extreme,
        )
        expect(closestTierForEdit(Statistics.acrobatics, '1', '+10')).toBe(
            Options.extreme,
        )
        expect(closestTierForEdit(Statistics.strikeDamage, '1', '2d6-1')).toBe(
            Options.high,
        )
    })

    it('does not choose a tier for text that is not a number', () => {
        expect(closestTierForEdit(Statistics.str, '1', 'nope')).toBeUndefined()
        expect(closestTierForEdit(Statistics.hp, '1', '')).toBeUndefined()
    })
})

describe('manual override form fields', () => {
    it('reads a saved number and ignores blank or non-numeric text', () => {
        const formData = {
            [manualOverrideKey(Statistics.str)]: ' +7 ',
            [manualOverrideKey(Statistics.hp)]: 'abc',
            [manualOverrideKey('loreLevel0')]: '',
            [manualOverrideKey('attackDamage0')]: '2d6+4',
        }

        expect(manualOverrideKey(Statistics.str)).toBe(
            'manualOverride.PF2EMONSTERMAKER.str',
        )
        expect(manualOverrideNumber(formData, Statistics.str)).toBe(7)
        expect(manualOverrideNumber(formData, Statistics.hp)).toBeUndefined()
        expect(manualOverrideText(formData, 'loreLevel0')).toBeUndefined()
        expect(manualOverrideText(formData, 'attackDamage0')).toBe('2d6+4')
        expect(manualOverrideText(formData, 'missing')).toBeUndefined()
        expect(
            manualOverrideNumber({ note: 4 }, Statistics.str),
        ).toBeUndefined()
    })
})

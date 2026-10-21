import { describe, expect, it } from 'vitest'
import { coreValue } from '../index'

describe('core', () => {
    it('exports the core value', () => {
        expect(coreValue).toBe(1)
    })
})

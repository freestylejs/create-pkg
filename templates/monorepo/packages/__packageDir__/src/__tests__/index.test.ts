import { describe, expect, it } from 'vitest'
import { value } from '../index'

describe('__PACKAGE_NAME__', () => {
    it('exports the starter value', () => {
        expect(value).toBe(2)
    })
})

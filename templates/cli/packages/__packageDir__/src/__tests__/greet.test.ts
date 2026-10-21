import { describe, expect, it } from 'vitest'
import { greet } from '../greet'

describe('greet', () => {
    it('greets the provided name', () => {
        expect(greet('Ada')).toBe('Hello, Ada!')
    })
})

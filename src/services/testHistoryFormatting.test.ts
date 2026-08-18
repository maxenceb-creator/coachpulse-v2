import { describe, expect, it } from 'vitest'
import { formatSignedTestValue } from './testHistoryFormatting'

describe('formatSignedTestValue', () => {
  it.each([0, -0, -0.001, 0.001])('normalise %s en zéro sans signe', (value) =>
    expect(formatSignedTestValue(value, ' %')).toBe('0 %'),
  )

  it('conserve les signes des valeurs significatives', () => {
    expect(formatSignedTestValue(5.405, ' %')).toBe('+5,41 %')
    expect(formatSignedTestValue(-0.2, ' SECOND')).toBe('-0,2 SECOND')
  })

  it('conserve la valeur non calculable', () => {
    expect(formatSignedTestValue(undefined, ' %')).toBe('—')
  })
})

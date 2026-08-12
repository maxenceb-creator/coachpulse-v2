import { describe, expect, it, vi } from 'vitest'
import { definitionUpdatePayload } from './testsCatalogueRepository'

vi.mock('../config/firebase', () => ({ db: {} }))

describe('testsCatalogueRepository', () => {
  it('n’envoie que les champs modifiables et retire les undefined imbriqués', () => {
    expect(
      definitionUpdatePayload({
        testDefinitionId: 'test-vertical-jump-v1',
        code: 'VERTICAL_JUMP',
        version: 1,
        createdBy: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'DRAFT',
        metrics: [
          {
            metricKey: 'HEIGHT',
            label: 'Hauteur',
            valueType: 'NUMBER',
            unit: 'CENTIMETER',
            direction: 'HIGHER_IS_BETTER',
            precision: 0,
            minValue: 0,
            maxValue: undefined,
            required: true,
            order: 0,
          },
        ],
      }),
    ).toEqual({
      status: 'DRAFT',
      metrics: [
        {
          metricKey: 'HEIGHT',
          label: 'Hauteur',
          valueType: 'NUMBER',
          unit: 'CENTIMETER',
          direction: 'HIGHER_IS_BETTER',
          precision: 0,
          minValue: 0,
          required: true,
          order: 0,
        },
      ],
    })
  })
})

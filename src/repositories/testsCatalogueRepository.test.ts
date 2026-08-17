import { describe, expect, it, vi } from 'vitest'
import { set as setDocument } from './firestoreRepository'
import { definitionUpdatePayload } from './testsCatalogueRepository'
import { testsCatalogueRepository } from './testsCatalogueRepository'

vi.mock('../config/firebase', () => ({ db: {} }))
vi.mock('./firestoreRepository', () => ({
  many: vi.fn(),
  one: vi.fn(),
  set: vi.fn(async () => undefined),
  update: vi.fn(),
}))

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

  it('crée un benchmark sans prélecture transactionnelle du document absent', async () => {
    await testsCatalogueRepository.createBenchmark({
      testBenchmarkId:
        'benchmark_season_subcat-u13_test-vertical-jump-v1_v1_HEIGHT_TARGET',
      testDefinitionId: 'test-vertical-jump-v1',
      testDefinitionVersion: 1,
      metricKey: 'HEIGHT',
      subCategoryId: 'subcat-u13',
      seasonId: 'season',
      benchmarkLevel: 'TARGET',
      targetValue: 35,
      status: 'ACTIVE',
      createdBy: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    expect(setDocument).toHaveBeenCalledWith(
      'testBenchmarks',
      'benchmark_season_subcat-u13_test-vertical-jump-v1_v1_HEIGHT_TARGET',
      expect.objectContaining({
        testDefinitionId: 'test-vertical-jump-v1',
        metricKey: 'HEIGHT',
        targetValue: 35,
      }),
    )
  })
})

import { describe, expect, it } from 'vitest'
import { metricColumns } from '../services/testEntryColumns'
import type { TestDefinition } from '../types/domain'

describe('table de saisie Tests', () => {
  it('dérive toutes les colonnes des métriques sans connaître le protocole', () => {
    const definition = {
      metrics: [
        { metricKey: 'TIME', label: 'Temps', unit: 'SECOND' },
        { metricKey: 'NEW_METRIC', label: 'Nouvelle métrique', unit: 'COUNT' },
      ],
    } as TestDefinition
    expect(metricColumns(definition)).toEqual([
      { key: 'TIME', label: 'Temps', unit: 'SECOND' },
      { key: 'NEW_METRIC', label: 'Nouvelle métrique', unit: 'COUNT' },
    ])
  })
})

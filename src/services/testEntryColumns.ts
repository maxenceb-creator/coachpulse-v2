import type { TestDefinition } from '../types/domain'

export const metricColumns = (definition: TestDefinition) =>
  definition.metrics.map(({ metricKey, label, unit }) => ({
    key: metricKey,
    label,
    unit,
  }))

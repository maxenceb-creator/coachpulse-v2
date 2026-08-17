import type { TestDefinition } from '../types/domain'

export const metricColumns = (definition: TestDefinition) =>
  definition.metrics
    .map((metric, index) => ({ metric, index }))
    .sort((a, b) => (a.metric.order ?? a.index) - (b.metric.order ?? b.index))
    .map(({ metric: { metricKey, label, unit } }) => ({
      key: metricKey,
      label,
      unit,
    }))

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { TestBenchmark } from '../types/domain'
import { BenchmarkRow } from './TestDefinitionAdminPage'

const benchmark = (targetValue: number): TestBenchmark => ({
  testBenchmarkId: 'benchmark-height-target',
  testDefinitionId: 'test-vertical-jump-v1',
  testDefinitionVersion: 1,
  metricKey: 'HEIGHT',
  subCategoryId: 'subcat-u13',
  seasonId: 'season',
  benchmarkLevel: 'TARGET',
  targetValue,
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('BenchmarkRow', () => {
  it('resynchronise la valeur locale après une mise à jour Firestore', () => {
    const props = {
      subCategoryName: 'U13F',
      onUpdate: vi.fn(),
      onArchive: vi.fn(),
      onDelete: vi.fn(),
      isMutating: false,
    }
    const { rerender } = render(
      <table>
        <tbody>
          <BenchmarkRow {...props} item={benchmark(35)} />
        </tbody>
      </table>,
    )

    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe(
      '35',
    )

    rerender(
      <table>
        <tbody>
          <BenchmarkRow {...props} item={benchmark(45)} />
        </tbody>
      </table>,
    )

    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe(
      '45',
    )
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { testsCatalogueService } from '../services/appTestsService'
import type { TestBenchmark, TestDefinition } from '../types/domain'
import { queryKeys } from '../query/queryKeys'
import {
  useTestDefinitionAdmin,
  useTestsCatalogueMutations,
} from './useTestsCatalogue'

vi.mock('../services/appTestsService', () => ({
  testsCatalogueService: {
    get: vi.fn(),
    listBenchmarks: vi.fn(),
    subCategories: vi.fn(),
    createBenchmark: vi.fn(),
    updateBenchmark: vi.fn(),
    archiveBenchmark: vi.fn(),
    deleteBenchmark: vi.fn(),
  },
}))

const definition: TestDefinition = {
  testDefinitionId: 'test-vertical-jump-v1',
  name: 'Détente verticale',
  code: 'VERTICAL_JUMP',
  domain: 'PHYSICAL',
  status: 'DRAFT',
  version: 1,
  metrics: [
    {
      metricKey: 'HEIGHT',
      label: 'Hauteur',
      valueType: 'NUMBER',
      unit: 'CENTIMETER',
      direction: 'HIGHER_IS_BETTER',
      required: true,
      order: 0,
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
}

const context = {
  userId: 'user',
  activeRoleId: 'role',
  teamId: 'team',
  seasonId: 'season',
  categoryId: 'category',
  accesses: [
    {
      userTeamAccessId: 'access',
      userId: 'user',
      teamId: 'team',
      status: 'ACTIVE' as const,
      rolePermissions: {
        role: {
          permissions: ['tests.manage'],
          medicalAccessLevel: 'NONE' as const,
        },
      },
    },
  ],
  securityContextReady: true,
}

describe('useTestDefinitionAdmin — benchmark DRAFT', () => {
  let client: QueryClient
  let benchmarks: TestBenchmark[]

  beforeEach(() => {
    client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    benchmarks = []
    vi.mocked(testsCatalogueService.get).mockResolvedValue({ definition })
    vi.mocked(testsCatalogueService.subCategories).mockResolvedValue([])
    vi.mocked(testsCatalogueService.listBenchmarks).mockImplementation(
      async () => benchmarks,
    )
    vi.mocked(testsCatalogueService.createBenchmark).mockImplementation(
      async (_context, input) => {
        const created: TestBenchmark = {
          ...input,
          testBenchmarkId: 'benchmark-height-target',
          status: 'ACTIVE',
          createdBy: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        benchmarks = [created]
        return created
      },
    )
    vi.mocked(testsCatalogueService.updateBenchmark).mockImplementation(
      async (_context, benchmarkId, input) => {
        const updated = {
          ...benchmarks.find((item) => item.testBenchmarkId === benchmarkId)!,
          ...input,
          updatedAt: new Date(),
        }
        benchmarks = benchmarks.map((item) =>
          item.testBenchmarkId === benchmarkId ? updated : item,
        )
        return updated
      },
    )
    vi.mocked(testsCatalogueService.archiveBenchmark).mockImplementation(
      async (_context, benchmarkId) => {
        const archived = {
          ...benchmarks.find((item) => item.testBenchmarkId === benchmarkId)!,
          status: 'ARCHIVED' as const,
          updatedAt: new Date(),
        }
        benchmarks = benchmarks.map((item) =>
          item.testBenchmarkId === benchmarkId ? archived : item,
        )
        return archived
      },
    )
    vi.mocked(testsCatalogueService.deleteBenchmark).mockImplementation(
      async (_context, benchmarkId) => {
        benchmarks = benchmarks.filter(
          (item) => item.testBenchmarkId !== benchmarkId,
        )
      },
    )
  })

  it('charge HEIGHT, crée TARGET 35 et recharge la liste', async () => {
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(
      () => ({
        admin: useTestDefinitionAdmin(context, definition.testDefinitionId),
        mutations: useTestsCatalogueMutations(
          context,
          definition.testDefinitionId,
        ),
      }),
      { wrapper },
    )

    await waitFor(() =>
      expect(
        result.current.admin.detail.data?.definition.metrics[0]?.metricKey,
      ).toBe('HEIGHT'),
    )

    const analysisKey = queryKeys.tests.analysis(
      context.userId,
      context.activeRoleId,
      context.teamId,
      context.seasonId,
      definition.testDefinitionId,
      1,
      'HEIGHT',
    )
    client.setQueryData(analysisKey, { staleBenchmark: true })

    await act(() =>
      result.current.mutations.createBenchmark.mutateAsync({
        testDefinitionId: definition.testDefinitionId,
        testDefinitionVersion: 1,
        seasonId: 'season',
        subCategoryId: 'subcat-u13-2026',
        metricKey: 'HEIGHT',
        benchmarkLevel: 'TARGET',
        targetValue: 35,
      }),
    )

    await waitFor(() =>
      expect(result.current.admin.benchmarks.data).toEqual([
        expect.objectContaining({ metricKey: 'HEIGHT', targetValue: 35 }),
      ]),
    )
    expect(client.getQueryState(analysisKey)?.isInvalidated).toBe(true)

    await act(() =>
      result.current.mutations.updateBenchmark.mutateAsync({
        benchmarkId: 'benchmark-height-target',
        targetValue: 45,
      }),
    )
    await waitFor(() =>
      expect(result.current.admin.benchmarks.data?.[0]?.targetValue).toBe(45),
    )

    await act(() =>
      result.current.mutations.archiveBenchmark.mutateAsync(
        'benchmark-height-target',
      ),
    )
    await waitFor(() =>
      expect(result.current.admin.benchmarks.data?.[0]?.status).toBe(
        'ARCHIVED',
      ),
    )

    await act(() =>
      result.current.mutations.deleteBenchmark.mutateAsync(
        'benchmark-height-target',
      ),
    )
    await waitFor(() =>
      expect(result.current.admin.benchmarks.data).toEqual([]),
    )
  })
})

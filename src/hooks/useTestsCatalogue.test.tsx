import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { testsCatalogueService } from '../services/appTestsService'
import type { TestBenchmark, TestDefinition } from '../types/domain'
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
  })
})

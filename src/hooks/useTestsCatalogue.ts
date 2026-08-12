import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../query/queryKeys'
import { testsCatalogueService } from '../services/appTestsService'
import type {
  CatalogueSecurityContext,
  DefinitionDraftInput,
} from '../services/testsCatalogueService'
import type { TestBenchmark } from '../types/domain'
import { isTestDefinitionAdminQueryEnabled } from '../pages/testDefinitionAdminState'

export type TestsCatalogueHookContext = CatalogueSecurityContext & {
  securityContextReady: boolean
}

const keys = (context: TestsCatalogueHookContext) => ({
  catalogue: queryKeys.tests.catalogue(
    context.userId,
    context.activeRoleId,
    context.teamId,
    context.seasonId,
  ),
})

export const useTestsCatalogue = (context: TestsCatalogueHookContext) =>
  useQuery({
    queryKey: keys(context).catalogue,
    queryFn: () => testsCatalogueService.list(context),
    enabled: context.securityContextReady,
  })

export const useTestDefinitionAdmin = (
  context: TestsCatalogueHookContext,
  id: string,
) => {
  const detailEnabled = isTestDefinitionAdminQueryEnabled(context, id)
  const detail = useQuery({
    queryKey: queryKeys.tests.definitionAdmin(
      context.userId,
      context.activeRoleId,
      context.teamId,
      context.seasonId,
      id,
    ),
    queryFn: async () => {
      if (import.meta.env.DEV) {
        console.debug('[TestCatalogueAdmin DEV] Query start', {
          documentPath: `testDefinitions/${id}`,
          enabled: detailEnabled,
        })
      }
      try {
        const result = await testsCatalogueService.get(context, id)
        if (import.meta.env.DEV) {
          console.debug('[TestCatalogueAdmin DEV] Query success', {
            found: true,
            definitionId: result.definition.testDefinitionId,
            version: result.definition.version,
            status: result.definition.status,
          })
        }
        return result
      } catch (error) {
        if (import.meta.env.DEV) {
          const failure = error as Error & { code?: string }
          console.error('[TestCatalogueAdmin DEV] Query error', {
            code: failure.code ?? 'UNKNOWN',
            message: failure.message,
          })
        }
        throw error
      }
    },
    enabled: detailEnabled,
  })
  const benchmarks = useQuery({
    queryKey: queryKeys.tests.benchmarksAdmin(
      context.userId,
      context.activeRoleId,
      context.teamId,
      context.seasonId,
      id,
      detail.data?.definition.version ?? 0,
    ),
    queryFn: () =>
      testsCatalogueService.listBenchmarks(
        context,
        id,
        detail.data!.definition.version,
      ),
    enabled: context.securityContextReady && !!detail.data,
  })
  const subCategories = useQuery({
    queryKey: [...keys(context).catalogue, 'subCategories'],
    queryFn: () => testsCatalogueService.subCategories(context),
    enabled: detailEnabled && !!context.categoryId,
  })
  return { detail, benchmarks, subCategories }
}

export const useTestsCatalogueMutations = (
  context: TestsCatalogueHookContext,
  id?: string,
) => {
  const client = useQueryClient()
  const invalidate = async (definitionId?: string) => {
    await client.invalidateQueries({ queryKey: keys(context).catalogue })
    if (definitionId)
      await client.invalidateQueries({
        queryKey: queryKeys.tests.definitionAdmin(
          context.userId,
          context.activeRoleId,
          context.teamId,
          context.seasonId,
          definitionId,
        ),
      })
    await client.invalidateQueries({
      queryKey: queryKeys.tests.definitions(
        context.userId,
        context.activeRoleId,
        context.teamId,
        context.seasonId,
      ),
    })
  }
  return {
    create: useMutation({
      mutationFn: (input: DefinitionDraftInput) =>
        testsCatalogueService.create(context, input),
      onSuccess: (definition) => invalidate(definition.testDefinitionId),
    }),
    update: useMutation({
      mutationFn: (input: DefinitionDraftInput) =>
        testsCatalogueService.updateDraft(context, id!, input),
      onSuccess: () => invalidate(id),
    }),
    activate: useMutation({
      mutationFn: () => testsCatalogueService.activate(context, id!),
      onSuccess: () => invalidate(id),
    }),
    nextVersion: useMutation({
      mutationFn: () => testsCatalogueService.createNextVersion(context, id!),
      onSuccess: (definition) => invalidate(definition.testDefinitionId),
    }),
    archive: useMutation({
      mutationFn: () => testsCatalogueService.archive(context, id!),
      onSuccess: () => invalidate(id),
    }),
    remove: useMutation({
      mutationFn: () => testsCatalogueService.deleteUnusedDraft(context, id!),
      onSuccess: () => invalidate(),
    }),
    createBenchmark: useMutation({
      mutationFn: async (
        input: Omit<
          TestBenchmark,
          'testBenchmarkId' | 'status' | 'createdAt' | 'updatedAt' | 'createdBy'
        >,
      ) => {
        if (import.meta.env.DEV)
          console.debug('[TestCatalogueAdmin DEV] Benchmark create start', {
            documentId: [
              'benchmark',
              input.seasonId,
              input.subCategoryId,
              input.testDefinitionId,
              `v${input.testDefinitionVersion}`,
              input.metricKey,
              input.benchmarkLevel,
            ].join('_'),
            ...input,
          })
        try {
          return await testsCatalogueService.createBenchmark(context, input)
        } catch (error) {
          if (import.meta.env.DEV) {
            const failure = error as Error & { code?: string }
            console.error('[TestCatalogueAdmin DEV] Benchmark create error', {
              code: failure.code ?? 'UNKNOWN',
              message: failure.message,
            })
          }
          throw error
        }
      },
      onSuccess: () =>
        client.invalidateQueries({
          queryKey: [
            'testBenchmarksAdmin',
            context.userId,
            context.activeRoleId,
            context.teamId,
            context.seasonId,
            id,
          ],
        }),
    }),
    archiveBenchmark: useMutation({
      mutationFn: (benchmarkId: string) =>
        testsCatalogueService.archiveBenchmark(context, benchmarkId),
      onSuccess: () =>
        client.invalidateQueries({
          queryKey: [
            'testBenchmarksAdmin',
            context.userId,
            context.activeRoleId,
            context.teamId,
            context.seasonId,
            id,
          ],
        }),
    }),
    updateBenchmark: useMutation({
      mutationFn: (input: {
        benchmarkId: string
        targetValue: number
        label?: string
      }) =>
        testsCatalogueService.updateBenchmark(context, input.benchmarkId, {
          targetValue: input.targetValue,
          label: input.label,
        }),
      onSuccess: () =>
        client.invalidateQueries({
          queryKey: [
            'testBenchmarksAdmin',
            context.userId,
            context.activeRoleId,
            context.teamId,
            context.seasonId,
            id,
          ],
        }),
    }),
  }
}

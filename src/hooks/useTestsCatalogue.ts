import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../query/queryKeys'
import {
  invalidateTestPlayerHistory,
  updateTestPlayerHistoryBenchmark,
} from '../query/testPlayerHistoryCache'
import { testsCatalogueService } from '../services/appTestsService'
import type {
  CatalogueSecurityContext,
  DefinitionDraftInput,
} from '../services/testsCatalogueService'
import type { TestBenchmark, TestDefinition } from '../types/domain'
import { isTestDefinitionAdminQueryEnabled } from '../pages/testDefinitionAdminState'
import {
  benchmarkDocumentId,
  canManageTests,
  TestsCatalogueError,
} from '../services/testsCatalogueService'

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
  const benchmarkAdminPrefix = [
    'testBenchmarksAdmin',
    context.userId,
    context.activeRoleId,
    context.teamId,
    context.seasonId,
    id,
  ] as const
  const updateBenchmarkCache = (
    updateCached: (items: TestBenchmark[]) => TestBenchmark[],
  ) =>
    client.setQueriesData<TestBenchmark[]>(
      { queryKey: benchmarkAdminPrefix },
      (items) => (items ? updateCached(items) : items),
    )
  const refreshBenchmarks = () =>
    client.invalidateQueries({ queryKey: benchmarkAdminPrefix })
  const setDefinitionCache = (definition: TestDefinition) =>
    client.setQueryData(
      queryKeys.tests.definitionAdmin(
        context.userId,
        context.activeRoleId,
        context.teamId,
        context.seasonId,
        definition.testDefinitionId,
      ),
      { definition },
    )
  const runBenchmarkMutation = async <T>(
    operation: 'create' | 'update' | 'archive' | 'delete',
    benchmarkId: string,
    mutation: () => Promise<T>,
  ) => {
    if (import.meta.env.DEV)
      console.debug('[TestBenchmarkMutation DEV]', {
        operation,
        benchmarkId,
        step: 'mutation start',
        uid: context.userId,
        activeRoleId: context.activeRoleId,
        teamId: context.teamId,
        seasonId: context.seasonId,
        categoryId: context.categoryId,
        securityContextReady: context.securityContextReady,
        canManageTests: canManageTests(context.accesses, context),
      })
    try {
      const result = await mutation()
      if (import.meta.env.DEV)
        console.debug('[TestBenchmarkMutation DEV]', {
          operation,
          benchmarkId,
          step: 'Firestore success',
        })
      return result
    } catch (error) {
      if (import.meta.env.DEV) {
        const failure = error as Error & { code?: string }
        console.error('[TestBenchmarkMutation DEV]', {
          operation,
          benchmarkId,
          step: 'mutation error',
          layer:
            error instanceof TestsCatalogueError
              ? 'service'
              : failure.code
                ? 'FIRESTORE'
                : 'repository',
          code: failure.code ?? 'UNKNOWN',
          message: failure.message,
        })
      }
      throw error
    }
  }
  const reconcileBenchmarkQueries = (
    operation: 'create' | 'update' | 'archive' | 'delete',
    benchmarkId: string,
  ) => {
    if (import.meta.env.DEV)
      console.debug('[TestBenchmarkMutation DEV]', {
        operation,
        benchmarkId,
        step: 'invalidation start',
      })
    void Promise.all([
      refreshBenchmarks(),
      invalidateAnalysis(),
      invalidateTestPlayerHistory(
        client,
        {
          uid: context.userId,
          roleId: context.activeRoleId,
          teamId: context.teamId,
          seasonId: context.seasonId,
        },
        { benchmarks: true },
      ),
    ])
      .then(() => {
        if (import.meta.env.DEV)
          console.debug('[TestBenchmarkMutation DEV]', {
            operation,
            benchmarkId,
            step: 'invalidation end',
          })
      })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) {
          const failure = error as Error & { code?: string }
          console.error('[TestBenchmarkMutation DEV]', {
            operation,
            benchmarkId,
            step: 'invalidation error',
            code: failure.code ?? 'UNKNOWN',
            message: failure.message,
          })
        }
      })
  }
  const logBenchmarkMutationStep = (
    operation: 'create' | 'update' | 'archive' | 'delete',
    benchmarkId: string,
    step: 'cache update' | 'mutation settled',
  ) => {
    if (import.meta.env.DEV)
      console.debug('[TestBenchmarkMutation DEV]', {
        operation,
        benchmarkId,
        step,
      })
  }
  const invalidateAnalysis = () =>
    client.invalidateQueries({
      queryKey: queryKeys.tests.analysisRoot(
        context.userId,
        context.activeRoleId,
        context.teamId,
        context.seasonId,
      ),
    })
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
      onSuccess: async (definition) => {
        setDefinitionCache(definition)
        await invalidate(definition.testDefinitionId)
      },
    }),
    update: useMutation({
      mutationFn: async (input: DefinitionDraftInput) => {
        if (import.meta.env.DEV)
          console.debug('[TestCatalogueAdmin DEV] Draft save start', {
            testDefinitionId: id,
            status: 'DRAFT',
            payload: input,
            canManageTests: canManageTests(context.accesses, context),
            securityContextReady: context.securityContextReady,
          })
        try {
          return await testsCatalogueService.updateDraft(context, id!, input)
        } catch (error) {
          if (import.meta.env.DEV) {
            const failure = error as Error & { code?: string }
            console.error('[TestCatalogueAdmin DEV] Draft save error', {
              testDefinitionId: id,
              status: 'DRAFT',
              payload: input,
              code: failure.code ?? 'UNKNOWN',
              message: failure.message,
              canManageTests: canManageTests(context.accesses, context),
              securityContextReady: context.securityContextReady,
            })
          }
          throw error
        }
      },
      onSuccess: async (definition) => {
        setDefinitionCache(definition)
        await invalidate(id)
      },
    }),
    activate: useMutation({
      mutationFn: () => testsCatalogueService.activate(context, id!),
      onSuccess: async (definition) => {
        setDefinitionCache(definition)
        await invalidate(id)
      },
    }),
    nextVersion: useMutation({
      mutationFn: () => testsCatalogueService.createNextVersion(context, id!),
      onSuccess: async (definition) => {
        setDefinitionCache(definition)
        await invalidate(definition.testDefinitionId)
      },
    }),
    archive: useMutation({
      mutationFn: () => testsCatalogueService.archive(context, id!),
      onSuccess: async (definition) => {
        setDefinitionCache(definition)
        await invalidate(id)
      },
    }),
    remove: useMutation({
      mutationFn: () => testsCatalogueService.deleteUnusedDraft(context, id!),
      onSuccess: async () => {
        client.removeQueries({
          queryKey: queryKeys.tests.definitionAdmin(
            context.userId,
            context.activeRoleId,
            context.teamId,
            context.seasonId,
            id!,
          ),
        })
        await invalidate()
      },
    }),
    createBenchmark: useMutation({
      mutationFn: async (
        input: Omit<
          TestBenchmark,
          'testBenchmarkId' | 'status' | 'createdAt' | 'updatedAt' | 'createdBy'
        >,
      ) => {
        const effectivePermissions =
          context.accesses.find(
            ({ userId, teamId }) =>
              userId === context.userId && teamId === context.teamId,
          )?.rolePermissions[context.activeRoleId]?.permissions ?? []
        if (import.meta.env.DEV)
          console.debug('[TestBenchmarkAdmin DEV] Création demandée', {
            uid: context.userId,
            activeRoleId: context.activeRoleId,
            teamId: context.teamId,
            seasonId: input.seasonId,
            subCategoryId: input.subCategoryId,
            testDefinitionId: input.testDefinitionId,
            version: input.testDefinitionVersion,
            metricKey: input.metricKey,
            benchmarkLevel: input.benchmarkLevel,
            targetValue: input.targetValue,
            securityContextReady: context.securityContextReady,
            effectivePermissions,
            canManageTests: canManageTests(context.accesses, context),
          })
        const benchmarkId = benchmarkDocumentId(input)
        return runBenchmarkMutation('create', benchmarkId, () =>
          testsCatalogueService.createBenchmark(context, input),
        )
      },
      onSuccess: (created) => {
        updateBenchmarkCache((items) => [
          ...items.filter(
            ({ testBenchmarkId }) =>
              testBenchmarkId !== created.testBenchmarkId,
          ),
          created,
        ])
        logBenchmarkMutationStep(
          'create',
          created.testBenchmarkId,
          'cache update',
        )
        updateTestPlayerHistoryBenchmark(
          client,
          {
            uid: context.userId,
            roleId: context.activeRoleId,
            teamId: context.teamId,
            seasonId: context.seasonId,
          },
          'create',
          created.testBenchmarkId,
          created,
        )
        reconcileBenchmarkQueries('create', created.testBenchmarkId)
      },
      onSettled: (created, _error, input) =>
        logBenchmarkMutationStep(
          'create',
          created?.testBenchmarkId ?? benchmarkDocumentId(input),
          'mutation settled',
        ),
    }),
    archiveBenchmark: useMutation({
      mutationFn: (benchmarkId: string) =>
        runBenchmarkMutation('archive', benchmarkId, () =>
          testsCatalogueService.archiveBenchmark(context, benchmarkId),
        ),
      onSuccess: (archived) => {
        updateBenchmarkCache((items) =>
          items.map((item) =>
            item.testBenchmarkId === archived.testBenchmarkId ? archived : item,
          ),
        )
        logBenchmarkMutationStep(
          'archive',
          archived.testBenchmarkId,
          'cache update',
        )
        updateTestPlayerHistoryBenchmark(
          client,
          {
            uid: context.userId,
            roleId: context.activeRoleId,
            teamId: context.teamId,
            seasonId: context.seasonId,
          },
          'archive',
          archived.testBenchmarkId,
          archived,
        )
        reconcileBenchmarkQueries('archive', archived.testBenchmarkId)
      },
      onSettled: (_archived, _error, benchmarkId) =>
        logBenchmarkMutationStep('archive', benchmarkId, 'mutation settled'),
    }),
    updateBenchmark: useMutation({
      mutationFn: (input: {
        benchmarkId: string
        targetValue: number
        label?: string
      }) =>
        runBenchmarkMutation('update', input.benchmarkId, () =>
          testsCatalogueService.updateBenchmark(context, input.benchmarkId, {
            targetValue: input.targetValue,
            label: input.label,
          }),
        ),
      onSuccess: (updated) => {
        updateBenchmarkCache((items) =>
          items.map((item) =>
            item.testBenchmarkId === updated.testBenchmarkId ? updated : item,
          ),
        )
        logBenchmarkMutationStep(
          'update',
          updated.testBenchmarkId,
          'cache update',
        )
        updateTestPlayerHistoryBenchmark(
          client,
          {
            uid: context.userId,
            roleId: context.activeRoleId,
            teamId: context.teamId,
            seasonId: context.seasonId,
          },
          'update',
          updated.testBenchmarkId,
          updated,
        )
        reconcileBenchmarkQueries('update', updated.testBenchmarkId)
      },
      onSettled: (_updated, _error, input) =>
        logBenchmarkMutationStep(
          'update',
          input.benchmarkId,
          'mutation settled',
        ),
    }),
    deleteBenchmark: useMutation({
      mutationFn: (benchmarkId: string) =>
        runBenchmarkMutation('delete', benchmarkId, () =>
          testsCatalogueService.deleteBenchmark(context, benchmarkId),
        ),
      onSuccess: (_, benchmarkId) => {
        updateBenchmarkCache((items) =>
          items.filter(
            ({ testBenchmarkId }) => testBenchmarkId !== benchmarkId,
          ),
        )
        logBenchmarkMutationStep('delete', benchmarkId, 'cache update')
        updateTestPlayerHistoryBenchmark(
          client,
          {
            uid: context.userId,
            roleId: context.activeRoleId,
            teamId: context.teamId,
            seasonId: context.seasonId,
          },
          'delete',
          benchmarkId,
        )
        reconcileBenchmarkQueries('delete', benchmarkId)
      },
      onSettled: (_deleted, _error, benchmarkId) =>
        logBenchmarkMutationStep('delete', benchmarkId, 'mutation settled'),
    }),
  }
}

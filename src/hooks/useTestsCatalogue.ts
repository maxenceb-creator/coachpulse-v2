import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../query/queryKeys'
import { testsCatalogueService } from '../services/appTestsService'
import type {
  CatalogueSecurityContext,
  DefinitionDraftInput,
} from '../services/testsCatalogueService'
import type { TestBenchmark } from '../types/domain'

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
  const detail = useQuery({
    queryKey: queryKeys.tests.definitionAdmin(
      context.userId,
      context.activeRoleId,
      context.teamId,
      context.seasonId,
      id,
    ),
    queryFn: () => testsCatalogueService.get(context, id),
    enabled: context.securityContextReady && !!id,
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
    enabled: context.securityContextReady,
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
      mutationFn: (
        input: Omit<
          TestBenchmark,
          'testBenchmarkId' | 'status' | 'createdAt' | 'updatedAt' | 'createdBy'
        >,
      ) => testsCatalogueService.createBenchmark(context, input),
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

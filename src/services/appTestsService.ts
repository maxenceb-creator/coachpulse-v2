import { testsRepository } from '../repositories/testsRepository'
import { repositories } from '../repositories/appRepositories'
import { createTestsService } from './testsService'
import { createTestsAnalysisService } from './testsAnalysisService'
import { testsCatalogueRepository } from '../repositories/testsCatalogueRepository'
import { createTestsCatalogueService } from './testsCatalogueService'

export const testsService = createTestsService({
  ...testsRepository,
  assignmentsForTeam: repositories.assignmentsForTeam,
  activePlayers: repositories.activePlayers,
})

export const testsAnalysisService = createTestsAnalysisService({
  ...testsRepository,
  activePlayers: repositories.activePlayers,
  assignmentsForTeam: repositories.assignmentsForTeam,
})

export const testsCatalogueService = createTestsCatalogueService(
  testsCatalogueRepository,
)

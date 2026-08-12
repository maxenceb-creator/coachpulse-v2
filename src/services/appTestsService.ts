import { testsRepository } from '../repositories/testsRepository'
import { repositories } from '../repositories/appRepositories'
import { createTestsService } from './testsService'

export const testsService = createTestsService({
  ...testsRepository,
  assignmentsForTeam: repositories.assignmentsForTeam,
  activePlayers: repositories.activePlayers,
})

import { testsRepository } from '../repositories/testsRepository'
import { createTestsService } from './testsService'

export const testsService = createTestsService(testsRepository)

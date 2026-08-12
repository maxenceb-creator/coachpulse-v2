import { describe, expect, it } from 'vitest'
import { withFirestoreDocumentId } from './firestoreRepository'
import { categorySchema, subCategorySchema } from '../validation/schemas'

describe('withFirestoreDocumentId', () => {
  it('injecte les identifiants Category et SubCategory attendus par Zod', () => {
    expect(withFirestoreDocumentId('categories', 'category-u13', {})).toEqual({
      categoryId: 'category-u13',
    })
    expect(withFirestoreDocumentId('subCategories', 'subcat-u13', {})).toEqual({
      subCategoryId: 'subcat-u13',
    })
  })

  it('parse les documents référentiels DEV après injection de leur ID de chemin', () => {
    const metadata = { createdAt: new Date(), updatedAt: new Date() }
    expect(
      categorySchema.parse(
        withFirestoreDocumentId('categories', 'category-u13', {
          seasonId: 'season-2026-2027',
          name: 'U13F DEV',
          subCategoryIds: ['subcat-u13'],
          status: 'ACTIVE',
          ...metadata,
        }),
      ).categoryId,
    ).toBe('category-u13')
    expect(
      subCategorySchema.parse(
        withFirestoreDocumentId('subCategories', 'subcat-u13', {
          seasonId: 'season-2026-2027',
          name: 'U13F',
          birthYearRule: 2014,
          ...metadata,
        }),
      ).subCategoryId,
    ).toBe('subcat-u13')
  })

  it('conserve le mapping PR07 des IDs TestSession et TestResult', () => {
    expect(withFirestoreDocumentId('testSessions', 'session-1', {})).toEqual({
      testSessionId: 'session-1',
    })
    expect(
      withFirestoreDocumentId('testResults', 'session-1_player-1', {}),
    ).toEqual({ testResultId: 'session-1_player-1' })
  })
})

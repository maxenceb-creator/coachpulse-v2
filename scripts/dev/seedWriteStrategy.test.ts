import { describe, expect, it, vi } from 'vitest'
import { queueDocumentReplacement } from './seedWriteStrategy.js'

describe('stratégie d’écriture du seed DEV', () => {
  it('remplace intégralement un document géré sans option merge', () => {
    let stored: Record<string, unknown> = {
      teamId: 'team-first-demo',
      teamType: 'FIRST_TEAM',
      seasonId: 'ancienne-saison',
      categoryId: 'ancienne-categorie',
    }
    const set = vi.fn(
      (_reference: string, replacement: Record<string, unknown>) => {
        stored = replacement
      },
    )

    queueDocumentReplacement(set, 'teams/team-first-demo', {
      teamId: 'team-first-demo',
      teamType: 'FIRST_TEAM',
    })

    expect(set).toHaveBeenCalledWith('teams/team-first-demo', {
      teamId: 'team-first-demo',
      teamType: 'FIRST_TEAM',
    })
    expect(stored).not.toHaveProperty('seasonId')
    expect(stored).not.toHaveProperty('categoryId')
  })
})

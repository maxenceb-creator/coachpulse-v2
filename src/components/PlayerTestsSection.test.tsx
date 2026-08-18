import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTestPlayerHistory } from '../hooks/useTestPlayerHistory'
import type { TestHookContext } from '../hooks/useTestSession'
import { PlayerTestsSection } from './PlayerTestsSection'

vi.mock('../hooks/useTestPlayerHistory', () => ({
  useTestPlayerHistory: vi.fn(),
}))

const context: TestHookContext = {
  uid: 'user-a',
  roleId: 'coach',
  teamId: 'team-a',
  seasonId: 'season-a',
  accesses: [],
  securityContextReady: true,
}
const player = {
  playerId: 'player-a',
  firstName: 'Alice',
  lastName: 'Martin',
  birthDate: new Date('2014-01-01T00:00:00.000Z'),
  playerProfile: 'MIDFIELDER' as const,
  preferredFoot: 'RIGHT' as const,
  status: 'ACTIVE' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
}
const metric = (direction: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER') => ({
  metricKey: direction === 'HIGHER_IS_BETTER' ? 'HEIGHT' : 'TIME',
  label: direction === 'HIGHER_IS_BETTER' ? 'Hauteur' : 'Temps',
  valueType: 'NUMBER' as const,
  unit:
    direction === 'HIGHER_IS_BETTER'
      ? ('CENTIMETER' as const)
      : ('SECOND' as const),
  direction,
  required: true,
})
const summary = (
  direction: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER',
  progression: number,
) => {
  const definitionId = direction === 'HIGHER_IS_BETTER' ? 'jump' : 'sprint'
  const testMetric = metric(direction)
  const session = {
    testSessionId: `${definitionId}-session`,
    testDefinitionId: definitionId,
    testDefinitionVersion: 1,
    teamId: 'team-a',
    seasonId: 'season-a',
    categoryId: 'category-a',
    date: new Date('2026-08-12T00:00:00.000Z'),
    status: 'COMPLETED' as const,
    createdBy: 'user-a',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  const point = { session, value: direction === 'HIGHER_IS_BETTER' ? 38 : 3.5 }
  return {
    metric: testMetric,
    points: [point],
    latest: point,
    best: point,
    count: 2,
    evolution: { performanceRelativeChange: progression },
    benchmarks: [
      {
        benchmark: {
          testBenchmarkId: `${definitionId}-target`,
          testDefinitionId: definitionId,
          testDefinitionVersion: 1,
          metricKey: testMetric.metricKey,
          subCategoryId: 'u13',
          benchmarkLevel: 'TARGET' as const,
          targetValue: direction === 'HIGHER_IS_BETTER' ? 35 : 3.8,
          status: 'ACTIVE' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        comparison: { reached: true },
      },
    ],
  }
}

const renderSection = (authorized = true) =>
  render(
    <MemoryRouter>
      <PlayerTestsSection
        context={context}
        playerId="player-a"
        authorized={authorized}
        player={player}
      />
    </MemoryRouter>,
  )

describe('PlayerTestsSection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche l’état vide et le lien vers l’historique complet', () => {
    vi.mocked(useTestPlayerHistory).mockReturnValue({
      isPending: false,
      isError: false,
      data: { histories: [] },
    } as unknown as ReturnType<typeof useTestPlayerHistory>)
    renderSection()
    expect(
      screen.getByText('Aucun test enregistré sur cette saison.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/tests/players/player-a',
    )
  })

  it('rend les progressions HIGHER/LOWER déjà directionnalisées et le benchmark', () => {
    vi.mocked(useTestPlayerHistory).mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        histories: [
          {
            definition: {
              testDefinitionId: 'jump',
              name: 'Détente',
              domain: 'PHYSICAL',
              version: 1,
            },
            metrics: [summary('HIGHER_IS_BETTER', 8.5)],
          },
          {
            definition: {
              testDefinitionId: 'sprint',
              name: 'Sprint',
              domain: 'PHYSICAL',
              version: 1,
            },
            metrics: [summary('LOWER_IS_BETTER', 5.4)],
          },
        ],
      },
    } as unknown as ReturnType<typeof useTestPlayerHistory>)
    renderSection()
    expect(screen.getByText('+8,5 %')).toBeInTheDocument()
    expect(screen.getByText('+5,4 %')).toBeInTheDocument()
    expect(screen.getAllByText(/TARGET : atteint/)).toHaveLength(2)
  })

  it('isole une erreur Tests et masque le bloc sans tests.read', () => {
    vi.mocked(useTestPlayerHistory).mockReturnValue({
      isPending: false,
      isError: true,
    } as unknown as ReturnType<typeof useTestPlayerHistory>)
    const { container, rerender } = renderSection()
    expect(
      screen.getByText('Impossible de charger les tests.'),
    ).toBeInTheDocument()
    rerender(
      <MemoryRouter>
        <PlayerTestsSection
          context={context}
          playerId="player-a"
          authorized={false}
          player={player}
        />
      </MemoryRouter>,
    )
    expect(within(container).queryByText('Tests')).not.toBeInTheDocument()
  })
})

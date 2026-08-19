import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePlayerAttendance } from '../hooks/usePlayerAttendance'
import { PlayerAttendanceSection } from './PlayerAttendanceSection'

vi.mock('../hooks/usePlayerAttendance', () => ({
  usePlayerAttendance: vi.fn(),
}))
vi.mock('../services/playerAttendanceService', () => ({
  attendanceStatusLabels: {
    PRESENT: 'Présente',
    LATE: 'Retard',
    ABSENT_JUSTIFIED: 'Absence justifiée',
    ABSENT_UNJUSTIFIED: 'Absence non justifiée',
    INJURED: 'Blessée',
    SICK: 'Malade',
    EXTERNAL_PROGRAM: 'Programme extérieur',
    EXCUSED: 'Dispensée',
  },
}))

const context = {
  userId: 'user-a',
  activeRoleId: 'coach',
  teamId: 'team-a',
  seasonId: 'season-a',
  categoryId: 'category-a',
  accesses: [],
  securityContextReady: true,
}

const renderSection = (authorized = true) =>
  render(
    <PlayerAttendanceSection
      context={context}
      playerId="player-a"
      authorized={authorized}
    />,
  )

describe('PlayerAttendanceSection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gère localement loading, erreur et absence de permission', () => {
    vi.mocked(usePlayerAttendance).mockReturnValue({
      isPending: true,
    } as ReturnType<typeof usePlayerAttendance>)
    const view = renderSection()
    expect(screen.getByText('Chargement des présences…')).toBeInTheDocument()
    vi.mocked(usePlayerAttendance).mockReturnValue({
      isPending: false,
      isError: true,
    } as ReturnType<typeof usePlayerAttendance>)
    view.rerender(
      <PlayerAttendanceSection
        context={context}
        playerId="player-a"
        authorized
      />,
    )
    expect(
      screen.getByText('Impossible de charger les présences.'),
    ).toBeInTheDocument()
    view.rerender(
      <PlayerAttendanceSection
        context={context}
        playerId="player-a"
        authorized={false}
      />,
    )
    expect(screen.queryByText('Présences')).not.toBeInTheDocument()
  })

  it('affiche l’état vide canonique', () => {
    vi.mocked(usePlayerAttendance).mockReturnValue({
      isPending: false,
      isError: false,
      data: { sessionsConcerned: 0 },
    } as ReturnType<typeof usePlayerAttendance>)
    renderSection()
    expect(
      screen.getByText('Aucune donnée de présence sur cette saison.'),
    ).toBeInTheDocument()
  })

  it('affiche synthèse et derniers statuts', () => {
    vi.mocked(usePlayerAttendance).mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        sessionsConcerned: 4,
        present: 2,
        absent: 2,
        late: 1,
        justifiedAbsences: 1,
        unjustifiedAbsences: 1,
        missing: 0,
        attendanceRate: 50,
        recentEvents: [
          {
            session: {
              startDateTime: new Date('2026-08-18T18:00:00.000Z'),
            },
            attendance: {
              attendanceId: 's1_player-a',
              status: 'ABSENT_JUSTIFIED',
            },
          },
        ],
      },
    } as ReturnType<typeof usePlayerAttendance>)
    renderSection()
    expect(screen.getByText('50 %')).toBeInTheDocument()
    expect(screen.getByText('Absence justifiée')).toBeInTheDocument()
    expect(screen.getByText('18/08/2026')).toBeInTheDocument()
  })
})

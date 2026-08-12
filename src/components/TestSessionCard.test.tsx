import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TestSession } from '../types/domain'
import { deleteConfirmation, TestSessionCard } from './TestSessionCard'

const session = (status: TestSession['status']): TestSession => ({
  testSessionId: 'session-juggling',
  testDefinitionId: 'juggling-v1',
  testDefinitionVersion: 1,
  teamId: 'team-u13',
  seasonId: 'season-2026',
  categoryId: 'category-u13',
  date: new Date('2026-08-12T12:00:00.000Z'),
  status,
  createdBy: 'coach',
  createdAt: new Date('2026-08-12T12:00:00.000Z'),
  updatedAt: new Date('2026-08-12T12:00:00.000Z'),
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('TestSessionCard', () => {
  it('confirme simplement puis supprime une session DRAFT', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onDelete = vi.fn()
    render(
      <MemoryRouter>
        <TestSessionCard
          canDelete
          definitionName="Jongles"
          deleting={false}
          session={session('DRAFT')}
          onDelete={onDelete}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
    expect(confirm).toHaveBeenCalledWith(deleteConfirmation('DRAFT'))
    expect(onDelete).toHaveBeenCalledWith('session-juggling')
    expect(screen.getByText('Jongles')).toBeTruthy()
    expect(screen.getByText('12/08/2026')).toBeTruthy()
    expect(screen.getByText('DRAFT')).toBeTruthy()
  })

  it('demande une confirmation renforcée pour COMPLETED', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const onDelete = vi.fn()
    render(
      <MemoryRouter>
        <TestSessionCard
          canDelete
          definitionName="Jongles"
          deleting={false}
          session={session('COMPLETED')}
          onDelete={onDelete}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
    expect(confirm).toHaveBeenCalledWith(deleteConfirmation('COMPLETED'))
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('désactive le bouton pendant la suppression', () => {
    render(
      <MemoryRouter>
        <TestSessionCard
          canDelete
          definitionName="Jongles"
          deleting
          session={session('DRAFT')}
          onDelete={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(
      screen
        .getByRole('button', { name: 'Suppression…' })
        .hasAttribute('disabled'),
    ).toBe(true)
  })
})

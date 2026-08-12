import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TestDefinition } from '../types/domain'
import { TestDefinitionCard } from './TestDefinitionCard'

const definition = {
  testDefinitionId: 'test-juggling-v1',
  name: 'Jongles',
  code: 'JUGGLING',
  version: 1,
  status: 'ACTIVE',
  domain: 'TECHNICAL',
  metrics: [],
  createdAt: new Date('2026-08-12'),
  updatedAt: new Date('2026-08-12'),
} satisfies TestDefinition

afterEach(cleanup)

describe('TestDefinitionCard', () => {
  it('active Nouvelle session et déclenche l’action avec tests.write et un contexte prêt', () => {
    const onCreate = vi.fn()
    render(
      <TestDefinitionCard
        canWriteTests
        definition={definition}
        isPending={false}
        onCreate={onCreate}
        securityContextReady
      />,
    )

    const button = screen.getByRole('button', { name: 'Nouvelle session' })
    expect((button as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(button)
    expect(onCreate).toHaveBeenCalledTimes(1)
  })

  it('désactive le bouton avec une raison explicite sans tests.write', () => {
    render(
      <TestDefinitionCard
        canWriteTests={false}
        definition={definition}
        disabledReason="Permission tests.write absente"
        isPending={false}
        onCreate={vi.fn()}
        securityContextReady
      />,
    )
    expect(
      (
        screen.getByRole('button', {
          name: 'Nouvelle session',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
  })
})

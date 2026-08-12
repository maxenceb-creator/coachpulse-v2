import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TestEvolutionChart } from './TestEvolutionChart'

describe('TestEvolutionChart', () => {
  it('trace uniquement les points présents et affiche le benchmark', () => {
    const { container } = render(
      <TestEvolutionChart
        benchmark={50}
        points={[
          { label: '12/08/2026', value: 0 },
          { label: '01/10/2026', value: 52 },
        ]}
        unit="COUNT"
      />,
    )
    expect(container.querySelectorAll('circle')).toHaveLength(2)
    expect(container.querySelector('.benchmark-line')).not.toBeNull()
    expect(screen.getByText(/objectif 50 COUNT/)).toBeTruthy()
  })

  it('distingue un historique vide de la valeur zéro', () => {
    render(<TestEvolutionChart points={[]} unit="COUNT" />)
    expect(screen.getByText('Aucun historique à tracer.')).toBeTruthy()
  })
})

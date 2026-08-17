import { useEffect, useState } from 'react'
import type { TestBenchmark } from '../types/domain'

export function BenchmarkRow({
  item,
  subCategoryName,
  onUpdate,
  onArchive,
  onDelete,
  isMutating,
}: {
  item: TestBenchmark
  subCategoryName?: string
  onUpdate: (targetValue: number) => void
  onArchive: () => void
  onDelete: () => void
  isMutating: boolean
}) {
  const [targetValue, setTargetValue] = useState(String(item.targetValue))
  useEffect(() => setTargetValue(String(item.targetValue)), [item.targetValue])

  return (
    <tr>
      <td>{subCategoryName}</td>
      <td>{item.metricKey}</td>
      <td>{item.benchmarkLevel}</td>
      <td>
        <input
          disabled={item.status !== 'ACTIVE'}
          type="number"
          step="any"
          value={targetValue}
          onChange={(event) => setTargetValue(event.target.value)}
        />
      </td>
      <td>{item.status}</td>
      <td className="entry-actions">
        {item.status === 'ACTIVE' ? (
          <>
            <button
              disabled={isMutating}
              onClick={() => onUpdate(Number(targetValue))}
            >
              {isMutating ? 'Traitement…' : 'Mettre à jour'}
            </button>
            <button
              className="secondary"
              disabled={isMutating}
              onClick={onArchive}
            >
              Archiver
            </button>
          </>
        ) : null}
        <button className="danger" disabled={isMutating} onClick={onDelete}>
          Supprimer
        </button>
      </td>
    </tr>
  )
}

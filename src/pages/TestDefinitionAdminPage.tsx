import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { useAuth } from '../auth/AuthProvider'
import {
  useTestDefinitionAdmin,
  useTestsCatalogueMutations,
} from '../hooks/useTestsCatalogue'
import {
  canManageTests,
  sortTestMetrics,
} from '../services/testsCatalogueService'
import type {
  TestBenchmark,
  TestDefinition,
  TestMetricDefinition,
} from '../types/domain'

function BenchmarkRow({
  item,
  subCategoryName,
  onUpdate,
  onArchive,
}: {
  item: TestBenchmark
  subCategoryName?: string
  onUpdate: (targetValue: number) => void
  onArchive: () => void
}) {
  const [targetValue, setTargetValue] = useState(String(item.targetValue))
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
            <button onClick={() => onUpdate(Number(targetValue))}>
              Mettre à jour
            </button>
            <button className="secondary" onClick={onArchive}>
              Archiver
            </button>
          </>
        ) : null}
      </td>
    </tr>
  )
}

const emptyMetric = (order: number): TestMetricDefinition => ({
  metricKey: '',
  label: '',
  valueType: 'NUMBER',
  unit: 'COUNT',
  direction: 'HIGHER_IS_BETTER',
  required: true,
  precision: 0,
  minValue: 0,
  order,
})

export function TestDefinitionAdminPage() {
  const { testDefinitionId = '' } = useParams()
  const { user } = useAuth()
  const app = useApp()
  const navigate = useNavigate()
  const team = app.teams.find(({ teamId }) => teamId === app.activeTeamId)
  const context = {
    userId: user?.uid ?? '',
    activeRoleId: app.activeRoleId ?? '',
    teamId: app.activeTeamId ?? '',
    seasonId: app.season?.seasonId ?? '',
    categoryId: team?.categoryId ?? '',
    accesses: app.accesses,
    securityContextReady: app.securityContextReady && !!team?.categoryId,
  }
  const allowed = canManageTests(app.accesses, context)
  const { detail, benchmarks, subCategories } = useTestDefinitionAdmin(
    context,
    testDefinitionId,
  )
  const mutations = useTestsCatalogueMutations(context, testDefinitionId)
  const [draft, setDraft] = useState<TestDefinition>()
  const [benchmark, setBenchmark] = useState({
    subCategoryId: '',
    metricKey: '',
    benchmarkLevel: 'TARGET' as const,
    targetValue: '',
  })
  useEffect(() => {
    if (detail.data)
      setDraft({
        ...detail.data.definition,
        metrics: sortTestMetrics(detail.data.definition.metrics),
      })
  }, [detail.data])

  if (!allowed)
    return (
      <main className="center error">Permission tests.manage requise.</main>
    )
  if (detail.isLoading || !draft)
    return <main className="center">Chargement du protocole…</main>
  if (detail.isError)
    return <main className="center error">Protocole introuvable.</main>
  const editable = draft.status === 'DRAFT' && !detail.data?.used
  const changeMetric = (index: number, patch: Partial<TestMetricDefinition>) =>
    setDraft({
      ...draft,
      metrics: draft.metrics.map((metric, i) =>
        i === index ? { ...metric, ...patch } : metric,
      ),
    })

  return (
    <>
      <header>
        <div>
          <p className="eyebrow">TESTS · ADMINISTRATION</p>
          <strong>
            {draft.name} v{draft.version}
          </strong>
        </div>
        <Link className="button-link secondary" to="/tests/admin">
          Catalogue
        </Link>
      </header>
      <main className="dashboard">
        <h1>
          {draft.name} <small>v{draft.version}</small>
        </h1>
        <p>
          Statut : <strong>{draft.status}</strong>
          {detail.data?.used ? ' · utilisée dans une session' : ''}
        </p>
        <form
          className="card admin-form"
          onSubmit={(event) => {
            event.preventDefault()
            mutations.update.mutate({
              name: draft.name,
              code: draft.code,
              description: draft.description,
              domain: draft.domain,
              metrics: draft.metrics,
            })
          }}
        >
          <h2>Identité et métriques</h2>
          <label>
            Nom
            <input
              disabled={!editable}
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
          </label>
          <label>
            Code
            <input disabled value={draft.code} />
          </label>
          <label>
            Description
            <textarea
              disabled={!editable}
              value={draft.description ?? ''}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
            />
          </label>
          <label>
            Type
            <select
              disabled={!editable}
              value={draft.domain}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  domain: event.target.value as TestDefinition['domain'],
                })
              }
            >
              <option value="TECHNICAL">Technique</option>
              <option value="PHYSICAL">Physique</option>
            </select>
          </label>
          <div className="metric-editor">
            {draft.metrics.map((metric, index) => (
              <fieldset key={`${index}-${metric.metricKey}`}>
                <legend>Métrique {index + 1}</legend>
                <label>
                  Clé
                  <input
                    disabled={!editable}
                    value={metric.metricKey}
                    onChange={(event) =>
                      changeMetric(index, {
                        metricKey: event.target.value.toUpperCase(),
                      })
                    }
                  />
                </label>
                <label>
                  Label
                  <input
                    disabled={!editable}
                    value={metric.label}
                    onChange={(event) =>
                      changeMetric(index, { label: event.target.value })
                    }
                  />
                </label>
                <label>
                  Unité
                  <select
                    disabled={!editable}
                    value={metric.unit}
                    onChange={(event) =>
                      changeMetric(index, {
                        unit: event.target
                          .value as TestMetricDefinition['unit'],
                      })
                    }
                  >
                    {['COUNT', 'SECOND', 'METER', 'CENTIMETER', 'KM_H'].map(
                      (unit) => (
                        <option key={unit}>{unit}</option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  Direction
                  <select
                    disabled={!editable}
                    value={metric.direction}
                    onChange={(event) =>
                      changeMetric(index, {
                        direction: event.target
                          .value as TestMetricDefinition['direction'],
                      })
                    }
                  >
                    {[
                      'HIGHER_IS_BETTER',
                      'LOWER_IS_BETTER',
                      'TARGET_IS_BETTER',
                      'NEUTRAL',
                    ].map((direction) => (
                      <option key={direction}>{direction}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Précision
                  <input
                    disabled={!editable}
                    type="number"
                    min="0"
                    max="6"
                    value={metric.precision ?? ''}
                    onChange={(event) =>
                      changeMetric(index, {
                        precision:
                          event.target.value === ''
                            ? undefined
                            : Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Minimum
                  <input
                    disabled={!editable}
                    type="number"
                    value={metric.minValue ?? ''}
                    onChange={(event) =>
                      changeMetric(index, {
                        minValue:
                          event.target.value === ''
                            ? undefined
                            : Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Maximum
                  <input
                    disabled={!editable}
                    type="number"
                    value={metric.maxValue ?? ''}
                    onChange={(event) =>
                      changeMetric(index, {
                        maxValue:
                          event.target.value === ''
                            ? undefined
                            : Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  <input
                    disabled={!editable}
                    type="checkbox"
                    checked={metric.required}
                    onChange={(event) =>
                      changeMetric(index, { required: event.target.checked })
                    }
                  />{' '}
                  Obligatoire
                </label>
                {editable ? (
                  <div className="entry-actions">
                    <button
                      type="button"
                      className="secondary"
                      disabled={index === 0}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          metrics: draft.metrics
                            .map((item, i) => ({
                              ...item,
                              order:
                                i === index
                                  ? index - 1
                                  : i === index - 1
                                    ? index
                                    : item.order,
                            }))
                            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
                        })
                      }
                    >
                      Monter
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          metrics: draft.metrics
                            .filter((_, i) => i !== index)
                            .map((item, i) => ({ ...item, order: i })),
                        })
                      }
                    >
                      Supprimer
                    </button>
                  </div>
                ) : null}
              </fieldset>
            ))}
          </div>
          {editable ? (
            <>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setDraft({
                    ...draft,
                    metrics: [
                      ...draft.metrics,
                      emptyMetric(draft.metrics.length),
                    ],
                  })
                }
              >
                Ajouter une métrique
              </button>
              <button disabled={mutations.update.isPending}>
                Sauvegarder le brouillon
              </button>
            </>
          ) : null}
          {mutations.update.isError ? (
            <p className="error">Brouillon invalide ou immuable.</p>
          ) : null}
        </form>
        <section className="card admin-form">
          <h2>Prévisualisation</h2>
          <h3>
            {draft.name} v{draft.version}
          </h3>
          {sortTestMetrics(draft.metrics).map((metric) => (
            <p key={metric.metricKey}>
              {metric.label || metric.metricKey} | {metric.unit}
            </p>
          ))}
        </section>
        <section className="entry-actions admin-actions">
          {editable ? (
            <button onClick={() => mutations.activate.mutate()}>Activer</button>
          ) : null}
          <button
            className="secondary"
            onClick={() =>
              mutations.nextVersion.mutate(undefined, {
                onSuccess: (next) =>
                  navigate(`/tests/admin/${next.testDefinitionId}`),
              })
            }
          >
            Créer une nouvelle version
          </button>
          {draft.status !== 'ARCHIVED' ? (
            <button
              className="secondary"
              onClick={() => mutations.archive.mutate()}
            >
              Archiver
            </button>
          ) : null}
          {editable ? (
            <button
              className="danger"
              onClick={() =>
                mutations.remove.mutate(undefined, {
                  onSuccess: () => navigate('/tests/admin'),
                })
              }
            >
              Supprimer le brouillon
            </button>
          ) : null}
        </section>
        <section className="tests-domain">
          <h2>Benchmarks de la saison</h2>
          <form
            className="card admin-form"
            onSubmit={(event) => {
              event.preventDefault()
              mutations.createBenchmark.mutate({
                testDefinitionId: draft.testDefinitionId,
                testDefinitionVersion: draft.version,
                seasonId: context.seasonId,
                subCategoryId: benchmark.subCategoryId,
                metricKey: benchmark.metricKey,
                benchmarkLevel: benchmark.benchmarkLevel,
                targetValue: Number(benchmark.targetValue),
              })
            }}
          >
            <label>
              Sous-catégorie
              <select
                required
                value={benchmark.subCategoryId}
                onChange={(event) =>
                  setBenchmark({
                    ...benchmark,
                    subCategoryId: event.target.value,
                  })
                }
              >
                <option value="">Choisir</option>
                {subCategories.data?.map((item) => (
                  <option key={item.subCategoryId} value={item.subCategoryId}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Métrique
              <select
                required
                value={benchmark.metricKey}
                onChange={(event) =>
                  setBenchmark({ ...benchmark, metricKey: event.target.value })
                }
              >
                <option value="">Choisir</option>
                {draft.metrics.map((metric) => (
                  <option key={metric.metricKey}>{metric.metricKey}</option>
                ))}
              </select>
            </label>
            <label>
              Niveau
              <select
                value={benchmark.benchmarkLevel}
                onChange={(event) =>
                  setBenchmark({
                    ...benchmark,
                    benchmarkLevel: event.target
                      .value as typeof benchmark.benchmarkLevel,
                  })
                }
              >
                <option>TARGET</option>
                <option>GOOD</option>
                <option>VERY_GOOD</option>
                <option>REFERENCE</option>
              </select>
            </label>
            <label>
              Objectif
              <input
                required
                type="number"
                step="any"
                value={benchmark.targetValue}
                onChange={(event) =>
                  setBenchmark({
                    ...benchmark,
                    targetValue: event.target.value,
                  })
                }
              />
            </label>
            <button>Ajouter</button>
            {mutations.createBenchmark.isError ? (
              <p className="error">Benchmark invalide ou déjà actif.</p>
            ) : null}
          </form>
          {benchmarks.data?.length ? (
            <div className="admin-table-wrap card">
              <table className="entry-table">
                <tbody>
                  {benchmarks.data.map((item) => (
                    <BenchmarkRow
                      item={item}
                      key={item.testBenchmarkId}
                      subCategoryName={
                        subCategories.data?.find(
                          (subcategory) =>
                            subcategory.subCategoryId === item.subCategoryId,
                        )?.name
                      }
                      onUpdate={(targetValue) =>
                        mutations.updateBenchmark.mutate({
                          benchmarkId: item.testBenchmarkId,
                          targetValue,
                        })
                      }
                      onArchive={() =>
                        mutations.archiveBenchmark.mutate(item.testBenchmarkId)
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="card empty-state">Aucun benchmark défini</p>
          )}
        </section>
      </main>
    </>
  )
}

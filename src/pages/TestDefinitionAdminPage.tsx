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
  TestsCatalogueError,
} from '../services/testsCatalogueService'
import type {
  TestBenchmark,
  TestDefinition,
  TestMetricDefinition,
} from '../types/domain'
import { resolveTestDefinitionAdminViewState } from './testDefinitionAdminState'
import {
  benchmarkCreationErrorMessage,
  hasUnsavedBenchmarkMetrics,
} from './testBenchmarkAdminState'

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
    securityContextReady: app.securityContextReady,
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

  useEffect(() => {
    if (!import.meta.env.DEV) return
    console.debug('[TestCatalogueAdmin DEV] Route', {
      testDefinitionId,
      uid: context.userId,
      roleId: context.activeRoleId,
      securityContextReady: context.securityContextReady,
      canManageTests: allowed,
    })
  }, [
    testDefinitionId,
    context.userId,
    context.activeRoleId,
    context.securityContextReady,
    allowed,
  ])

  const viewState = resolveTestDefinitionAdminViewState({
    appLoading: app.loading,
    securityContextReady: context.securityContextReady,
    allowed,
    testDefinitionId,
    queryPending: detail.isPending,
    queryError: detail.isError,
    errorCode:
      detail.error instanceof TestsCatalogueError
        ? detail.error.code
        : undefined,
    hasData: !!detail.data,
  })

  if (viewState === 'LOADING_CONTEXT')
    return <main className="center">Chargement du contexte…</main>
  if (viewState === 'UNAUTHORIZED')
    return (
      <main className="center error">
        Non autorisé : permission tests.manage requise.
      </main>
    )
  if (viewState === 'NOT_FOUND')
    return <main className="center error">Protocole introuvable.</main>
  if (viewState === 'LOADING')
    return <main className="center">Chargement du protocole…</main>
  if (viewState === 'ERROR')
    return (
      <main className="center error">Impossible de charger le protocole.</main>
    )
  if (!detail.data) return null
  const persistedDefinition = detail.data.definition
  const definition =
    draft ??
    ({
      ...detail.data.definition,
      metrics: sortTestMetrics(detail.data.definition.metrics),
    } satisfies TestDefinition)
  const editable = definition.status === 'DRAFT'
  const benchmarkMetricsAreUnsaved = hasUnsavedBenchmarkMetrics(
    definition.metrics,
    persistedDefinition.metrics,
  )
  const changeMetric = (index: number, patch: Partial<TestMetricDefinition>) =>
    setDraft({
      ...definition,
      metrics: definition.metrics.map((metric, i) =>
        i === index ? { ...metric, ...patch } : metric,
      ),
    })

  return (
    <>
      <header>
        <div>
          <p className="eyebrow">TESTS · ADMINISTRATION</p>
          <strong>
            {definition.name} v{definition.version}
          </strong>
        </div>
        <Link className="button-link secondary" to="/tests/admin">
          Catalogue
        </Link>
      </header>
      <main className="dashboard">
        <h1>
          {definition.name} <small>v{definition.version}</small>
        </h1>
        <p>
          Statut : <strong>{definition.status}</strong>
          {definition.status !== 'DRAFT'
            ? ' · version publiée et immuable'
            : ''}
        </p>
        <form
          className="card admin-form"
          onSubmit={(event) => {
            event.preventDefault()
            mutations.update.mutate({
              name: definition.name,
              code: definition.code,
              description: definition.description,
              domain: definition.domain,
              metrics: definition.metrics,
            })
          }}
        >
          <h2>Identité et métriques</h2>
          <label>
            Nom
            <input
              disabled={!editable}
              value={definition.name}
              onChange={(event) =>
                setDraft({ ...definition, name: event.target.value })
              }
            />
          </label>
          <label>
            Code
            <input disabled value={definition.code} />
          </label>
          <label>
            Description
            <textarea
              disabled={!editable}
              value={definition.description ?? ''}
              onChange={(event) =>
                setDraft({ ...definition, description: event.target.value })
              }
            />
          </label>
          <label>
            Type
            <select
              disabled={!editable}
              value={definition.domain}
              onChange={(event) =>
                setDraft({
                  ...definition,
                  domain: event.target.value as TestDefinition['domain'],
                })
              }
            >
              <option value="TECHNICAL">Technique</option>
              <option value="PHYSICAL">Physique</option>
            </select>
          </label>
          <div className="metric-editor">
            {definition.metrics.map((metric, index) => (
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
                          ...definition,
                          metrics: definition.metrics
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
                          ...definition,
                          metrics: definition.metrics
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
                    ...definition,
                    metrics: [
                      ...definition.metrics,
                      emptyMetric(definition.metrics.length),
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
            {definition.name} v{definition.version}
          </h3>
          {sortTestMetrics(definition.metrics).map((metric) => (
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
          {definition.status !== 'ARCHIVED' ? (
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
                testDefinitionId: persistedDefinition.testDefinitionId,
                testDefinitionVersion: persistedDefinition.version,
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
                disabled={subCategories.isPending || subCategories.isError}
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
              {subCategories.isPending ? (
                <small>Chargement des sous-catégories…</small>
              ) : null}
              {subCategories.isError ? (
                <small className="error">
                  Impossible de charger les sous-catégories du contexte actif.
                </small>
              ) : null}
              {subCategories.isSuccess && !subCategories.data.length ? (
                <small className="error">
                  Aucune sous-catégorie disponible pour cette Team et cette
                  saison.
                </small>
              ) : null}
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
                {persistedDefinition.metrics.map((metric) => (
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
            <button disabled={benchmarkMetricsAreUnsaved}>Ajouter</button>
            {benchmarkMetricsAreUnsaved ? (
              <p className="error">
                Sauvegardez les métriques du brouillon avant de créer un
                benchmark.
              </p>
            ) : null}
            {mutations.createBenchmark.isError ? (
              <p className="error">
                {benchmarkCreationErrorMessage(mutations.createBenchmark.error)}
              </p>
            ) : null}
          </form>
          {benchmarks.isPending ? (
            <p className="card empty-state">Chargement des benchmarks…</p>
          ) : benchmarks.isError ? (
            <p className="card error">
              Impossible de charger les benchmarks du contexte actif.
            </p>
          ) : benchmarks.data?.length ? (
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

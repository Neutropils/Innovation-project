import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ClipboardCheck, SearchX } from 'lucide-react'
import api from '@/api'
import { PageShell } from '@/components/PageHero'
import { EmptyState, ErrorState } from '@/components/StateViews'
import ChecklistView from './ChecklistView'
import InspectionReport from './InspectionReport'
import { ACTION_OUTLINE, ACTION_PRIMARY, errorMessage, isOffline } from './inspectionDisplay'

// Owner: Kandha
// Features: F01.3-F01.10 checklist, F01.12 report - one URL always works:
//   /inspections/new?liftId=<id>  creates (or reopens) the inspector's draft, then moves to /inspections/<id>
//   /inspections/<id>             a draft shows the checklist, a submitted inspection shows its report

function Loading() {
  return (
    <PageShell>
      <div className="space-y-4" aria-hidden="true">
        <span className="block h-8 w-48 animate-pulse rounded bg-muted" />
        <span className="block h-40 animate-pulse rounded-2xl bg-muted" />
        <span className="block h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
      <p className="sr-only" role="status">Loading the inspection</p>
    </PageShell>
  )
}

export default function InspectionPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const liftId = searchParams.get('liftId')
  const navigate = useNavigate()

  const [state, setState] = useState({ status: 'loading', detail: null, error: null })
  const [meta, setMeta] = useState(null)
  const [justSubmitted, setJustSubmitted] = useState(false)
  const loadedId = useRef(null)

  const load = useCallback(async () => {
    if (!id && !liftId) {
      setState({ status: 'no-lift', detail: null, error: null })
      return
    }
    setState({ status: 'loading', detail: null, error: null })
    try {
      // New: POST returns this inspector's existing draft for the lift, or starts one
      const res = id ? await api.get(`/inspections/${id}`) : await api.post('/inspections', { liftId: Number(liftId) })
      const detail = res.data.data
      loadedId.current = detail.id
      setState({ status: 'ready', detail, error: null })
      if (!id) navigate(`/inspections/${detail.id}`, { replace: true })
    } catch (err) {
      const status = err.response?.status
      setState({
        status: status === 404 ? 'not-found' : isOffline(err) ? 'offline' : 'error',
        detail: null,
        error: errorMessage(err),
      })
    }
  }, [id, liftId, navigate])

  useEffect(() => {
    // Replacing /inspections/new with /inspections/<id> must not load it a second time
    if (id && String(loadedId.current) === id && state.status === 'ready') return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, liftId])

  // The severity -> days table comes from the API so the due-date preview never drifts
  useEffect(() => {
    let cancelled = false
    api.get('/checklist-items')
      .then((res) => { if (!cancelled) setMeta(res.data.meta ?? null) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (state.status === 'loading') return <Loading />

  if (state.status === 'no-lift') {
    return (
      <PageShell>
        <EmptyState
          Icon={ClipboardCheck}
          title="Choose a lift to inspect"
          message="Start a new inspection from the Inspections page, or pick a lift from the Lifts page."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/inspections" className={ACTION_PRIMARY}>Go to Inspections</Link>
              <Link to="/lifts" className={ACTION_OUTLINE}>Browse lifts</Link>
            </div>
          }
        />
      </PageShell>
    )
  }

  if (state.status === 'not-found') {
    return (
      <PageShell>
        <EmptyState
          Icon={SearchX}
          title="We couldn’t find that inspection"
          message="It may have been removed, or it is a draft that belongs to someone else."
          action={<Link to="/inspections" className={ACTION_PRIMARY}>Back to inspections</Link>}
        />
      </PageShell>
    )
  }

  if (state.status === 'offline' || state.status === 'error') {
    return (
      <PageShell>
        <ErrorState
          title={state.status === 'offline' ? 'No connection' : 'Couldn’t load the inspection'}
          message={state.status === 'offline' ? 'Check your connection and try again. Answers you already saved are kept.' : state.error}
          onRetry={load}
        />
      </PageShell>
    )
  }

  const { detail } = state
  if (detail.status === 'submitted') {
    return <InspectionReport detail={detail} justSubmitted={justSubmitted} />
  }
  return (
    <ChecklistView
      key={detail.id}
      detail={detail}
      severityDueDays={meta?.severityDueDays}
      onSubmitted={(submitted) => {
        setJustSubmitted(true)
        setState({ status: 'ready', detail: submitted, error: null })
        window.scrollTo?.(0, 0)
      }}
    />
  )
}

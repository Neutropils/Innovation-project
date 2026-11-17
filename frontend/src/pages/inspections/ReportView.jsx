import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import api from '@/api'
import { PageShell } from '@/components/PageHero'
import { EmptyState, ErrorState } from '@/components/StateViews'
import InspectionReport from './InspectionReport'
import { ACTION_PRIMARY, errorMessage } from './inspectionDisplay'

// Owner: Kandha
// The report for one inspection, shown on /inspections?report=<id> in place of the history list.
// A draft, someone else's draft or an unknown ID shows "Inspection not found", never a blank page.
export default function ReportView({ id, backTo, justSubmitted }) {
  const [state, setState] = useState({ status: 'loading', detail: null, error: '' })

  const load = useCallback(() => {
    setState({ status: 'loading', detail: null, error: '' })
    api.get(`/inspections/${encodeURIComponent(id)}`)
      .then((res) => {
        const detail = res.data.data
        setState(detail?.status === 'submitted' ? { status: 'ready', detail, error: '' } : { status: 'not-found', detail: null, error: '' })
      })
      .catch((err) => setState({ status: err.response?.status === 404 ? 'not-found' : 'error', detail: null, error: errorMessage(err) }))
  }, [id])

  useEffect(() => { load() }, [load])

  if (state.status === 'ready') return <InspectionReport detail={state.detail} justSubmitted={justSubmitted} backTo={backTo} />

  return (
    <PageShell>
      {state.status === 'loading' && (
        <div className="space-y-4" aria-hidden="true">
          <span className="block h-8 w-48 animate-pulse rounded bg-muted" />
          <span className="block h-40 animate-pulse rounded-2xl bg-muted" />
          <span className="block h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      )}
      {state.status === 'not-found' && (
        <EmptyState
          Icon={SearchX}
          title="Inspection not found"
          message="It may have been removed, or it is a draft that has not been submitted yet."
          action={<Link to={backTo} className={ACTION_PRIMARY}>Back to inspections</Link>}
        />
      )}
      {state.status === 'error' && <ErrorState title="Couldn’t load the report" message={state.error} onRetry={load} />}
    </PageShell>
  )
}

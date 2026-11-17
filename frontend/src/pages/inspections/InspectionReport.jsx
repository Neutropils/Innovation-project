import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ClipboardCheck, Download, ExternalLink, MapPin } from 'lucide-react'
import api from '@/api'
import { cn } from '@/lib/utils'
import PageHero, { CARD, PageShell } from '@/components/PageHero'
import StatusBadge from '@/components/StatusBadge'
import { mapsUrl } from '@/pages/lifts/liftDisplay'
import {
  ACTION_OUTLINE, SEVERITIES, SEVERITY_TONES, downloadInspectionsCsv, errorMessage, formatDay, formatDayTime,
  groupBySection, plural,
} from './inspectionDisplay'

// Owner: Kandha
// Features: F01.12 inspection report (also the single-inspection export, F05.3)
// Wireframe: design/screens.md "Inspection history and report"
//
// Shown on /inspections?report=<id> (see ReportView). Read-only. Defects are listed from the API (created by defectService on submit); each links
// to /defects/<id>, which Jerald's page serves.

const severityLabel = (value) => SEVERITIES.find((s) => s.value === value)?.label ?? value

function SeverityPill({ severity }) {
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', SEVERITY_TONES[severity])}>
      {severityLabel(severity)}
    </span>
  )
}

function ResultLabel({ result }) {
  return result === 'defect' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive ring-1 ring-inset ring-destructive/30">
      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
      Defect
    </span>
  ) : result === 'pass' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/30 dark:text-emerald-400">
      <Check className="h-3.5 w-3.5" aria-hidden="true" />
      Pass
    </span>
  ) : (
    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground ring-1 ring-inset ring-border">Not answered</span>
  )
}

function Count({ label, value, tone }) {
  return (
    <div className={cn(CARD, 'px-4 py-3 text-center')}>
      <p className={cn('text-2xl font-bold', tone ?? 'text-foreground')}>{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  )
}

export default function InspectionReport({ detail, justSubmitted, backTo = '/inspections' }) {
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const { lift, counts, defects } = detail
  const sections = groupBySection(detail.results)

  async function exportThis() {
    setExporting(true)
    setExportError('')
    try {
      await downloadInspectionsCsv(api, { inspectionId: detail.id })
    } catch (err) {
      setExportError(errorMessage(err, 'Couldn’t export. Check your connection and try again.'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <PageShell>
      <nav aria-label="Breadcrumb" className="px-1 text-sm text-muted-foreground">
        <Link to={backTo} className="inline-flex min-h-[44px] items-center font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Inspections
        </Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page" className="font-mono text-foreground">{detail.displayId}</span>
      </nav>

      {justSubmitted && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>
            {defects.length > 0
              ? `Submitted · ${plural(defects.length, 'defect')} sent to ${detail.contractor?.name ?? 'the lift company'}`
              : 'Submitted · all items passed, no defects raised'}
          </span>
        </div>
      )}

      <PageHero Icon={ClipboardCheck} eyebrow="Inspection report" title={detail.displayId}>
        <p>Submitted {formatDayTime(detail.submittedAt)}</p>
      </PageHero>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className={cn(CARD, 'p-4')}>
          <dl className="space-y-1.5 text-sm">
            <div className="flex gap-2"><dt className="w-24 flex-shrink-0 text-muted-foreground">Lift</dt><dd className="min-w-0 font-medium text-foreground">{lift.liftCode}</dd></div>
            <div className="flex gap-2">
              <dt className="w-24 flex-shrink-0 text-muted-foreground">Address</dt>
              <dd className="min-w-0 text-foreground">
                {lift.address}
                <a href={mapsUrl(lift)} target="_blank" rel="noreferrer" className="ml-2 inline-flex min-h-[44px] items-center gap-1 font-medium text-primary underline-offset-2 hover:underline dark:text-accent">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  Find in map
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </dd>
            </div>
            <div className="flex gap-2"><dt className="w-24 flex-shrink-0 text-muted-foreground">Contractor</dt><dd className="min-w-0 text-foreground">{detail.contractor?.name ?? '-'}</dd></div>
            <div className="flex gap-2"><dt className="w-24 flex-shrink-0 text-muted-foreground">Inspector</dt><dd className="min-w-0 text-foreground">{detail.inspector?.name ?? '-'}</dd></div>
            <div className="flex gap-2"><dt className="w-24 flex-shrink-0 text-muted-foreground">Date</dt><dd className="min-w-0 text-foreground">{formatDay(detail.submittedAt)}</dd></div>
          </dl>
        </div>
        <div className="grid grid-cols-3 gap-3 md:w-72">
          <Count label="Checked" value={counts.answered} />
          <Count label="Pass" value={counts.pass} tone="text-emerald-700 dark:text-emerald-400" />
          <Count label="Defect" value={counts.defect} tone={counts.defect ? 'text-destructive' : undefined} />
        </div>
      </div>

      <section aria-labelledby="defects-raised">
        <h2 id="defects-raised" className="mb-2 px-1 text-base font-semibold text-foreground">Defects raised ({defects.length})</h2>
        {defects.length === 0 ? (
          <p className={cn(CARD, 'p-4 text-sm text-muted-foreground')}>No defects were raised in this inspection.</p>
        ) : (
          <>
            {/* Desktop: table */}
            <div className={cn(CARD, 'hidden overflow-x-auto md:block')}>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Defect</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Item</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">What’s wrong</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Severity</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Due</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {defects.map((d) => (
                    <tr key={d.id}>
                      <td className="px-4 py-3">
                        <Link to={`/defects/${d.id}`} className="inline-flex min-h-[44px] items-center font-mono font-medium text-primary underline-offset-2 hover:underline dark:text-accent">{d.displayId}</Link>
                      </td>
                      <td className="px-4 py-3"><span className="font-mono text-xs text-muted-foreground">{d.itemCode}</span><br />{d.itemText}</td>
                      <td className="px-4 py-3">{d.description}{d.location && <span className="block text-xs text-muted-foreground">{d.location}</span>}</td>
                      <td className="px-4 py-3"><SeverityPill severity={d.severity} /></td>
                      <td className="whitespace-nowrap px-4 py-3">{formatDay(d.dueDate)}</td>
                      <td className="px-4 py-3"><StatusBadge status={d.status} dueDate={d.dueDate} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Phone: stacked cards */}
            <ul className="space-y-3 md:hidden">
              {defects.map((d) => (
                <li key={d.id}>
                  <Link to={`/defects/${d.id}`} className={cn(CARD, 'block p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold text-primary dark:text-accent">{d.displayId}</span>
                      <SeverityPill severity={d.severity} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground"><span className="font-mono">{d.itemCode}</span> · {d.itemText}</p>
                    <p className="mt-1 text-sm text-foreground">{d.description}</p>
                    {d.location && <p className="text-xs text-muted-foreground">{d.location}</p>}
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">Due {formatDay(d.dueDate)}</span>
                      <StatusBadge status={d.status} dueDate={d.dueDate} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section aria-labelledby="checklist-results" className="space-y-3">
        <h2 id="checklist-results" className="px-1 text-base font-semibold text-foreground">Checklist results</h2>
        {sections.map((s) => (
          <div key={s.section} className={cn(CARD, 'overflow-hidden')}>
            <h3 className="border-b border-border bg-muted/40 px-4 py-2.5 text-sm font-semibold text-foreground">{s.section}</h3>
            <ul className="divide-y divide-border">
              {s.items.map((item) => (
                <li key={item.checklistItemId} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground"><span className="mr-2 font-mono text-xs text-muted-foreground">{item.code}</span>{item.itemText}</p>
                    {item.result === 'defect' && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[item.description, item.location, item.severity && severityLabel(item.severity)].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <ResultLabel result={item.result} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-2 pb-2">
        <button type="button" onClick={exportThis} disabled={exporting} className={ACTION_OUTLINE}>
          <Download className="h-4 w-4" aria-hidden="true" />
          {exporting ? 'Exporting…' : 'Export this inspection (CSV)'}
        </button>
        <Link to={backTo} className={ACTION_OUTLINE}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to inspections
        </Link>
        {exportError && <p role="alert" className="text-sm font-medium text-destructive">{exportError}</p>}
      </div>
    </PageShell>
  )
}

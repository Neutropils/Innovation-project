import { useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, FlaskConical, Loader2, Upload, Wand2 } from 'lucide-react'
import api from '@/api'
import { cn } from '@/lib/utils'
import { CARD } from '@/components/PageHero'
import { PROTOTYPE } from '@/prototype/mockApi'
import { SAMPLE_IMPORTS } from '@/prototype/registerData'
import { BTN_OUTLINE, BTN_PRIMARY, downloadCsv, saveErrorMessage } from './adminUi'

// Owner: Kwan - Admin > Import: bulk lift import (F05.1 upload, F05.2 template, F05.5 summary)
//
// The file is checked first (dryRun) and nothing is saved until the admin confirms:
//   choose -> checking -> review -> importing -> done
// The check fixes what is safe to fix, and rejects the rest with a reason per row.

const COLUMNS = ['lift_code', 'block', 'lift', 'street', 'town', 'postal_code', 'contractor']
const TEMPLATE = [COLUMNS.join(','), 'LIFT-0001,512,Lift A,Hougang Ave 10,Hougang,530512,Apex Lifts'].join('\n')
const FIELD_LABELS = { lift_code: 'lift code', block: 'block' }
const MAX_BYTES = 1024 * 1024

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

const readText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })

// The rejected rows as a file, with the reason in a last column, to fix and upload again.
function rejectedCsv(rejected) {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = rejected.map((r) => [...COLUMNS.map((c) => r.values[c]), r.reason].map(cell).join(','))
  return [[...COLUMNS, 'problem'].join(','), ...lines].join('\n')
}

function Stat({ value, label, tone }) {
  const tones = {
    good: 'border-primary/30 text-primary dark:text-accent',
    fixed: 'border-amber-500/40 text-amber-700 dark:text-amber-400',
    bad: 'border-destructive/30 text-destructive',
    none: 'border-border text-muted-foreground',
  }
  return (
    <p className={cn('rounded-xl border bg-card px-3 py-2.5', tones[value > 0 ? tone : 'none'])}>
      <span className="block text-2xl font-bold tabular-nums">{value}</span>
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
    </p>
  )
}

export default function ImportTab({ onOpenTab }) {
  const [phase, setPhase] = useState('choose')
  const [file, setFile] = useState(null) // { filename, csv }
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const input = useRef(null)

  async function check(filename, csv) {
    setError('')
    setFile({ filename, csv })
    setPhase('checking')
    try {
      const res = await api.post('/lifts/import', { filename, csv, dryRun: true })
      setResult(res.data.data)
      setPhase('review')
    } catch (err) {
      setError(saveErrorMessage(err))
      setPhase('choose')
    }
  }

  async function onFileChosen(event) {
    const chosen = event.target.files?.[0]
    event.target.value = '' // so choosing the same file again still fires
    if (!chosen) return
    if (!/\.csv$/i.test(chosen.name)) {
      setError(`“${chosen.name}” isn’t a CSV file. In Excel, choose File > Save As > CSV, then upload that file.`)
      return
    }
    if (chosen.size === 0) {
      setError(`“${chosen.name}” is empty.`)
      return
    }
    if (chosen.size > MAX_BYTES) {
      setError(`“${chosen.name}” is larger than 1 MB. Split it into smaller files and import them one at a time.`)
      return
    }
    try {
      check(chosen.name, await readText(chosen))
    } catch {
      setError(`“${chosen.name}” couldn’t be read. Check the file opens on this device, then try again.`)
    }
  }

  async function confirm() {
    setError('')
    setPhase('importing')
    try {
      const res = await api.post('/lifts/import', { ...file, dryRun: false })
      setResult(res.data.data)
      setPhase('done')
    } catch (err) {
      setError(saveErrorMessage(err))
      setPhase('review')
    }
  }

  function startOver() {
    setPhase('choose')
    setFile(null)
    setResult(null)
    setError('')
  }

  const errorAlert = error && (
    <p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>{error}</span>
    </p>
  )

  if (phase === 'choose' || phase === 'checking') {
    const checking = phase === 'checking'
    return (
      <section aria-label="Import lifts" className={cn(CARD, 'space-y-5 p-4')}>
        <div>
          <h2 className="text-base font-semibold text-foreground">Import lifts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add many lifts at once from a spreadsheet. The file is checked first and nothing is saved until you confirm.
          </p>
        </div>

        <ol className="space-y-4">
          <li className="flex gap-3">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary dark:text-accent">1</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Fill in the template</p>
              <p className="text-xs text-muted-foreground">Columns: {COLUMNS.join(', ')}</p>
              <button type="button" onClick={() => downloadCsv(TEMPLATE, 'elev8-lift-import-template.csv')} className={cn(BTN_OUTLINE, 'mt-2')}>
                <Download className="h-4 w-4" aria-hidden="true" />
                Download template
              </button>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary dark:text-accent">2</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Upload it as a CSV file</p>
              <p className="text-xs text-muted-foreground">In Excel: File &gt; Save As &gt; CSV. Up to 1 MB.</p>
              <input ref={input} type="file" accept=".csv,text/csv" onChange={onFileChosen} aria-label="Lift file" className="sr-only" tabIndex={-1} />
              <button type="button" onClick={() => input.current?.click()} disabled={checking} className={cn(BTN_PRIMARY, 'mt-2')}>
                {checking ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
                {checking ? `Checking ${file.filename}…` : 'Choose file'}
              </button>
            </div>
          </li>
        </ol>

        {errorAlert}

        {/* Prototype-only: sample files, so the demo needs no file on this device */}
        {PROTOTYPE && (
          <div role="group" aria-label="Prototype sample files" className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-foreground/20 px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
              Try a sample
            </span>
            {[['clean', 'Clean file'], ['problems', 'File with problems']].map(([key, label]) => (
              <button
                key={key}
                type="button"
                disabled={checking}
                onClick={() => check(SAMPLE_IMPORTS[key].filename, SAMPLE_IMPORTS[key].csv)}
                className="rounded-full border border-border px-2.5 py-1 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </section>
    )
  }

  const { accepted, fixes, rejected, total } = result
  const done = phase === 'done'
  const importing = phase === 'importing'

  return (
    <section aria-label={done ? 'Import finished' : 'Check import'} className={cn(CARD, 'space-y-5 p-4')}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-accent">
          {done ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-base font-semibold text-foreground">{done ? 'Import finished' : `Check ${file.filename}`}</h2>
          <p role="status" className="mt-0.5 text-sm text-muted-foreground">
            {done
              ? `${plural(accepted, 'lift')} added to the register.${rejected.length > 0 ? ` ${plural(rejected.length, 'row')} skipped.` : ''}`
              : accepted === 0
                ? `None of the ${plural(total, 'row')} can be imported. Nothing has been saved.`
                : `${plural(total, 'row')} read. Nothing has been saved yet.`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat value={accepted} label={done ? 'Imported' : 'Ready to import'} tone="good" />
        <Stat value={fixes.length} label="Fixed for you" tone="fixed" />
        <Stat value={rejected.length} label={done ? 'Skipped' : 'Can’t be imported'} tone="bad" />
      </div>

      {fixes.length > 0 && (
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Wand2 className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            Fixed for you
          </h3>
          <ul aria-label="Fixed for you" className="mt-2 divide-y divide-border/70 rounded-xl border border-border text-sm">
            {fixes.map((f) => (
              <li key={`${f.row}-${f.field}`} className="flex items-baseline gap-2 px-3 py-2">
                <span className="w-14 flex-shrink-0 text-xs font-medium text-muted-foreground">Row {f.row}</span>
                <span className="min-w-0 break-words text-foreground">
                  {FIELD_LABELS[f.field] ?? f.field}: <span className="text-muted-foreground line-through">{f.from}</span> changed to{' '}
                  <span className="font-semibold">{f.to}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rejected.length > 0 && (
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
            {done ? 'Skipped rows' : 'Rows that can’t be imported'}
          </h3>
          <ul aria-label="Rejected rows" className="mt-2 divide-y divide-border/70 rounded-xl border border-destructive/30 text-sm">
            {rejected.map((r) => (
              <li key={r.row} className="flex items-baseline gap-2 px-3 py-2">
                <span className="w-14 flex-shrink-0 text-xs font-medium text-muted-foreground">Row {r.row}</span>
                <span className="min-w-0 break-words text-foreground">{r.reason}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Download these rows, fix them in the spreadsheet and upload that file. The other rows don’t need uploading again.
          </p>
        </div>
      )}

      {errorAlert}

      <div className="flex flex-wrap gap-2">
        {done ? (
          <button type="button" onClick={() => onOpenTab('lifts')} className={cn(BTN_PRIMARY, 'flex-1 sm:flex-none')}>
            View lifts
          </button>
        ) : (
          <button type="button" onClick={confirm} disabled={importing || accepted === 0} className={cn(BTN_PRIMARY, 'flex-1 sm:flex-none')}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
            {importing ? 'Importing…' : `Import ${plural(accepted, 'lift')}`}
          </button>
        )}
        {rejected.length > 0 && (
          <button type="button" onClick={() => downloadCsv(rejectedCsv(rejected), 'elev8-rejected-rows.csv')} className={BTN_OUTLINE}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Download rejected rows
          </button>
        )}
        <button type="button" onClick={startOver} disabled={importing} className={BTN_OUTLINE}>
          {done ? 'Import another file' : 'Choose another file'}
        </button>
      </div>
    </section>
  )
}

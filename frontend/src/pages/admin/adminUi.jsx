import { useCallback, useEffect } from 'react'
import { Form, Formik, useField } from 'formik'
import { CheckCircle2, Loader2, Search, X } from 'lucide-react'
import api from '@/api'
import { cn } from '@/lib/utils'
import { CARD } from '@/components/PageHero'
import { ErrorState } from '@/components/StateViews'
import { OfflineBanner, OfflineState, isOfflineError, useOfflineLoad } from '@/components/OfflineMode'
import { useScenario } from '@/prototype/DemoScenarioBar'

// Owner: Kwan - pieces shared by the Admin page tabs: buttons, form fields, the record form,
// list loading and its states.

const BTN =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
export const BTN_PRIMARY = cn(BTN, 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90')
export const BTN_OUTLINE = cn(BTN, 'border border-border bg-card text-foreground shadow-sm hover:bg-muted')

const INPUT =
  'h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60'

// What to tell the admin when a save or upload fails.
export function saveErrorMessage(err) {
  if (isOfflineError(err)) return 'You’re offline, so nothing was saved. What you entered is still here - try again when you reconnect.'
  return err?.response?.data?.message ?? 'Something went wrong on our side and nothing was saved. Try again in a moment.'
}

// Form values for a record: only the form's own fields, with null shown as an empty box
// and ids as strings (what a <select> holds).
export function toFormValues(blank, record) {
  return Object.fromEntries(
    Object.keys(blank).map((key) => {
      const value = record[key] ?? blank[key]
      return [key, typeof value === 'number' ? String(value) : value]
    })
  )
}

export function downloadCsv(text, filename) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ── Lists ────────────────────────────────────────────────────────────────────

// Loads a list for a tab, with the same offline behaviour as the other pages, and reloads
// when the demo scenario changes. Returns [state, reload].
export function useAdminList(cacheKey, url) {
  const scenario = useScenario()
  const fetcher = useCallback(() => api.get(url).then((res) => res.data.data), [url])
  const [state, load] = useOfflineLoad(cacheKey, fetcher)
  useEffect(() => { load() }, [load, scenario])
  return [state, load]
}

// Loading, offline and error states of a list. Renders nothing extra once the list is ready.
export function ListStates({ state, load, what }) {
  return (
    <>
      {state.savedAt && <OfflineBanner savedAt={state.savedAt} what={what} onRetry={load} retrying={state.retrying} />}
      {state.status === 'loading' && (
        <div className={cn(CARD, 'space-y-4 p-4')} aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="block space-y-2">
              <span className="block h-4 w-44 animate-pulse rounded bg-muted" />
              <span className="block h-3 w-64 max-w-full animate-pulse rounded bg-muted" />
            </span>
          ))}
        </div>
      )}
      {state.status === 'offline' && <OfflineState onRetry={load} retrying={state.retrying} />}
      {state.status === 'error' && (
        <ErrorState title={`Couldn’t load ${what}`} message="Something went wrong on our side. Try again in a moment." onRetry={load} />
      )}
    </>
  )
}

export function SearchBox({ value, onChange, label }) {
  return (
    <div className="relative min-w-0 flex-1 basis-full sm:basis-0">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') onChange('') }}
        aria-label={label}
        placeholder={label}
        className={cn(INPUT, 'pl-9 pr-10 [&::-webkit-search-cancel-button]:hidden')}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

// One record in a tab's list: details on the left, Edit on the right.
export function RecordRow({ title, code, lines = [], badges, onEdit, editLabel }) {
  return (
    <li className="flex items-start gap-3 px-3 py-3">
      <div className="min-w-0 flex-1">
        {code && <p className="font-mono text-xs font-medium text-foreground/80">{code}</p>}
        <p className="break-words text-sm font-semibold text-foreground">{title}</p>
        {lines.filter(Boolean).map((line) => (
          <p key={line} className="break-words text-sm text-muted-foreground">{line}</p>
        ))}
        {badges && <p className="mt-1.5 flex flex-wrap gap-1.5">{badges}</p>}
      </div>
      <button type="button" onClick={onEdit} aria-label={editLabel} className={cn(BTN_OUTLINE, 'h-10 flex-shrink-0 px-3')}>
        Edit
      </button>
    </li>
  )
}

const PILL = 'rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset'

export function Pill({ children, tone = 'muted' }) {
  const tones = {
    muted: 'bg-muted text-muted-foreground ring-border',
    primary: 'bg-primary/10 text-primary ring-primary/20 dark:text-accent',
    danger: 'bg-destructive/10 text-destructive ring-destructive/25',
  }
  return <span className={cn(PILL, tones[tone])}>{children}</span>
}

export const InactivePill = () => <Pill tone="danger">Inactive</Pill>

// Confirmation shown after a save.
export function Notice({ children, onDismiss }) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary dark:text-accent" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm text-foreground">{children}</div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-mr-1 -mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

// ── Forms ────────────────────────────────────────────────────────────────────

function FieldShell({ id, label, optional, error, hint, className, children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {optional && <span className="font-normal text-muted-foreground"> (optional)</span>}
      </label>
      {children}
      {error
        ? <p id={`${id}-error`} className="mt-1 text-sm text-destructive">{error}</p>
        : hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function TextField({ label, name, hint, optional, className, ...props }) {
  const [field, meta] = useField(name)
  const id = `field-${name}`
  const error = meta.touched && meta.error
  return (
    <FieldShell id={id} label={label} optional={optional} error={error} hint={hint} className={className}>
      <input
        id={id}
        {...field}
        {...props}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(INPUT, 'mt-1', error && 'border-destructive')}
      />
    </FieldShell>
  )
}

export function SelectField({ label, name, options, placeholder, hint, className }) {
  const [field, meta] = useField(name)
  const id = `field-${name}`
  const error = meta.touched && meta.error
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} className={className}>
      <select
        id={id}
        {...field}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(INPUT, 'mt-1', error && 'border-destructive')}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </FieldShell>
  )
}

export function CheckboxField({ label, name, hint, className }) {
  const [field] = useField({ name, type: 'checkbox' })
  return (
    <label className={cn('flex min-h-[44px] items-start gap-3 text-sm', className)}>
      <input type="checkbox" {...field} className="mt-0.5 h-5 w-5 flex-shrink-0 rounded border-border accent-[hsl(var(--primary))]" />
      <span>
        <span className="font-medium text-foreground">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  )
}

// Add or edit form for one record.
//   save(values)  sends the request and returns the saved record
//   fieldByCode   API error code -> field name, so "already exists" shows under the right field
// Any other failure shows above the buttons and the form stays filled in.
export function RecordForm({ title, initialValues, schema, save, onSaved, onCancel, fieldByCode = {}, children }) {
  return (
    <section aria-label={title} className={cn(CARD, 'p-4')}>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <Formik
        initialValues={initialValues}
        validationSchema={schema}
        onSubmit={async (values, helpers) => {
          helpers.setStatus(undefined)
          try {
            onSaved(await save(schema.cast(values)))
          } catch (err) {
            const { code, message } = err?.response?.data ?? {}
            if (fieldByCode[code]) helpers.setFieldError(fieldByCode[code], message)
            else helpers.setStatus(saveErrorMessage(err))
          }
        }}
      >
        {({ isSubmitting, status, values }) => (
          <Form noValidate className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">{typeof children === 'function' ? children(values) : children}</div>
            {status && (
              <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {status}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={isSubmitting} className={cn(BTN_PRIMARY, 'flex-1 sm:flex-none')}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isSubmitting ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={onCancel} disabled={isSubmitting} className={BTN_OUTLINE}>
                Cancel
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </section>
  )
}

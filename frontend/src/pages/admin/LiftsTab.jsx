import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Building2, Download, Loader2, Plus, SearchX, Upload } from 'lucide-react'
import api from '@/api'
import { cn } from '@/lib/utils'
import { CARD } from '@/components/PageHero'
import { EmptyState } from '@/components/StateViews'
import { liftSchema } from '@/schemas/admin'
import { matchesLift } from '@/pages/lifts/liftDisplay'
import {
  BTN_OUTLINE, BTN_PRIMARY, CheckboxField, InactivePill, ListStates, Notice, RecordForm, RecordRow,
  SearchBox, SelectField, TextField, downloadCsv, toFormValues, useAdminList,
} from './adminUi'

// Owner: Kwan - Admin > Lifts: the lift register (F04.1), with export (F05.2)

const BLANK = { liftCode: '', block: '', label: '', street: '', town: '', postalCode: '', contractorId: '', isActive: true }

export default function LiftsTab({ onOpenTab }) {
  const [state, load] = useAdminList('lifts', '/lifts')
  const [contractors, setContractors] = useState(null) // null while loading
  const [editing, setEditing] = useState(null) // null | 'new' | lift
  const [notice, setNotice] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''

  // Contractor choices for the form; an empty list just means the form asks to add one first
  useEffect(() => {
    if (!editing) return
    setContractors(null)
    api.get('/contractors').then((res) => setContractors(res.data.data ?? [])).catch(() => setContractors([]))
  }, [editing])

  const all = state.data ?? []
  const lifts = useMemo(() => all.filter((l) => matchesLift(l, q)), [all, q])
  const offline = Boolean(state.savedAt) || state.status === 'offline'

  function setSearch(value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set('q', value)
    else next.delete('q')
    setSearchParams(next, { replace: true })
  }

  async function exportCsv() {
    setExportError('')
    setExporting(true)
    try {
      const res = await api.get('/lifts/export', { responseType: 'text' })
      downloadCsv(String(res.data), `elev8-lifts-${new Date().toISOString().slice(0, 10)}.csv`)
    } catch {
      setExportError('Export failed. Try again in a moment.')
    } finally {
      setExporting(false)
    }
  }

  if (editing) {
    const isNew = editing === 'new'
    // Inactive companies can't take new lifts, but a lift keeps the one it already has
    const choices = (contractors ?? []).filter((c) => c.isActive || c.id === editing.contractorId)
    return (
      <RecordForm
        title={isNew ? 'Add lift' : `Edit ${editing.liftCode}`}
        initialValues={isNew ? BLANK : toFormValues(BLANK, editing)}
        schema={liftSchema}
        fieldByCode={{ DUPLICATE_LIFT_CODE: 'liftCode' }}
        save={(values) => (isNew ? api.post('/lifts', values) : api.patch(`/lifts/${editing.id}`, values)).then((res) => res.data.data)}
        onSaved={(lift) => {
          setEditing(null)
          setNotice(`${lift.liftCode} ${isNew ? 'added to the register' : 'updated'}.`)
          load()
        }}
        onCancel={() => setEditing(null)}
      >
        <TextField label="Lift code" name="liftCode" placeholder="LIFT-0000" hint="The ID on the lift, e.g. LIFT-0427" autoCapitalize="characters" />
        <SelectField
          label="Contractor"
          name="contractorId"
          placeholder={!contractors ? 'Loading contractors…' : choices.length > 0 ? 'Choose a contractor' : 'No contractors yet - add one first'}
          options={choices.map((c) => ({ value: String(c.id), label: c.name }))}
          hint="The lift company that fixes this lift’s defects"
        />
        <TextField label="Block" name="block" placeholder="512" />
        <TextField label="Lift" name="label" placeholder="Lift A" optional />
        <TextField label="Street" name="street" placeholder="Hougang Ave 10" className="sm:col-span-2" />
        <TextField label="Town" name="town" optional />
        <TextField label="Postal code" name="postalCode" inputMode="numeric" optional />
        {!isNew && (
          <CheckboxField
            label="Active"
            name="isActive"
            hint="Untick to take the lift out of the inspectors’ list. Its history is kept."
            className="sm:col-span-2"
          />
        )}
      </RecordForm>
    )
  }

  return (
    <div className="space-y-4">
      {notice && <Notice onDismiss={() => setNotice('')}>{notice}</Notice>}

      <div className="flex flex-wrap gap-2">
        <SearchBox value={q} onChange={setSearch} label="Search lifts" />
        <button
          type="button"
          onClick={exportCsv}
          disabled={exporting || offline || state.status !== 'ready' || all.length === 0}
          title={offline ? 'Export needs a connection' : undefined}
          className={cn(BTN_OUTLINE, 'flex-1 sm:flex-none')}
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
          Export CSV
        </button>
        <button type="button" onClick={() => { setNotice(''); setEditing('new') }} className={cn(BTN_PRIMARY, 'flex-1 sm:flex-none')}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add lift
        </button>
      </div>
      {exportError && <p role="alert" className="text-sm text-destructive">{exportError}</p>}

      <ListStates state={state} load={load} what="lifts" />

      {state.status === 'ready' && all.length === 0 && (
        <EmptyState
          Icon={Building2}
          title="No lifts in the register yet"
          message="Import your lift list from a spreadsheet, or add lifts one at a time."
          action={
            <button type="button" onClick={() => onOpenTab('import')} className={BTN_PRIMARY}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              Import lifts
            </button>
          }
        />
      )}

      {state.status === 'ready' && all.length > 0 && lifts.length === 0 && (
        <EmptyState
          Icon={SearchX}
          title={`No lifts match “${q.trim()}”`}
          message="Check the spelling, or search by lift ID, block, street or contractor."
          action={<button type="button" onClick={() => setSearch('')} className={BTN_PRIMARY}>Clear search</button>}
        />
      )}

      {state.status === 'ready' && lifts.length > 0 && (
        <>
          <p className="px-1 text-xs text-muted-foreground" aria-live="polite">
            {lifts.length === all.length ? `${all.length} lift${all.length === 1 ? '' : 's'}` : `${lifts.length} of ${all.length} lifts`}
          </p>
          <ul aria-label="Lifts" className={cn(CARD, 'divide-y divide-border/70 p-2')}>
            {lifts.map((lift) => (
              <RecordRow
                key={lift.id}
                code={lift.liftCode}
                title={lift.liftName}
                lines={[[lift.street, lift.town].filter(Boolean).join(', '), lift.contractorName]}
                badges={!lift.isActive && <InactivePill />}
                onEdit={() => { setNotice(''); setEditing(lift) }}
                editLabel={`Edit ${lift.liftCode}`}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

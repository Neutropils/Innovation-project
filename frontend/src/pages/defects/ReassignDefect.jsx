import { useEffect, useId, useState } from 'react'
import { useFormik } from 'formik'
import { ArrowRightLeft, Loader2 } from 'lucide-react'
import api from '@/api'
import { cn } from '@/lib/utils'
import { isOfflineError } from '@/components/OfflineMode'
import { reassignSchema } from '@/schemas/defects'

// Owner: Si Qi
// Feature: F02.4 contractor assignment. Every defect is assigned to its lift's contractor when
// it is raised; this lets an EMS admin move it to another company, with a reason. The status
// stays the same, the old company stops seeing it, and the move is added to the history.
// Calls PATCH /api/defects/:id/assign { contractorId, reason }.
// Usage (admin only, not for closed defects - the parent decides):
//   <ReassignDefect defect={defect} onReassigned={(updated) => ...} />

const fieldClass =
  'w-full rounded-xl border bg-card px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function errorMessage(err) {
  if (isOfflineError(err)) return 'You’re offline. Reassigning needs a connection - try again when you’re back online.'
  return err?.response?.data?.message || 'Couldn’t reassign the defect. Try again in a moment.'
}

export default function ReassignDefect({ defect, onReassigned }) {
  const [open, setOpen] = useState(false)
  const [contractors, setContractors] = useState({ status: 'idle', list: [] })
  const ids = useId()

  // Load the companies the first time the form opens
  useEffect(() => {
    if (!open || contractors.status !== 'idle') return
    setContractors({ status: 'loading', list: [] })
    api.get('/contractors')
      .then((res) => setContractors({ status: 'ready', list: res.data.data ?? [] }))
      .catch(() => setContractors({ status: 'error', list: [] }))
  }, [open, contractors.status])

  const choices = contractors.list.filter((c) => c.isActive !== false && c.id !== defect.contractorId)

  const formik = useFormik({
    initialValues: { contractorId: '', reason: '' },
    validationSchema: reassignSchema,
    onSubmit: async (values, { setStatus, resetForm }) => {
      setStatus(null)
      try {
        const res = await api.patch(`/defects/${defect.id}/assign`, {
          contractorId: Number(values.contractorId),
          reason: values.reason.trim(),
        })
        resetForm()
        setOpen(false)
        onReassigned?.(res.data.data)
      } catch (err) {
        setStatus(errorMessage(err))
      }
    },
  })

  function cancel() {
    formik.resetForm()
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
        Reassign
      </button>
    )
  }

  const showError = (name) => formik.touched[name] && formik.errors[name]

  return (
    <form
      onSubmit={formik.handleSubmit}
      noValidate
      aria-label="Reassign defect"
      className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4 motion-safe:animate-in motion-safe:fade-in"
    >
      <div>
        <h3 className="text-sm font-semibold text-foreground">Reassign to another contractor</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Currently with <span className="font-medium text-foreground">{defect.contractorName}</span>.
          The status and due date stay the same.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor={`${ids}-contractor`} className="text-xs font-medium text-muted-foreground">Move to</label>
        <select
          id={`${ids}-contractor`}
          name="contractorId"
          value={formik.values.contractorId}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          disabled={contractors.status === 'loading'}
          aria-invalid={Boolean(showError('contractorId'))}
          aria-describedby={showError('contractorId') ? `${ids}-contractor-error` : undefined}
          className={cn(fieldClass, 'h-11', showError('contractorId') ? 'border-destructive' : 'border-border')}
        >
          <option value="">{contractors.status === 'loading' ? 'Loading contractors…' : 'Select a company'}</option>
          {choices.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>
        {contractors.status === 'error' && (
          <p className="text-xs text-destructive">Couldn’t load the contractor list. Close the form and try again.</p>
        )}
        {showError('contractorId') && (
          <p id={`${ids}-contractor-error`} className="text-xs text-destructive">{formik.errors.contractorId}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor={`${ids}-reason`} className="text-xs font-medium text-muted-foreground">Reason</label>
        <textarea
          id={`${ids}-reason`}
          name="reason"
          rows={3}
          maxLength={500}
          value={formik.values.reason}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          placeholder="e.g. Lift moved to a new maintenance contract"
          aria-invalid={Boolean(showError('reason'))}
          aria-describedby={showError('reason') ? `${ids}-reason-error` : undefined}
          className={cn(fieldClass, 'resize-y py-2', showError('reason') ? 'border-destructive' : 'border-border')}
        />
        {showError('reason') && (
          <p id={`${ids}-reason-error`} className="text-xs text-destructive">{formik.errors.reason}</p>
        )}
      </div>

      {formik.status && <p role="alert" className="text-sm text-destructive">{formik.status}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={cancel}
          disabled={formik.isSubmitting}
          className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={formik.isSubmitting}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {formik.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Reassign
        </button>
      </div>
    </form>
  )
}

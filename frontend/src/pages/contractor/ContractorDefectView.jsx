import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Calendar, Camera, Check, Image as ImageIcon, MapPin } from 'lucide-react'
import { useAuth } from '@/hooks'
import { getRoleHome } from '@/router/routes'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib'
import SeverityBadge from './SeverityBadge'
import LiftIcon from './LiftIcon'
import {
  CARD, PRIMARY_BUTTON, SECONDARY_BUTTON,
  formatDay, formatDue, formatWhen, isDefectOverdue,
} from './defectFormat'
import {
  acknowledgeDefect, approveDefect, postProgressUpdate, rejectDefect, signOffDefect, useDefects,
} from './defectStore'

// Owner: Jerald
// Features: F03.4-F03.10 defect details, progress, evidence, e-sign, inspector verification, history
// Wireframe: design/screens.md "Defect detail"; visual design: Figma Make "Lift Contractor Defect Spot-Check"
// The contractor's view of /defects/:id - DefectDetailPage shows it to contractors; inspectors and
// admins get Si Qi's DefectRecordPanel instead. (The inspector parts below are kept for later.)
// Uses the shared sample data in defectStore.js for now; will switch to GET /api/defects/{id} (Si Qi)
// and POST /api/defects/{id}/acknowledge, /updates, /signoff, /verify once those exist.

const MAX_NOTE = 300
const MAX_PHOTO_BYTES = 5 * 1024 * 1024

function photoError(file) {
  if (!['image/jpeg', 'image/png'].includes(file.type)) return 'Only JPG and PNG photos are allowed.'
  if (file.size > MAX_PHOTO_BYTES) return 'This file is too large. Maximum size is 5 MB.'
  return ''
}

// ── Small building blocks ─────────────────────────────────────────────────────

function SectionTitle({ title, aside }) {
  return (
    <div className="mb-3.5 flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-bold">{title}</h2>
      {aside && <span className="text-xs font-medium text-[#89939d]">{aside}</span>}
    </div>
  )
}

function InfoRow({ Icon, label, value, danger }) {
  return (
    <div className="mt-2.5 grid grid-cols-[36px_1fr] items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-[#e9f8f6] text-[#138d81]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase text-[#8a949e]">{label}</p>
        <p className={cn('break-words text-sm font-semibold', danger ? 'text-[#c43b3b]' : 'text-[#3a4855]')}>{value}</p>
      </div>
    </div>
  )
}

function PhotoPlaceholder({ label, caption = 'Photo captured by Tan', compact }) {
  return (
    <div
      className={cn(
        'grid place-items-center content-center rounded-[13px] border border-[#dfe6e9] bg-gradient-to-br from-[#14b8a6]/[0.06] to-[#f0f3f4] text-center text-[#6d7e89]',
        compact ? 'h-32' : 'min-h-36 py-6'
      )}
    >
      <ImageIcon className="mb-2 h-8 w-8 text-[#92a2aa]" aria-hidden="true" />
      <span className="text-xs font-bold">{label}</span>
      {!compact && <small className="mt-1 text-[11px] text-[#9ca6ad]">{caption}</small>}
    </div>
  )
}

function FieldError({ id, children }) {
  if (!children) return null
  return (
    <p id={id} role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#c93434]">
      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
      {children}
    </p>
  )
}

function Header({ title, backTo, backLabel, defect }) {
  return (
    <header className="grid min-h-[90px] grid-cols-[40px_1fr_auto] items-center gap-3 bg-[#0b1728] px-4 py-[18px] text-white md:px-10">
      <Link
        to={backTo}
        aria-label={backLabel}
        className="grid h-10 w-10 place-items-center rounded-[11px] border border-white/15 bg-white/[0.07] transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14b8a6]"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      </Link>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8da3b9]">Defect detail</p>
        <h1 className="truncate text-lg font-bold tracking-[-0.03em] md:text-xl">{title}</h1>
      </div>
      {defect && (
        <span className="rounded-full bg-white p-0.5">
          <StatusBadge status={defect.status} dueDate={defect.dueDate} />
        </span>
      )}
    </header>
  )
}

function History({ items }) {
  return (
    <section className={cn(CARD, 'md:p-[22px] lg:col-start-1 lg:row-start-3')}>
      <SectionTitle title="History" aside={`${items.length} ${items.length === 1 ? 'update' : 'updates'}`} />
      <ol>
        {items.map((item, i) => (
          <li key={`${item.at}-${i}`} className="relative grid grid-cols-[16px_1fr] gap-2 pb-[18px] last:pb-0.5">
            {i < items.length - 1 && <span className="absolute bottom-0 left-1 top-2.5 w-px bg-[#dfe5e7]" aria-hidden="true" />}
            <span
              className={cn(
                'relative z-10 mt-1 h-[9px] w-[9px] rounded-full border-2',
                item.tone === 'good' ? 'border-[#27a47d] bg-[#d9f7eb]'
                  : item.tone === 'warn' ? 'border-[#d69c28] bg-[#fff3cb]'
                    : 'border-[#b8c4c9] bg-white'
              )}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="break-words text-[13px] font-semibold text-[#43515d]">{item.title}</p>
              <p className="mt-0.5 text-[11px] text-[#99a2aa]">
                {item.by ? `Posted by ${item.by} · ` : ''}{formatWhen(item.at)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

// ── Action panels (right column on desktop) ───────────────────────────────────

const ACTION_PLACE = 'lg:sticky lg:top-6 lg:col-start-2 lg:row-span-3 lg:row-start-1'

function WaitingCard({ title, text }) {
  return (
    <section className={cn(CARD, 'border-[#cfe6e3] bg-[#f3fbfa] md:p-[22px]', ACTION_PLACE)}>
      <p className="text-sm font-bold text-[#1a655f]">{title}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-[#7e8994]">{text}</p>
    </section>
  )
}

function AcknowledgeCard({ onAcknowledge }) {
  return (
    <section className={cn(CARD, 'text-center md:p-[22px]', ACTION_PLACE)}>
      <Button type="button" onClick={onAcknowledge} className={cn(PRIMARY_BUTTON, 'w-full')}>
        Acknowledge defect
      </Button>
      <p className="mt-2.5 text-[13px] text-[#7e8994]">Acknowledge to let EMS know you've seen this.</p>
    </section>
  )
}

function RepairForm({ defect, userName }) {
  const fileRef = useRef(null)
  const [note, setNote] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [signOffError, setSignOffError] = useState('')
  const needsFirstUpdate = defect.status === 'acknowledged'
  const canSignOff = !needsFirstUpdate && photoUrl && confirmed

  function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    setUploadError('')
    setSignOffError('')
    if (!file) return
    const error = photoError(file)
    if (error) return setUploadError(error)
    setPhotoUrl(URL.createObjectURL(file))
  }

  function postUpdate() {
    if (!note.trim()) return
    postProgressUpdate(defect.id, userName, note.trim())
    setNote('')
  }

  function signOff() {
    if (needsFirstUpdate) return setSignOffError('Post your first update before signing off.')
    if (!photoUrl) return setSignOffError('Add at least one photo of the repair.')
    if (!confirmed) return setSignOffError('Tick the confirmation box to sign off.')
    setSignOffError('')
    signOffDefect(defect.id, userName, photoUrl)
  }

  return (
    <section className={cn(CARD, 'md:p-[22px]', ACTION_PLACE)}>
      <SectionTitle title="Repair update" aside="For inspector" />

      <label htmlFor="work-note" className="mb-2 block text-[13px] font-bold text-[#4e5c68]">Work note</label>
      <div className="relative">
        <textarea
          id="work-note"
          value={note}
          maxLength={MAX_NOTE}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What have you done?"
          className="min-h-[110px] w-full resize-y rounded-xl border border-[#dce2e5] bg-[#f3f5f6] p-3 pb-6 text-base text-[#273541] outline-none transition placeholder:text-[#9aa5ad] focus:border-[#66cfc3] focus:bg-white focus:ring-[3px] focus:ring-[#14b8a6]/10 md:text-sm"
        />
        <span className="pointer-events-none absolute bottom-2.5 right-3 text-[11px] text-[#a0a8af]">
          {note.length}/{MAX_NOTE}
        </span>
      </div>

      <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={handleFile} />
      {photoUrl ? (
        <div className="relative mt-2.5 overflow-hidden rounded-[13px] border border-[#dce4e6] bg-[#f6f8f8]">
          <img src={photoUrl} alt="Repair evidence preview" className="h-[150px] w-full object-cover" />
          <div className="flex items-center justify-between gap-2 px-3 py-1.5">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#30645e]">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[#d1fae5] text-[#08795d]">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              Photo added
            </span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="min-h-11 px-2 text-[13px] font-bold text-[#0b8c80] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14b8a6]"
            >
              Replace
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mt-2.5 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#91bdb8] bg-[#f2fbfa] text-sm font-bold text-[#138b80] transition-colors hover:bg-[#e6f7f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14b8a6]"
        >
          <Camera className="h-5 w-5" aria-hidden="true" />
          + Photo evidence
        </button>
      )}
      <FieldError>{uploadError}</FieldError>

      <label className="my-3 flex min-h-11 cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => { setConfirmed(e.target.checked); setSignOffError('') }}
          className="h-5 w-5 flex-shrink-0 cursor-pointer rounded-md accent-[#14ad9c]"
        />
        <span className="text-[13px] font-semibold text-[#4b5965]">I confirm the work is done</span>
      </label>

      <div className="grid grid-cols-2 gap-2.5">
        <Button type="button" variant="outline" disabled={!note.trim()} onClick={postUpdate} className={SECONDARY_BUTTON}>
          Post update
        </Button>
        <Button
          type="button"
          aria-disabled={!canSignOff}
          aria-describedby={signOffError ? 'signoff-error' : 'signoff-hint'}
          onClick={signOff}
          className={cn(PRIMARY_BUTTON, !canSignOff && 'cursor-not-allowed opacity-50 shadow-none')}
        >
          Sign off
        </Button>
      </div>
      <FieldError id="signoff-error">{signOffError}</FieldError>
      {!canSignOff && !signOffError && (
        <p id="signoff-hint" className="mt-2.5 text-center text-xs text-[#8c969f]">
          {needsFirstUpdate
            ? 'Post your first update, then add a photo and tick the box to sign off'
            : 'Add a photo and tick the box to sign off'}
        </p>
      )}
    </section>
  )
}

function SignedOffCard({ defect }) {
  return (
    <section className={cn(CARD, 'text-center md:p-[22px]', ACTION_PLACE)}>
      <span className="mx-auto mb-2.5 grid h-11 w-11 place-items-center rounded-full bg-[#d1fae5] text-[#08795d]">
        <Check className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="text-base font-bold">Repair signed off</h2>
      <p className="mb-3.5 mt-1 text-[13px] text-[#7e8994]">Waiting for the inspector to verify.</p>
      {defect.evidenceUrl
        ? <img src={defect.evidenceUrl} alt="Repair evidence" className="h-[170px] w-full rounded-[13px] object-cover" />
        : <PhotoPlaceholder label="Repair evidence" caption="Uploaded by the contractor" />}
    </section>
  )
}

function VerifyPanel({ defect, userName }) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState(false)

  function reject() {
    if (!reason.trim()) return setReasonError(true)
    rejectDefect(defect.id, userName, reason.trim())
  }

  return (
    <section className={cn(CARD, 'md:p-[22px]', ACTION_PLACE)}>
      <SectionTitle title="Verify repair" aside={`Submitted by ${defect.contractorName}`} />
      <div className="mb-3.5 grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1.5 ml-0.5 text-xs font-bold text-[#63707b]">Before</p>
          <PhotoPlaceholder label="Before" compact />
        </div>
        <div>
          <p className="mb-1.5 ml-0.5 text-xs font-bold text-[#63707b]">After</p>
          {defect.evidenceUrl
            ? <img src={defect.evidenceUrl} alt="Repair after" className="h-32 w-full rounded-[11px] object-cover" />
            : <PhotoPlaceholder label="After" compact />}
        </div>
      </div>

      {rejecting ? (
        <div className="border-t border-[#edf0f2] pt-3.5">
          <label htmlFor="reject-reason" className="mb-2 block text-[13px] font-bold text-[#4e5c68]">Reason for rejection</label>
          <textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => { setReason(e.target.value); setReasonError(false) }}
            placeholder="Tell the contractor what needs attention"
            aria-invalid={reasonError}
            aria-describedby={reasonError ? 'reason-error' : undefined}
            className={cn(
              'min-h-[90px] w-full resize-y rounded-xl border bg-[#f3f5f6] p-3 text-base text-[#273541] outline-none transition focus:bg-white focus:ring-[3px] md:text-sm',
              reasonError ? 'border-[#df5a5a] focus:ring-[#df5a5a]/10' : 'border-[#dce2e5] focus:border-[#66cfc3] focus:ring-[#14b8a6]/10'
            )}
          />
          <FieldError id="reason-error">{reasonError && 'A reason is required to reject a repair.'}</FieldError>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <Button type="button" variant="outline" onClick={() => setRejecting(false)} className={SECONDARY_BUTTON}>Cancel</Button>
            <Button type="button" onClick={reject} className="h-12 rounded-xl bg-[#ce3f3f] text-sm font-bold text-white hover:bg-[#b83535] focus-visible:ring-[#ce3f3f]">
              Reject repair
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => setRejecting(true)}
            className="h-12 rounded-xl border-[#dc5a5a] bg-white text-sm font-bold text-[#b82929] hover:bg-[#fff5f5] hover:text-[#b82929] focus-visible:ring-[#dc5a5a]"
          >
            Reject
          </Button>
          <Button type="button" onClick={() => approveDefect(defect.id, userName)} className={PRIMARY_BUTTON}>
            <Check aria-hidden="true" /> Approve
          </Button>
        </div>
      )}
    </section>
  )
}

function ActionPanel({ defect, isContractor, userName }) {
  const { status } = defect
  if (isContractor) {
    if (status === 'open') return <AcknowledgeCard onAcknowledge={() => acknowledgeDefect(defect.id, userName)} />
    if (status === 'acknowledged' || status === 'in_progress') return <RepairForm key={defect.id} defect={defect} userName={userName} />
    if (status === 'pending_verification') return <SignedOffCard defect={defect} />
    return null
  }
  if (status === 'open') return <WaitingCard title="Waiting for contractor" text={`${defect.contractorName} has not acknowledged this defect yet.`} />
  if (status === 'acknowledged' || status === 'in_progress') return <WaitingCard title="Repair in progress" text={`${defect.contractorName} is working on this defect.`} />
  if (status === 'pending_verification') return <VerifyPanel key={defect.id} defect={defect} userName={userName} />
  return null
}

// For inspectors and admins: Jerald's verification actions, shown under Si Qi's DefectRecordPanel
// on the Defect detail page (Verify repair with Approve/Reject, or where the repair is up to).
export function DefectActions({ id }) {
  const { user } = useAuth()
  const defects = useDefects()
  const defect = defects.find((d) => String(d.id) === String(id))
  if (!defect) return null

  return (
    <section aria-label="Repair and verification" className="mx-auto max-w-5xl px-4 pb-6 text-[#15202e] md:px-6">
      {defect.status === 'closed'
        ? <WaitingCard title="Repair verified" text="This defect is closed. No further action is needed." />
        : <ActionPanel defect={defect} isContractor={false} userName={user?.name ?? 'Inspector'} />}
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ContractorDefectView() {
  const { id } = useParams()
  const { user } = useAuth()
  const defects = useDefects()
  const isContractor = user?.role === 'contractor'
  // Contractors only see their own company's defects; anything else reads as not found.
  const defect = defects.find((d) => String(d.id) === id && (!isContractor || d.contractorId === user?.contractorId))

  const userName = user?.name ?? (isContractor ? 'Contractor' : 'Inspector')
  const backTo = getRoleHome(user?.role)
  const backLabel = isContractor ? 'Back to inbox' : 'Back'

  if (!defect) {
    return (
      <div className="flex min-h-full flex-col bg-[#f7f9fa] text-[#15202e]">
        <Header title={`Defect ${id}`} backTo={backTo} backLabel={backLabel} />
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-lg font-bold">We couldn't find this defect.</p>
          <p className="mt-1 text-[13px] text-[#7d8892]">It may have been removed, or the link is wrong.</p>
          <Link to={backTo} className={cn(PRIMARY_BUTTON, 'mt-6 inline-flex w-full max-w-[280px] items-center justify-center')}>
            {isContractor ? 'Back to inbox' : 'Go back'}
          </Link>
        </main>
      </div>
    )
  }

  const overdue = isDefectOverdue(defect)
  const lastReview = defect.history.find((h) => h.tone === 'warn' || h.title.startsWith('Signed off'))
  const approval = defect.history.find((h) => h.tone === 'good')

  return (
    <div className="flex min-h-full flex-col bg-[#f7f9fa] text-[#15202e]">
      <Header title={defect.code} backTo={backTo} backLabel={backLabel} defect={defect} />

      <main className="grid flex-1 content-start gap-3 px-4 pb-10 pt-4 md:px-10 md:pb-14 md:pt-7">
        {defect.status === 'in_progress' && lastReview?.tone === 'warn' && (
          <div role="status" className="flex flex-col gap-1 rounded-[14px] border border-[#f2d17c] bg-[#fff8df] px-3.5 py-3 text-[#825512]">
            <strong className="text-sm">Repair needs attention</strong>
            <span className="text-[13px] leading-snug">{lastReview.title}</span>
          </div>
        )}

        {defect.status === 'closed' && (
          <div role="status" className="flex gap-3 rounded-[14px] border border-[#bce7d5] bg-[#effcf6] p-3.5 text-[#17664e]">
            <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-[#d1fae5] text-[#08795d]">
              <Check className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <strong className="text-sm">{approval?.title ?? 'Approved'}</strong>
              <p className="mt-0.5 text-[13px] text-[#55907d]">This defect is closed. No further action is needed.</p>
            </div>
          </div>
        )}

        <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] lg:gap-x-6 lg:gap-y-[18px]">
          <section className={cn(CARD, 'md:p-[22px] lg:col-start-1 lg:row-start-1')}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <SeverityBadge severity={defect.severity} />
              <span className="text-xs font-medium text-[#89939d]">Reported {formatDay(new Date(defect.reportedAt))}</span>
            </div>
            <h2 className="mb-4 break-words text-[22px] font-semibold leading-tight tracking-[-0.03em] text-[#14202e] md:text-[26px]">
              {defect.description}
            </h2>
            <InfoRow Icon={LiftIcon} label="Lift" value={defect.liftCode} />
            <InfoRow Icon={MapPin} label="Location" value={defect.address} />
            <InfoRow Icon={Calendar} label="Due date" value={formatDue(defect.dueDate, defect.dueTime)} danger={overdue} />
          </section>

          <section className={cn(CARD, 'md:p-[22px] lg:col-start-1 lg:row-start-2')}>
            <SectionTitle title="Inspector photo" aside="Before repair" />
            <PhotoPlaceholder label={defect.photoLabel} />
          </section>

          <ActionPanel defect={defect} isContractor={isContractor} userName={userName} />

          <History items={defect.history} />
        </div>
      </main>
    </div>
  )
}

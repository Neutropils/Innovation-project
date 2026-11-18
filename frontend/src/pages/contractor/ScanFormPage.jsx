import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Camera, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib'
import LiftIcon from './LiftIcon'
import { CARD, PRIMARY_BUTTON, SECONDARY_BUTTON } from './defectFormat'

// Owner: Jerald
// Feature: F05.7 scan paper inspection forms (P2) - the scan pre-fills results the user confirms
// Visual design: Figma Make "Lift Contractor Defect Spot-Check" (Scan paper form)
// Prototype only: "scanning" waits 2 seconds and shows sample results. No file leaves the browser.
// Route: /scan (contractor only), sidebar entry "Scan form" under Inbox.

const MAX_BYTES = 5 * 1024 * 1024
const FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const LIFTS = ['LIFT-0427', 'LIFT-0311', 'LIFT-0298']
const SECTIONS = ['Motor room', 'Lift car', 'Hoistway and pit']

// Sample "read" results from the Figma prototype. needsCheck = the scan wasn't sure.
const SAMPLE_RESULTS = [
  { id: 'brake',       section: 'Motor room',       label: 'Machine brake',      answer: 'Defect' },
  { id: 'controller',  section: 'Motor room',       label: 'Controller panel',   answer: 'Pass', needsCheck: true },
  { id: 'governor',    section: 'Motor room',       label: 'Overspeed governor', answer: 'Pass' },
  { id: 'ventilation', section: 'Motor room',       label: 'Room ventilation',   answer: 'Pass' },
  { id: 'door-sensor', section: 'Lift car',         label: 'Door sensor',        answer: 'Defect' },
  { id: 'alarm',       section: 'Lift car',         label: 'Emergency alarm',    answer: 'Pass' },
  { id: 'indicator',   section: 'Lift car',         label: 'Floor indicator',    answer: 'Pass', needsCheck: true },
  { id: 'lighting',    section: 'Lift car',         label: 'Car lighting',       answer: 'Pass' },
  { id: 'ropes',       section: 'Hoistway and pit', label: 'Suspension ropes',   answer: 'Pass' },
  { id: 'buffers',     section: 'Hoistway and pit', label: 'Pit buffers',        answer: 'Pass' },
  { id: 'switches',    section: 'Hoistway and pit', label: 'Limit switches',     answer: 'Pass' },
  { id: 'pit',         section: 'Hoistway and pit', label: 'Pit condition',      answer: 'Defect', needsCheck: true },
]

function fileError(file) {
  if (!FILE_TYPES.includes(file.type)) return 'Only JPG, PNG and PDF files are allowed.'
  if (file.size > MAX_BYTES) return 'This file is too large. Maximum size is 5 MB.'
  return ''
}

function Header({ title, onBack, backTo }) {
  const backClass = 'grid h-10 w-10 place-items-center rounded-[11px] border border-white/15 bg-white/[0.07] transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14b8a6]'
  return (
    <header className="grid min-h-[90px] grid-cols-[40px_1fr] items-center gap-3 bg-[#0b1728] px-4 py-[18px] text-white md:px-10">
      {onBack
        ? <button type="button" onClick={onBack} aria-label="Back to upload" className={backClass}><ArrowLeft className="h-5 w-5" aria-hidden="true" /></button>
        : <Link to={backTo} aria-label="Back to inbox" className={backClass}><ArrowLeft className="h-5 w-5" aria-hidden="true" /></Link>}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8da3b9]">Paper inspection</p>
        <h1 className="truncate text-lg font-bold tracking-[-0.03em] md:text-xl">{title}</h1>
      </div>
    </header>
  )
}

function Eyebrow({ children }) {
  return <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7b8793]">{children}</p>
}

// ── Step 1: upload ────────────────────────────────────────────────────────────

function UploadStep({ file, setFile, lift, setLift, onScan }) {
  const inputRef = useRef(null)
  const [error, setError] = useState('')

  function handleFile(e) {
    const picked = e.target.files?.[0]
    e.target.value = ''
    if (!picked) return
    const problem = fileError(picked)
    setError(problem)
    setFile(problem ? null : picked)
  }

  function scan() {
    if (!file) return setError('Add a photo or PDF of the form first.')
    onScan()
  }

  return (
    <main className="mx-auto w-full max-w-[760px] flex-1 px-4 pb-10 pt-6 md:px-10 md:pt-9">
      <Eyebrow>Digitise an inspection</Eyebrow>
      <h2 className="text-[22px] tracking-[-0.03em] text-[#172432] md:text-[26px]">Upload the completed form</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-[#7d8993]">Make sure the full page is visible and the answers are in focus.</p>

      <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={handleFile} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-describedby={error ? 'scan-error' : undefined}
        className={cn(
          'mt-5 flex min-h-[210px] w-full flex-col items-center justify-center gap-2 rounded-[18px] border-[1.5px] border-dashed p-6 text-center text-[#344e4c] transition-colors md:min-h-[260px]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14b8a6]',
          error ? 'border-[#e16767] bg-[#fffafa]' : 'border-[#8bc8c1] bg-white bg-gradient-to-br from-[#14b8a6]/[0.06] via-white to-white hover:border-[#14b8a6]'
        )}
      >
        <span className="mb-1 grid h-[52px] w-[52px] place-items-center rounded-[11px] bg-gradient-to-br from-[#17bea9] to-[#0d9f91] text-white">
          {file?.type === 'application/pdf' ? <FileText className="h-6 w-6" aria-hidden="true" /> : <Camera className="h-6 w-6" aria-hidden="true" />}
        </span>
        <strong className="max-w-[260px] text-sm leading-snug">
          {file ? 'Form added - tap to change it' : 'Take a photo or upload your paper inspection form'}
        </strong>
        <span className="max-w-full break-all text-xs text-[#87949d]">{file ? file.name : 'JPG, PNG or PDF · Maximum 5 MB'}</span>
      </button>
      {error && (
        <p id="scan-error" role="alert" className="mx-1 mt-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-[#c93434]">
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <label htmlFor="scan-lift" className="mb-2 ml-0.5 mt-5 block text-[13px] font-bold text-[#52606b]">Lift</label>
      <div className="flex min-h-12 items-center gap-2.5 rounded-xl border border-[#dce2e5] bg-[#eef2f3] px-3 text-[#158c81] focus-within:border-[#66cfc3] focus-within:ring-[3px] focus-within:ring-[#14b8a6]/10">
        <LiftIcon className="flex-shrink-0" />
        <select
          id="scan-lift"
          value={lift}
          onChange={(e) => setLift(e.target.value)}
          className="h-12 w-full cursor-pointer bg-transparent text-base font-bold text-[#34414d] outline-none md:text-sm"
        >
          {LIFTS.map((code) => <option key={code}>{code}</option>)}
        </select>
      </div>

      <Button type="button" onClick={scan} className={cn(PRIMARY_BUTTON, 'mt-5 w-full gap-2')}>
        <Camera className="h-5 w-5" aria-hidden="true" />
        Scan form
      </Button>
      <button
        type="button"
        onClick={() => { setFile(null); setError("We couldn't read this form. Retake the photo in better light.") }}
        className="mx-auto mt-3 block min-h-11 px-3 text-xs font-semibold text-[#71808b] underline underline-offset-[3px] hover:text-[#4e5b67]"
      >
        Simulate blurry photo
      </button>
    </main>
  )
}

// ── Step 2: reading ───────────────────────────────────────────────────────────

function ReadingStep() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-10 text-center" role="status">
      <span className="mb-[18px] h-[52px] w-[52px] animate-spin rounded-full border-4 border-[#d6f4f0] border-t-[#14ad9c] motion-reduce:animate-none" aria-hidden="true" />
      <h2 className="text-[22px] tracking-[-0.03em] text-[#172432]">Reading form...</h2>
      <p className="mt-2 text-[13px] text-[#7d8993]">Finding checklist answers and handwritten notes.</p>
    </main>
  )
}

// ── Step 3: review ────────────────────────────────────────────────────────────

function ReviewStep({ lift, results, setAnswer, onConfirm, onRetake }) {
  const toCheck = results.filter((r) => r.needsCheck).length

  return (
    <main className="flex-1 px-4 pb-10 pt-6 md:px-10 md:pt-9">
      <div className="mx-auto max-w-[1240px]">
        <Eyebrow>Scanned inspection</Eyebrow>
        <h2 className="text-[21px] tracking-[-0.03em] text-[#172432] md:text-[26px]">{lift} - Review scanned results</h2>
        <p className="mt-2 text-[13px] text-[#7d8993]">Check the answers below before submitting.</p>

        {toCheck > 0 && (
          <div role="status" className="mt-4 flex flex-col gap-1 rounded-[13px] border border-[#f0cf7d] bg-[#fff8df] px-3.5 py-3 text-[#805311]">
            <strong className="text-sm">Some answers need your help</strong>
            <span className="text-[13px] leading-snug">
              {toCheck} {toCheck === 1 ? "item wasn't" : "items weren't"} read clearly. Please check {toCheck === 1 ? 'it' : 'them'} and pick the right answer.
            </span>
          </div>
        )}

        <div className="mx-0.5 mb-3 mt-4 flex gap-4 text-[13px] text-[#71808b]">
          <span><strong className="text-base text-[#24323e]">{results.length - toCheck}</strong> read</span>
          <span><strong className="text-base text-[#24323e]">{toCheck}</strong> need checking</span>
        </div>

        <div className="grid gap-3 lg:grid-cols-3 lg:gap-[18px]">
          {SECTIONS.map((section) => (
            <section key={section} className={cn(CARD, 'overflow-hidden p-0')}>
              <h3 className="border-b border-[#e8edef] bg-[#f5f8f8] px-3.5 py-3 text-sm font-bold text-[#263441]">{section}</h3>
              <ul>
                {results.filter((r) => r.section === section).map((item) => (
                  <li key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-2.5 border-b border-[#edf0f1] px-3.5 py-3 last:border-b-0">
                    <div className="min-w-0">
                      <p className="mb-1.5 text-[13px] font-bold text-[#41505c]">{item.label}</p>
                      <div className="flex flex-wrap gap-1">
                        <span className="rounded-[5px] bg-[#edf1f2] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#687680]">From scan</span>
                        {item.needsCheck && (
                          <span className="rounded-[5px] bg-[#fef0bd] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#8b5b08]">Check this</span>
                        )}
                      </div>
                    </div>
                    <div role="group" aria-label={`${item.label} result`} className="grid grid-cols-2 gap-0.5 rounded-[9px] bg-[#edf1f2] p-0.5">
                      {['Pass', 'Defect'].map((answer) => {
                        const active = item.answer === answer
                        return (
                          <button
                            key={answer}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setAnswer(item.id, answer)}
                            className={cn(
                              'min-h-11 min-w-[60px] rounded-[7px] px-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14b8a6]',
                              !active && 'text-[#87929b] hover:text-[#4e5b67]',
                              active && answer === 'Pass' && 'bg-[#d8f7e9] text-[#08795d] shadow-[0_1px_3px_rgba(20,50,43,0.1)]',
                              active && answer === 'Defect' && 'bg-[#ffead3] text-[#a44d0e] shadow-[0_1px_3px_rgba(60,38,20,0.1)]'
                            )}
                          >
                            {answer}
                          </button>
                        )
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-4 grid gap-2.5 md:mt-5 md:grid-cols-2">
          <Button type="button" onClick={onConfirm} className={cn(PRIMARY_BUTTON, 'w-full')}>Confirm and continue</Button>
          <Button type="button" variant="outline" onClick={onRetake} className={cn(SECONDARY_BUTTON, 'w-full')}>Retake photo</Button>
        </div>
      </div>
    </main>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ScanFormPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState('upload') // upload -> reading -> review
  const [file, setFile] = useState(null)
  const [lift, setLift] = useState(LIFTS[0])
  const [results, setResults] = useState(SAMPLE_RESULTS)

  // Pretend to read the form, then show the sample results.
  useEffect(() => {
    if (step !== 'reading') return undefined
    const timer = setTimeout(() => setStep('review'), 2000)
    return () => clearTimeout(timer)
  }, [step])

  function setAnswer(id, answer) {
    setResults((prev) => prev.map((r) => (r.id === id ? { ...r, answer, needsCheck: false } : r)))
  }

  function retake() {
    setFile(null)
    setResults(SAMPLE_RESULTS)
    setStep('upload')
  }

  return (
    <div className="flex min-h-full flex-col bg-[#f7f9fa] text-[#15202e]">
      <Header
        title={step === 'review' ? 'Review scanned results' : 'Scan paper form'}
        backTo="/inbox"
        onBack={step === 'review' ? retake : undefined}
      />
      {step === 'upload' && <UploadStep file={file} setFile={setFile} lift={lift} setLift={setLift} onScan={() => setStep('reading')} />}
      {step === 'reading' && <ReadingStep />}
      {step === 'review' && (
        <ReviewStep lift={lift} results={results} setAnswer={setAnswer} onConfirm={() => navigate('/inbox')} onRetake={retake} />
      )}
    </div>
  )
}

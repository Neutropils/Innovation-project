import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useFormik } from 'formik'
import {
  AlertCircle, ArrowRight, ArrowUpDown, ClipboardCheck, Eye, EyeOff,
  HardHat, Loader2, Lock, Mail, ShieldCheck, Wrench,
} from 'lucide-react'
import { useAuth } from '@/hooks'
import { getRoleHome } from '@/router/routes'
import { loginSchema } from '@/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import LiftIllustration from './LiftIllustration'

const HIGHLIGHTS = [
  { Icon: ClipboardCheck, title: 'Digital spot-checks', text: 'Checklists pre-filled from the lift register' },
  { Icon: Wrench,         title: 'Defect tracking',     text: 'Assign, rectify and verify with due dates' },
  { Icon: ShieldCheck,    title: 'Audit trail',         text: 'Every sign-off is timestamped and attributed' },
]

const ROLES = [
  { Icon: HardHat,     label: 'Inspectors' },
  { Icon: Wrench,      label: 'Contractors' },
  { Icon: ShieldCheck, label: 'Admins' },
]

// Turns an Axios error from POST /auth/login into a message the user can act on.
function loginErrorMessage(err) {
  if (!err.response) return 'Cannot reach the server. Check your connection and try again.'
  const { status, data } = err.response
  if (status === 401) return 'Incorrect email or password.'
  if (status === 403 || status === 422) return data?.message || 'You cannot sign in with this account.'
  return 'Something went wrong on our side. Please try again.'
}

function Field({ id, label, error, Icon, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <Icon
          className={cn(
            'pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors',
            error ? 'text-destructive' : 'text-slate-400'
          )}
          aria-hidden="true"
        />
        {children}
      </div>
      {error && (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

const inputClass = (error) => cn(
  'h-12 rounded-xl border-slate-200 bg-slate-50 pl-12 text-base md:text-base shadow-sm transition',
  'focus-visible:bg-white focus-visible:ring-teal-500 focus-visible:ring-offset-0 focus-visible:border-teal-500',
  error && 'border-destructive bg-red-50/50 focus-visible:ring-destructive focus-visible:border-destructive'
)

// High-fidelity, mobile-first sign-in screen (F03.1, F06.1, F06.2, F07.1).
// Phones (from 390px): dark hero with illustration over a white bottom sheet.
// md and up: split screen with the product story on the left and the form on the right.
export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [serverError, setServerError] = useState('')

  const formik = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema: loginSchema,
    onSubmit: async (values) => {
      setServerError('')
      try {
        const signedIn = await login(values.email.trim(), values.password)
        const from = location.state?.from?.pathname
        navigate(from || getRoleHome(signedIn?.role), { replace: true })
      } catch (err) {
        setServerError(loginErrorMessage(err))
      }
    },
  })

  if (user) return <Navigate to={getRoleHome(user.role)} replace />

  const fieldError = (name) => (formik.touched[name] && formik.errors[name]) || ''
  const emailError = fieldError('email')
  const passwordError = fieldError('password')
  const detectCapsLock = (e) => setCapsLock(Boolean(e.getModifierState?.('CapsLock')))

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#0B1220] md:grid md:grid-cols-2">
      {/* ── Backdrop: blueprint grid + glows ─────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-teal-500/25 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute top-40 -left-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl md:top-auto md:bottom-0" aria-hidden="true" />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col px-6 pt-[max(1.75rem,env(safe-area-inset-top))] pb-8 text-white md:justify-between md:px-12 md:py-12 lg:px-16">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg shadow-teal-500/30">
            <ArrowUpDown className="h-5 w-5 text-white" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-300">EMS Services</p>
            <p className="text-lg font-semibold leading-tight tracking-tight">Lift Spot-Check</p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4 md:mt-0 md:flex-col md:items-start md:gap-8">
          <LiftIllustration className="h-28 w-auto flex-shrink-0 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-700 md:h-56 lg:h-64" />
          <div>
            <p className="text-xl font-semibold leading-snug tracking-tight md:text-4xl md:leading-tight">
              Safer lifts,<br className="hidden md:block" /> <span className="text-teal-300">checked properly.</span>
            </p>
            <p className="mt-2 hidden max-w-md text-base text-slate-300 md:block">
              Inspect, record defects, track contractor repairs and verify sign-off - all from your phone on site.
            </p>
          </div>
        </div>

        <ul className="hidden space-y-4 md:block">
          {HIGHLIGHTS.map(({ Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                <Icon className="h-4 w-4 text-teal-300" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-sm text-slate-400">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Form: bottom sheet on phones, panel on desktop ───────────────────── */}
      <main className="relative flex flex-1 flex-col rounded-t-[28px] bg-white px-6 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.5)] motion-safe:animate-in motion-safe:slide-in-from-bottom-8 motion-safe:fade-in motion-safe:duration-500 md:min-h-0 md:items-center md:justify-center md:rounded-none md:px-12 md:py-12 md:shadow-none">
        <div className="mx-auto mb-6 h-1.5 w-10 rounded-full bg-slate-200 md:hidden" aria-hidden="true" />

        <div className="w-full md:max-w-sm">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-slate-900">Sign in</h1>
          <p className="mt-1.5 text-[15px] text-slate-500">
            Welcome back. Use the account issued by your EMS administrator.
          </p>

          <div className="mt-4 flex flex-wrap gap-2" aria-label="Who can sign in">
            {ROLES.map(({ Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                <Icon className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>

          {serverError && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={formik.handleSubmit} noValidate className="mt-6 space-y-5">
            <Field id="email" label="Email" error={emailError} Icon={Mail}>
              <Input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="name@company.com"
                className={inputClass(emailError)}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'email-error' : undefined}
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
            </Field>

            <Field id="password" label="Password" error={passwordError} Icon={Lock}>
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                className={cn(inputClass(passwordError), 'pr-12')}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? 'password-error' : capsLock ? 'caps-lock' : undefined}
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={(e) => { formik.handleBlur(e); setCapsLock(false) }}
                onKeyUp={detectCapsLock}
                onKeyDown={detectCapsLock}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </Field>
            {capsLock && !passwordError && (
              <p id="caps-lock" className="-mt-3 text-sm text-amber-600">Caps Lock is on.</p>
            )}

            <Button
              type="submit"
              disabled={formik.isSubmitting}
              className="group h-12 w-full rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-base font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:from-teal-700 hover:to-teal-600 active:scale-[0.99] focus-visible:ring-teal-500"
            >
              {formik.isSubmitting
                ? <><Loader2 className="animate-spin" aria-hidden="true" />Signing in...</>
                : <>Sign in<ArrowRight className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></>}
            </Button>
          </form>

          <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">
            Forgotten your password? Ask your EMS administrator to reset it.
          </div>
        </div>

        <p className="mt-auto flex items-center justify-center gap-1.5 pt-8 text-xs text-slate-400 md:absolute md:bottom-6 md:left-0 md:right-0 md:mt-0 md:pt-0">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Secure, role-based access for EMS lift operations
        </p>
      </main>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useFormik } from 'formik'
import {
  AlertCircle, ArrowRight, Eye, EyeOff,
  FlaskConical, HelpCircle, Loader2, Lock, Mail, ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/hooks'
import { getRoleHome } from '@/router/routes'
import { loginSchema } from '@/schemas'
import StarBorder from '@/components/StarBorder'
import WaveLines from '@/components/WaveLines'
import { DEMO_ACCOUNTS, DEMO_PASSWORD, DEMO_SCENARIOS, PROTOTYPE } from '@/prototype/mockApi'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { themeColor } from '@/lib/theme'
import LiftLogo from '@/components/LiftLogo'
import LiftDoors from './LiftDoors'

// The lift waits at G with its doors shut, then they open.
const DOORS_OPEN_DELAY_MS = 500
const DOORS_OPEN_MS = 1400   // keep in sync with OPEN_MS in LiftDoors.jsx

// No animation for reduced-motion users, or where motion can't be detected (tests).
const skipLiftAnimation = () =>
  typeof window === 'undefined' ||
  typeof window.matchMedia !== 'function' ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Turns an Axios error from POST /auth/login into a message the user can act on.
function loginErrorMessage(err) {
  if (!err.response) return 'Cannot reach the server. Check your connection and try again.'
  const { status, data } = err.response
  if (status === 401) return 'Incorrect email or password.'
  if (status === 403 || status === 422) return data?.message || 'You cannot sign in with this account.'
  // A 5xx with no API error code came from a proxy or gateway, not our API - the API is down.
  if (status >= 500 && !data?.code) return 'Cannot reach the server. Check your connection and try again.'
  return 'Something went wrong on our side. Please try again.'
}

function Field({ id, label, error, Icon, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground/80">{label}</label>
      <div className="relative">
        <Icon
          className={cn(
            'pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors',
            error ? 'text-destructive' : 'text-muted-foreground/80'
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
  'h-12 rounded-xl border-border bg-background pl-12 dark:border-foreground/10 dark:bg-background/60 text-base md:text-base text-foreground placeholder:text-muted-foreground/70 transition',
  'hover:border-foreground/20 focus-visible:border-primary focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-primary/25 focus-visible:ring-offset-0',
  // Browser autofill paints inputs light - keep them dark with readable text
  'caret-foreground autofill:shadow-[inset_0_0_0_1000px_hsl(var(--background))] autofill:[-webkit-text-fill-color:hsl(var(--foreground))] autofill:[transition:background-color_9999s]',
  error && 'border-destructive/60 bg-destructive/10 focus-visible:border-destructive focus-visible:ring-destructive/15'
)

// Lift car interior: soft ceiling light over a plain back wall.
// Purely decorative, drawn behind the form.
function CarInterior() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {/* Back wall */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--background))_100%)]" />
      {/* Ceiling light and the pool of light it casts */}
      <div className="absolute left-1/2 top-3 h-0.5 w-1/3 -translate-x-1/2 rounded-full bg-white shadow-[0_0_14px_3px_hsl(var(--primary)/0.45)] dark:bg-foreground/80 dark:shadow-[0_0_16px_3px_hsl(var(--primary)/0.9)]" />
      <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,hsl(var(--primary)/0.1),transparent_70%)] dark:bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,hsl(var(--primary)/0.35),transparent_70%)]" />
      {/* Sill */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-foreground/10" />
    </div>
  )
}

// Solid triangle for the lift direction lamps (CSS borders, no icon - chevrons read as a dropdown).
function Lamp({ up, lit }) {
  return (
    <span
      className={cn(
        'h-0 w-0 border-x-[5px] border-x-transparent transition-colors duration-300',
        up ? 'border-b-[6px]' : 'border-t-[6px]',
        lit
          ? (up ? 'border-b-[#FFCB9A]' : 'border-t-[#FFCB9A]') + ' drop-shadow-[0_0_4px_rgba(255,203,154,0.9)]'
          : (up ? 'border-b-white/20' : 'border-t-white/20')
      )}
    />
  )
}

// LED floor display in the lift header: up/down lamps beside a glowing floor number.
// Not interactive, so it uses a recessed screen look rather than a button-like border.
function FloorIndicator({ floor, arrived }) {
  return (
    <div
      role="status"
      className="flex h-10 items-center gap-2 rounded-lg bg-[hsl(180_30%_6%)] px-2.5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.9),inset_0_0_0_1px_rgba(255,255,255,0.04)]"
      aria-label={arrived ? 'Lift has arrived' : `Lift at floor ${floor}`}
    >
      <span className="flex flex-col items-center gap-[3px]" aria-hidden="true">
        <Lamp up lit={false} />
        <Lamp lit={!arrived} />
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'min-w-[1.25ch] text-center font-mono text-xl font-bold tabular-nums leading-none transition-all',
          arrived ? 'text-[#FFCB9A] [text-shadow:0_0_10px_rgba(255,203,154,0.8)]' : 'text-[#FFCB9A]/80 [text-shadow:0_0_6px_rgba(255,203,154,0.5)]'
        )}
      >
        {floor}
      </span>
    </div>
  )
}

// Prototype-only helper: one tap fills a demo login or an error scenario.
function DemoPanel({ onPick }) {
  const chip = 'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors active:scale-95'
  return (
    <section
      aria-labelledby="demo-heading"
      className="mt-3 rounded-2xl border border-dashed border-foreground/20 bg-card/70 dark:border-foreground/15 dark:bg-card/60 px-3.5 py-3 backdrop-blur motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
    >
      <h2 id="demo-heading" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <FlaskConical className="h-3.5 w-3.5 text-foreground/70" aria-hidden="true" />
        Prototype demo
      </h2>
      <p className="mt-0.5 text-[11px] text-muted-foreground/80">Tap to fill, then Sign in. Password {DEMO_PASSWORD}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {DEMO_ACCOUNTS.map((a) => (
          <button key={a.email} type="button" onClick={() => onPick(a.email, DEMO_PASSWORD)}
            className={cn(chip, 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 dark:border-primary dark:bg-primary/30 dark:text-foreground dark:hover:bg-primary/50')}>
            {a.label}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {DEMO_SCENARIOS.map((s) => (
          <button key={s.label} type="button" onClick={() => onPick(s.email, s.password)}
            className={cn(chip, 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20')}>
            {s.label}
          </button>
        ))}
      </div>
    </section>
  )
}

// Mobile-first sign-in screen (F03.1, F06.1, F06.2, F07.1).
// The sign-in card is a lift parked at G. Its doors open mechanically (see LiftDoors)
// to reveal the email and password fields. That is the only animation on the page.
export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [skipAnimation] = useState(skipLiftAnimation)
  const [doors, setDoors] = useState(skipAnimation ? 'open' : 'closed')   // closed -> opening -> open
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [serverError, setServerError] = useState('')

  // Short pause so the closed doors register, then they open.
  useEffect(() => {
    if (skipAnimation) return undefined
    const timers = [
      setTimeout(() => setDoors((d) => (d === 'closed' ? 'opening' : d)), DOORS_OPEN_DELAY_MS),
      // Backstop: remove the doors even if the browser never reports the animation finished
      setTimeout(() => setDoors('open'), DOORS_OPEN_DELAY_MS + DOORS_OPEN_MS + 400),
    ]
    return () => timers.forEach(clearTimeout)
  }, [skipAnimation])

  // One click/tap on the lift skips straight to the open form (not while signing in).
  function skipArrival() {
    if (doors === 'open' || formik.isSubmitting) return
    setDoors('open')
  }

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
  const isOpen = doors === 'open'

  function fillDemo(email, password) {
    setServerError('')
    formik.resetForm({ values: { email, password } })
  }

  return (
    <div className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      {/* ── Backdrop: teal wave lines and a teal glow above ── */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <WaveLines className="absolute inset-0 h-full w-full" />
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl dark:bg-primary/40" />
      </div>

      {/* ── Lift: lower part of the screen on phones, centred on larger screens ── */}
      <main className="flex flex-1 flex-col justify-end px-4 pt-[5vh] pb-[max(1rem,env(safe-area-inset-bottom))] md:items-center md:justify-center md:pt-[18vh] md:pb-10">
        <div
          onClick={skipArrival}
          title={doors === 'open' ? undefined : 'Tap to skip'}
          className={cn(
            'relative w-full rounded-3xl border border-border dark:border-foreground/10 bg-card/90 p-3 shadow-[0_24px_60px_-24px_hsl(var(--primary)/0.35)] dark:bg-card/80 dark:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl md:max-w-md',
            doors !== 'open' && 'cursor-pointer'
          )}
        >
          {/* Lift header: brand + floor display */}
          <div className="flex items-center justify-between gap-3 px-2 pt-1 pb-3">
            <div className="flex items-center gap-3">
              <LiftLogo className="h-10 w-10 flex-shrink-0" title="" />
              <div>
                <p className="text-lg font-bold leading-none tracking-tight">Elev<span className="text-accent">8</span></p>
                <p className="mt-1 text-xs text-muted-foreground">EMS Services</p>
              </div>
            </div>
            <FloorIndicator floor="G" arrived />
          </div>

          {/* Doorway: the form sits behind the doors */}
          <div className="relative overflow-hidden rounded-2xl border border-border px-4 dark:border-foreground/5 pt-8 pb-5 shadow-[inset_0_8px_24px_hsl(var(--primary)/0.08)] dark:shadow-[inset_0_10px_30px_rgba(0,0,0,0.55)] sm:px-6">
            <CarInterior />
            <div className={cn(
              'relative transition-all duration-700',
              isOpen ? 'opacity-100 scale-100' : 'opacity-40 scale-[0.97]'
            )}>
              <div className="flex flex-col items-center text-center">
                <h1 className="text-[26px] font-bold leading-tight tracking-tight">Sign in</h1>
                <p className="mt-2 max-w-[17rem] text-sm text-muted-foreground">Use the account issued by your EMS administrator.</p>
              </div>

              {serverError && (
                <div
                  role="alert"
                  className="mt-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>{serverError}</span>
                </div>
              )}

              <form onSubmit={formik.handleSubmit} noValidate className="mt-5 space-y-4">
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
                    className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </Field>
                {capsLock && !passwordError && (
                  <p id="caps-lock" className="-mt-2 text-sm text-accent">Caps Lock is on.</p>
                )}

                {/* Solid teal button; a soft mint light runs around the edge (Star Border) */}
                <div className="relative !mt-6">
                <StarBorder
                  type="submit"
                  disabled={formik.isSubmitting}
                  radius={12}
                  thickness={1.5}
                  stars={1}
                  duration={7}
                  hover="brighten"
                  glow={0.85}
                  color={themeColor('primary-foreground')}
                  trailColor={themeColor('primary-foreground', 0.5)}
                  backgroundColor="hsl(var(--primary))"
                  textColor="hsl(var(--primary-foreground))"
                  borderColor="hsl(var(--foreground) / 0.12)"
                  className="group h-12 w-full text-base font-semibold shadow-[0_10px_30px_-10px_hsl(var(--primary))] active:translate-y-px"
                >
                  {formik.isSubmitting
                    ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Signing in...</>
                    : <>Sign in<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></>}
                </StarBorder>
                </div>
              </form>

              <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground/80">
                <HelpCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                Forgot your password? Ask your EMS admin.
              </p>
            </div>

            {!isOpen && <LiftDoors opening={doors === 'opening'} onOpened={() => setDoors('open')} />}
          </div>
        </div>

        {/* Space is reserved from the start so the lift doesn't jump when the panel fades in */}
        {PROTOTYPE && (
          <div className={cn('w-full transition-opacity duration-500 md:max-w-md', isOpen ? 'opacity-100' : 'invisible opacity-0')}>
            <DemoPanel onPick={fillDemo} />
          </div>
        )}

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground/80">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Secure, role-based access for EMS lift operations
        </p>
      </main>
    </div>
  )
}

import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useFormik } from 'formik'
import { AlertCircle, ArrowUpDown, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { useAuth } from '@/hooks'
import { getRoleHome } from '@/router/routes'
import { loginSchema } from '@/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// Turns an Axios error from POST /auth/login into a message the user can act on.
function loginErrorMessage(err) {
  if (!err.response) return 'Cannot reach the server. Check your connection and try again.'
  const { status, data } = err.response
  if (status === 401) return 'Incorrect email or password.'
  if (status === 403 || status === 422) return data?.message || 'You cannot sign in with this account.'
  return 'Something went wrong on our side. Please try again.'
}

// Mobile-first sign-in screen (F03.1, F06.1, F06.2, F07.1).
// Designed for a 390px phone first: single column, 48px touch targets, 16px inputs
// (stops iOS zooming on focus), then centred as a card on larger screens.
export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
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

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#1B2336] md:items-center md:justify-center md:p-6">
      {/* ── Brand header ────────────────────────────────────────────────────── */}
      <header className="px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-10 text-white md:pt-0 md:pb-8 md:text-center">
        <div className="flex items-center gap-3 md:justify-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-400/15 ring-1 ring-teal-400/30">
            <ArrowUpDown className="h-5 w-5 text-teal-300" aria-hidden="true" />
          </span>
          <div className="text-left">
            <p className="text-xs font-medium uppercase tracking-widest text-teal-300">EMS Services</p>
            <p className="text-lg font-semibold leading-tight">Lift Spot-Check</p>
          </div>
        </div>
      </header>

      {/* ── Sign-in sheet (bottom sheet on phones, card on desktop) ─────────── */}
      <main className="flex-1 rounded-t-3xl bg-background px-6 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] md:w-full md:max-w-md md:flex-none md:rounded-2xl md:p-8 md:shadow-xl">
        <h1 className="text-2xl font-semibold text-foreground">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use the account issued by your EMS administrator.
        </p>

        {serverError && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={formik.handleSubmit} noValidate className="mt-6 space-y-5">
          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
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
                className={cn('h-12 pl-11 text-base md:text-base', emailError && 'border-destructive focus-visible:ring-destructive')}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'email-error' : undefined}
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
            </div>
            {emailError && <p id="email-error" className="text-sm text-destructive">{emailError}</p>}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                className={cn('h-12 pl-11 pr-12 text-base md:text-base', passwordError && 'border-destructive focus-visible:ring-destructive')}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? 'password-error' : undefined}
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {passwordError && <p id="password-error" className="text-sm text-destructive">{passwordError}</p>}
          </div>

          <Button type="submit" className="h-12 w-full text-base" disabled={formik.isSubmitting}>
            {formik.isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
            {formik.isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Forgotten your password? Ask your EMS administrator to reset it.
        </p>
      </main>
    </div>
  )
}

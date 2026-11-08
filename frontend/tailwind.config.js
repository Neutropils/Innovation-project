/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        // Login hero choreography (see pages/auth/LiftIllustration.jsx)
        'lift-rise': {
          '0%':   { transform: 'translateY(150px)' },
          '70%':  { transform: 'translateY(-7px)' },
          '85%':  { transform: 'translateY(2px)' },
          '100%': { transform: 'translateY(0)' },
        },
        'arrow-nudge': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-3px)' },
        },
        'door-left': {
          '0%, 100%': { transform: 'translateX(0)' },
          '22%, 72%': { transform: 'translateX(-27px)' },
        },
        'door-right': {
          '0%, 100%': { transform: 'translateX(0)' },
          '22%, 72%': { transform: 'translateX(27px)' },
        },
        'light-spill': {
          '0%, 100%': { opacity: '0' },
          '22%, 72%': { opacity: '1' },
        },
        'flash': {
          '0%, 100%': { opacity: '0' },
          '30%':      { opacity: '1' },
        },
        'slide-tilt-in': {
          '0%':   { transform: 'translateX(-60px) rotate(-25deg)', opacity: '0' },
          '70%':  { transform: 'translateX(4px) rotate(3deg)', opacity: '1' },
          '100%': { transform: 'translateX(0) rotate(0)', opacity: '1' },
        },
        'draw': {
          from: { strokeDashoffset: '20' },
          to:   { strokeDashoffset: '0' },
        },
        'pop': {
          '0%':   { transform: 'scale(0) rotate(-45deg)', opacity: '0' },
          '60%':  { transform: 'scale(1.18) rotate(8deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0)', opacity: '1' },
        },
        'ping-ring': {
          '0%':        { transform: 'scale(1)', opacity: '0.7' },
          '80%, 100%': { transform: 'scale(1.9)', opacity: '0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        'breathe': {
          '0%, 100%': { opacity: '0.7', transform: 'scale(0.96)' },
          '50%':      { opacity: '1', transform: 'scale(1.04)' },
        },
        'drift': {
          '0%':   { transform: 'translate(0, 0) scale(1)' },
          '33%':  { transform: 'translate(40px, 30px) scale(1.1)' },
          '66%':  { transform: 'translate(-20px, 50px) scale(0.95)' },
          '100%': { transform: 'translate(0, 0) scale(1)' },
        },
        'grid-pan': {
          from: { backgroundPosition: '0 0' },
          to:   { backgroundPosition: '0 28px' },
        },
        'sheet-up': {
          '0%':   { transform: 'translateY(60px)', opacity: '0' },
          '65%':  { transform: 'translateY(-6px)', opacity: '1' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'text-sheen': {
          from: { backgroundPosition: '0% 50%' },
          to:   { backgroundPosition: '200% 50%' },
        },
        'shimmer': {
          '0%':        { transform: 'translateX(-150%) skewX(-20deg)' },
          '45%, 100%': { transform: 'translateX(350%) skewX(-20deg)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'lift-rise':     'lift-rise 1.4s cubic-bezier(0.3, 0.7, 0.2, 1) both',
        'arrow-nudge':   'arrow-nudge 0.35s ease-in-out 4',
        'door-left':     'door-left 2.8s ease-in-out 1.45s both',
        'door-right':    'door-right 2.8s ease-in-out 1.45s both',
        'light-spill':   'light-spill 2.8s ease-in-out 1.45s both',
        'flash':         'flash 0.7s ease-out 1.3s both',
        'slide-tilt-in': 'slide-tilt-in 0.9s cubic-bezier(0.3, 0.7, 0.2, 1) 0.5s both',
        'draw':          'draw 0.45s ease-out both',
        'pop':           'pop 0.6s cubic-bezier(0.3, 0.7, 0.2, 1) 2.2s both',
        'ping-ring':     'ping-ring 2.4s cubic-bezier(0, 0, 0.2, 1) 2.8s infinite',
        'float':         'float 6s ease-in-out 3s infinite',
        'breathe':       'breathe 5s ease-in-out infinite',
        'drift':         'drift 18s ease-in-out infinite',
        'grid-pan':      'grid-pan 4s linear infinite',
        'sheet-up':      'sheet-up 0.8s cubic-bezier(0.3, 0.7, 0.2, 1) 0.15s both',
        'text-sheen':    'text-sheen 4s linear infinite',
        'shimmer':       'shimmer 3.5s ease-in-out 1.5s infinite both',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

import { useEffect, useRef } from 'react'
import { themeColor } from '@/lib/theme'
import { cn } from '@/lib/utils'

// Wave-line backdrop in the style of React Bits "Waves": dense vertical lines bent by
// Perlin noise into a flowing fabric that drifts slowly. Uses the 2D canvas, not WebGL, so
// it shows on every device. The drift is kept slow and stops entirely for users with
// "reduce motion" on (and while the tab is hidden). Line colour is the theme accent.

// ── Classic 2D Perlin noise (Ken Perlin's improved noise, seeded) ──────────────────────
function createNoise(seed = 7) {
  const grad = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]
  const p = Array.from({ length: 256 }, (_, i) => i)
  let s = seed
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647
    const j = s % (i + 1)
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  const perm = new Array(512).fill(0).map((_, i) => p[i & 255])
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10)
  const lerp = (a, b, t) => a + (b - a) * t
  const dot = (g, x, y) => g[0] * x + g[1] * y
  return (x, y) => {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    x -= Math.floor(x)
    y -= Math.floor(y)
    const g = (i, j) => grad[perm[X + i + perm[Y + j]] % 8]
    const u = fade(x)
    return lerp(
      lerp(dot(g(0, 0), x, y), dot(g(1, 0), x - 1, y), u),
      lerp(dot(g(0, 1), x, y - 1), dot(g(1, 1), x - 1, y - 1), u),
      fade(y)
    )
  }
}

const noise = createNoise()

// Shape settings (same roles as the React Bits Waves props)
const X_GAP = 10         // px between lines
const Y_GAP = 24         // px between points along a line
const AMP_X = 38         // sideways swing
const AMP_Y = 18         // vertical swing
const START_PHASE = 140  // starting "moment" of the wave, picked for a pleasing shape
const DRIFT = 0.5        // phase units per second - slow, gentle drift

// Match the canvas buffer to its on-screen size (only when the size changes)
function fit(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = Math.round(canvas.clientWidth * dpr)
  const h = Math.round(canvas.clientHeight * dpr)
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }
  return dpr
}

function draw(canvas, ctx, phase) {
  const dpr = fit(canvas)
  const { clientWidth: w, clientHeight: h } = canvas
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  // Fade lines out towards the bottom so the card and demo panel stay readable
  const fadeOut = ctx.createLinearGradient(0, 0, 0, h)
  const dark = document.documentElement.classList.contains('dark')
  const k = dark ? 1 : 0.45   // lines sit back further on the light background
  fadeOut.addColorStop(0, themeColor('primary', 0.95 * k))
  fadeOut.addColorStop(0.55, themeColor('primary', 0.55 * k))
  fadeOut.addColorStop(1, themeColor('primary', 0.2 * k))
  ctx.strokeStyle = fadeOut
  ctx.lineWidth = 1

  const cols = Math.ceil((w + 200) / X_GAP)
  const rows = Math.ceil((h + 60) / Y_GAP)
  const x0 = (w - cols * X_GAP) / 2
  for (let i = 0; i <= cols; i++) {
    ctx.beginPath()
    for (let j = 0; j <= rows; j++) {
      const px = x0 + i * X_GAP
      const py = j * Y_GAP - 30
      const move = noise((px + phase * 12.5) * 0.002, (py + phase * 5) * 0.0015) * 12
      const x = px + Math.cos(move) * AMP_X
      const y = py + Math.sin(move) * AMP_Y
      if (j === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

export default function WaveLines({ className }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext?.('2d')
    if (!ctx) return undefined
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    let phase = START_PHASE
    let last = 0
    let frame = 0

    const tick = (now) => {
      if (last) phase += Math.min(0.1, (now - last) / 1000) * DRIFT
      last = now
      draw(canvas, ctx, phase)
      frame = requestAnimationFrame(tick)   // rAF pauses by itself while the tab is hidden
    }
    const redrawStill = () => draw(canvas, ctx, phase)

    if (still) {
      redrawStill()
      window.addEventListener('resize', redrawStill)
    } else {
      frame = requestAnimationFrame(tick)
    }
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', redrawStill)
    }
  }, [])

  return <canvas ref={canvasRef} className={cn('block', className)} aria-hidden="true" />
}

// Reads an Elev8 theme colour (defined once in src/index.css) as a CSS colour string.
// Use it where a real colour value is needed rather than a Tailwind class - e.g. canvas
// drawing in StarBorder and WaveLines. Returns `fallback` if the token isn't available.
export function themeColor(token, alpha = 1, fallback = '#ffffff') {
  if (typeof window === 'undefined') return fallback
  const channels = getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim()
  return channels ? `hsl(${channels} / ${alpha})` : fallback
}

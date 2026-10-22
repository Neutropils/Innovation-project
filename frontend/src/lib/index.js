// cn() - merges Tailwind classes safely, used by all shadcn/ui components
export { cn } from './utils'

// formatCurrency - formats a number as SGD
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(amount)
}

// formatDate - formats an ISO date string for display
export function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })
}

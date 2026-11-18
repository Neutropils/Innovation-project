// Owner: Jerald
// Lift icon from the Figma Make design (a lift car with up/down arrows).
export default function LiftIcon({ className }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="m9 8 3-3 3 3M9 16l3 3 3-3M12 5v14" />
    </svg>
  )
}

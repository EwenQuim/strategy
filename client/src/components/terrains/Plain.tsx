export function Plain({ variant }: { variant: number }) {
  return (
    <g
      className="pointer-events-none"
      opacity=".48"
      transform={'translate(' + (variant * 4 - 4) + ' ' + (variant * 3 - 5) + ')'}
    >
      <path
        d="m-8 5-3-5m3 5 1-8m0 8 4-3m11 8-2-6m2 6 3-4"
        fill="none"
        stroke="#d0d4a4"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <ellipse cx="11" cy="-8" rx="2.5" ry="1.4" fill="#4a6446" />
      <circle cx="-15" cy="13" r="1.2" fill="#d2c391" />
    </g>
  )
}

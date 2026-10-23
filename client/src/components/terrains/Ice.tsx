export function Ice({ variant }: { variant: number }) {
  return (
    <g
      className="pointer-events-none"
      opacity=".6"
      transform={'translate(' + (variant * 4 - 4) + ' ' + (variant * 3 - 5) + ')'}
    >
      <path
        d="m-9 4 6-7m-1 9 8-4m-10 2 4 6m12-10-5-4m-2 12 6 2"
        fill="none"
        stroke="#e8f4fb"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="12" cy="9" r="1.1" fill="#e8f4fb" />
    </g>
  )
}

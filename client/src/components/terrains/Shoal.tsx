export function Shoal({ variant }: { variant: number }) {
  return (
    <g
      className="pointer-events-none"
      opacity=".55"
      transform={'translate(' + (variant * 4 - 4) + ' ' + (variant * 3 - 5) + ')'}
    >
      <path
        d="m-10 3c3-2 5-2 8 0s5 2 8 0m-14 7c3-2 5-2 8 0s5 2 8 0"
        fill="none"
        stroke="#e6f7f4"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </g>
  )
}

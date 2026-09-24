export function Sand({ variant }: { variant: number }) {
  return (
    <g
      className="pointer-events-none"
      data-art="sand"
      transform={'translate(0 ' + (variant * 3 - 3) + ')'}
    >
      <path
        d="M-22 8Q-4-10 8-2T22 6"
        fill="none"
        stroke="#e6c081"
        strokeOpacity=".28"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="m-16 16q13-6 30-1"
        fill="none"
        stroke="#8b5c30"
        strokeOpacity=".22"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </g>
  )
}

export function Basalt({ variant }: { variant: number }) {
  return (
    <g
      className="pointer-events-none"
      data-art="basalt"
      transform={'rotate(' + variant * 120 + ')'}
    >
      <path
        d="m-23-7 14-11 15 5 12 12-15 5-15-3Z"
        fill="var(--basalt-light, #75666b)"
        opacity=".18"
      />
      <path
        d="m-20 9 10-6 16 4 13 9-15 6-16-5Z"
        fill="var(--basalt-shadow, #433b42)"
        opacity=".18"
      />
      <path
        d="m-21-7 12 3 9-4 14 7M0-8l4-9"
        fill="none"
        stroke="var(--basalt-crack, #40373e)"
        strokeWidth=".8"
        opacity=".4"
      />
      <path
        d="m-19-8 10 3M-7 14l8 2"
        fill="none"
        stroke="var(--basalt-edge, #9a8388)"
        strokeWidth=".7"
        opacity=".22"
      />
      <ellipse
        cx="12"
        cy="10"
        rx="3.5"
        ry="1.8"
        fill="var(--basalt-stone, #6c5c62)"
        opacity=".65"
      />
      <ellipse
        cx="-12"
        cy="12"
        rx="1.5"
        ry=".8"
        fill="var(--basalt-speck, #a28b88)"
        opacity=".25"
      />
    </g>
  )
}

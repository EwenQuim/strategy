export function Mountain() {
  return (
    <g className="pointer-events-none">
      <ellipse cy="15" rx="20" ry="5" fill="var(--mountain-shadow, #263c2e)" opacity=".25" />
      <path d="m-23 15 13-23 13 23Z" fill="var(--mountain-back, #8f9980)" />
      <path d="m-10-8 13 23h-13Z" fill="var(--mountain-back-shade, #576651)" />
      <path d="m-10 17 16-36 19 36Z" fill="var(--mountain-front, #b2b69a)" />
      <path d="M6-19 25 17H6Z" fill="var(--mountain-front-shade, #7d8b70)" />
      <path d="m6-19-6 14 6-3 7 3Z" fill="var(--mountain-peak, #dedec0)" />
    </g>
  )
}

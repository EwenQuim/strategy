import { useId } from 'react'

export function MenuBackground() {
  const id = useId()
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-1 overflow-hidden bg-[radial-gradient(ellipse_at_15%_0%,#657d4d40,transparent_50%),radial-gradient(ellipse_at_100%_70%,#214d4940,transparent_60%),linear-gradient(160deg,#ffffff03,transparent)]"
    >
      <svg className="absolute inset-0 size-full text-gold/5 mask-[linear-gradient(#000,transparent_85%)]">
        <defs>
          <pattern id={id} width="56" height="96" patternUnits="userSpaceOnUse">
            <path
              d="M28 0 56 16v32L28 64 0 48V16ZM0 48v32l28 16 28-16V48"
              fill="none"
              stroke="currentColor"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={'url(#' + id + ')'} />
      </svg>
    </div>
  )
}

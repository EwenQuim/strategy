import { Bulwark, King, PAWN_CLASSES, Swordsman, type PawnKind } from '../lib/engine'

const paths = {
  shield: Bulwark.icon,
  crown: King.icon,
  sword: Swordsman.icon,
  escape: 'M3 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M5 16h5a3 3 0 1 1-3 3',
  energy: 'm13 2-9 12h7l-1 8 10-13h-8l1-7Z',
  spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  close: 'm6 6 12 12M6 18 18 6',
  help: 'M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  history: 'M3 11a9 9 0 1 1 2 7M3 4v7h7m2-5v6l4 2',
  hex: 'm12 2 9 5v10l-9 5-9-5V7l9-5Z',
} as const

export type IconName = keyof typeof paths

export function PawnIcon({ kind }: { kind: PawnKind }) {
  return <SvgIcon path={PAWN_CLASSES[kind].icon} />
}

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return <SvgIcon path={paths[name]} className={className} />
}

function SvgIcon({ path, className = '' }: { path: string; className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  )
}

const pawnIcons = {
  king: 'crown',
  swordsman: 'sword',
  archer: 'bow',
  magician: 'wand',
  ninja: 'mask',
} as const

const paths = {
  mask: 'M4 9a8 8 0 0 1 16 0v6a8 8 0 0 1-16 0V9Zm0 0h16M4 15h16M7 12h2m6 0h2M4 9 1 5m3 4L1 12',
  bow: 'M5 3c14 0 14 18 0 18V3Zm0 9h16m-4-4 4 4-4 4',
  wand: 'm4 20 12-12m-9 9 3 3M17 2l1.5 4.5L23 8l-4.5 1.5L17 14l-1.5-4.5L11 8l4.5-1.5L17 2Z',
  crown: 'm3 6 4 4 5-7 5 7 4-4-2 12H5L3 6ZM6 21h12',
  sword: 'm14 4 6-1-1 6L8 20l-4-4L14 4ZM3 13l8 8M5 19l-3 3M14 8l2 2',
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

export function PawnIcon({ kind }: { kind: keyof typeof pawnIcons }) {
  return <Icon name={pawnIcons[kind]} />
}

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
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
      <path d={paths[name]} />
    </svg>
  )
}

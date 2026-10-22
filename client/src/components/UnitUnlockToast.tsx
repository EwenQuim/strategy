import type { PawnKind } from '../lib/engine'
import { unitNames } from '../i18n/units'
import * as m from '../i18n/campaign'
import { PawnIcon } from './Icon'

export function UnitUnlockToast({ units }: { units: readonly PawnKind[] }) {
  if (!units.length) return null
  return (
    <ul
      role="status"
      aria-label={m.recruitsUnlocked}
      data-testid="unit-unlock-toast"
      className="pointer-events-none absolute inset-x-3 bottom-3 z-10 m-0 flex list-none flex-col items-center gap-2 p-0"
    >
      {units.map((kind, index) => (
        <li
          key={kind}
          className="unit-unlock-toast flex max-w-full items-center gap-3 rounded-xl border border-gold/60 bg-[#141a17f5] px-4 py-3 text-gold shadow-[0_10px_30px_#0009] motion-reduce:animate-none"
          style={{ animationDelay: 350 + index * 200 + 'ms' }}
        >
          <span className="shrink-0 [&>svg]:size-8">
            <PawnIcon kind={kind} />
          </span>
          <div className="min-w-0">
            <strong className="block font-serif text-lg leading-tight">
              {m.unitUnlocked(unitNames[kind])}
            </strong>
            <span className="text-xs text-muted">{m.availableInAllModes}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

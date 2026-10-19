import * as m from '../i18n/menus'

const stepperButtonClassName =
  'flex h-11 w-8 shrink-0 items-center justify-center text-lg leading-none text-muted hover:bg-white/10 hover:text-ink active:bg-white/15 disabled:opacity-50'

export function RosterStepper({
  count,
  max,
  label,
  disabled,
  onChange,
}: {
  count: number
  max: number
  label: string
  disabled: boolean
  onChange: (count: number) => void
}) {
  const set = (value: number) => {
    if (Number.isInteger(value) && value >= 0 && value <= max) onChange(value)
  }
  return (
    <div className="flex w-full items-center overflow-hidden rounded-xl border border-line bg-[#152b24]">
      <button
        type="button"
        className={stepperButtonClassName}
        disabled={disabled || count === 0}
        onClick={() => set(count - 1)}
        aria-label={m.removeOne + ': ' + label}
      >
        −
      </button>
      <input
        className="h-11 min-h-0 w-full min-w-0 border-0 bg-transparent px-0 text-center text-[16px] text-ink [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:opacity-50"
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        step={1}
        value={count}
        onFocus={(event) => event.target.select()}
        aria-label={label}
        disabled={disabled}
        onChange={(event) => set(Number(event.target.value))}
      />
      <button
        type="button"
        className={stepperButtonClassName}
        disabled={disabled || count === max}
        onClick={() => set(count + 1)}
        aria-label={m.addOne + ': ' + label}
      >
        +
      </button>
    </div>
  )
}

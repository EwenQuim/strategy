import { menuCardClassName, menuInputClassName } from './styles'

export function ApiKeyField({
  label,
  hint,
  value,
  onChange,
  type = 'password',
}: {
  label: string
  hint: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'password'
}) {
  return (
    <label className={menuCardClassName + ' flex flex-col gap-3 p-4 min-[900px]:p-6'}>
      <span className="flex flex-col gap-1.5">
        <strong className="text-base">{label}</strong>
        <small className="text-sm leading-relaxed text-muted">{hint}</small>
      </span>
      <input
        className={menuInputClassName}
        type={type}
        autoComplete="off"
        spellCheck={false}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value.trim())}
      />
    </label>
  )
}

export function ApiKeyField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex flex-col gap-2 rounded-lg border border-line p-4">
      <span className="flex flex-col gap-1">
        <strong className="text-[14px]">{label}</strong>
        <small className="text-[12px] text-muted">{hint}</small>
      </span>
      <input
        className="min-h-11 rounded-md border border-line bg-[#20362b] p-2 font-[inherit] text-[16px] text-ink [color-scheme:dark]"
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value.trim())}
      />
    </label>
  )
}

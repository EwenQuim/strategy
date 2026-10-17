import type { ComponentProps } from 'react'
import { Icon, type IconName } from './Icon'

const actionPanelClassName =
  'grid min-h-16 select-none [-webkit-touch-callout:none] aria-disabled:cursor-help aria-disabled:not-aria-pressed:opacity-38 grid-cols-[auto_1fr] items-center gap-x-2.5 rounded-[9px] border px-4 py-3 text-left [&:enabled:not([aria-disabled=true]):hover]:border-[#bcc8a670] [&:enabled:not([aria-disabled=true]):hover]:bg-[#ffffff0c] max-[601px]:min-h-[76px] max-[601px]:grid-cols-1 max-[601px]:justify-items-center max-[601px]:gap-y-[3px] max-[601px]:rounded-lg max-[601px]:px-0.5 max-[601px]:pt-[9px] max-[601px]:pb-2 max-[601px]:text-center [@media(max-height:650px)]:min-h-[65px] [@media(max-height:650px)]:py-1.5 [@media(min-width:600px)_and_(max-height:480px)]:min-h-12 [@media(min-width:600px)_and_(max-height:480px)]:px-3 [@media(min-width:600px)_and_(max-height:480px)]:py-1.5'

interface CommandActionContentProps {
  icon: IconName
  label: string
  note?: string
}

type CommandButtonProps = CommandActionContentProps &
  Omit<ComponentProps<'button'>, 'children'> & {
    variant: 'special' | 'ability' | 'compact'
  }

export function CommandButton({
  icon,
  label,
  note,
  variant,
  className = '',
  ...props
}: CommandButtonProps) {
  const variantClassName =
    variant === 'ability'
      ? 'text-[#ffc079] aria-pressed:border-[#e8a05c] aria-pressed:bg-[#ffc07926]'
      : variant === 'special'
        ? 'text-[#d0b6e7] aria-pressed:border-[#c4a6db] aria-pressed:bg-[#9f82b933]'
        : 'px-3 text-[#e6e7d4] max-[601px]:px-2'
  return (
    <button
      {...props}
      className={`${actionPanelClassName} border-[#bcc8a62e] bg-[#ffffff04] ${variantClassName} ${className}`}
    >
      <CommandActionContent icon={icon} label={label} note={note} />
    </button>
  )
}

export function CommandPanel({
  icon,
  label,
  note,
  ...props
}: CommandActionContentProps & Omit<ComponentProps<'div'>, 'children' | 'className'>) {
  return (
    <div
      {...props}
      className={
        actionPanelClassName + ' border-none bg-none text-gray-400 [&>small]:text-inherit'
      }
    >
      <CommandActionContent icon={icon} label={label} note={note} />
    </div>
  )
}

function CommandActionContent({ icon, label, note }: CommandActionContentProps) {
  return (
    <>
      <Icon
        name={icon}
        className="row-span-2 size-[22px] max-[601px]:row-auto max-[601px]:mb-0.5 max-[601px]:size-5"
      />
      <span
        className={
          'text-[13px] font-semibold max-[601px]:text-[11px] max-[360px]:text-[10px] [@media(min-width:600px)_and_(max-height:480px)]:text-[11px] ' +
          // Long signature names (e.g. German) must wrap rather than clip on narrow phones.
          (note === undefined
            ? 'row-span-2 min-w-0 max-[601px]:row-auto'
            : 'whitespace-nowrap max-[360px]:whitespace-normal')
        }
      >
        {label}
      </span>
      {note !== undefined && (
        <small className="mt-0.5 block text-[9px] text-[#a1b29b] max-[601px]:mt-0 max-[601px]:text-[8px]">
          {note}
        </small>
      )}
    </>
  )
}

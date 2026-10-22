import type { ComponentProps } from 'react'
import { createLink } from '@tanstack/react-router'

const variants = {
  primary: 'border-[#ecdaa3] bg-gold text-[#24392a]',
  secondary: 'border-line bg-[var(--biome-panel,#24392f)] text-ink',
  accent: 'border-[#bed5ac] bg-[#a9c594] text-[#24392a]',
  danger: 'border-[#e8af9c] bg-[#d8917d] text-[#381c18]',
  ghost:
    'border-transparent bg-transparent text-muted not-disabled:not-aria-disabled:hover:bg-surface not-disabled:not-aria-disabled:hover:text-ink',
}

const sizes = {
  default: 'min-h-12 rounded-xl px-5 py-3 text-[15px]',
  menu: 'min-h-16 rounded-2xl px-5 py-4 text-base [@media(max-height:650px)]:min-h-13 [@media(max-height:650px)]:px-4 [@media(max-height:650px)]:py-2.5 [@media(max-height:650px)]:text-sm',
  icon: 'size-11 rounded-xl p-0',
  compact: 'min-h-11 rounded-lg px-1 py-2 text-xs',
}

type ButtonStyleProps = {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
}

function buttonClassName({
  variant = 'secondary',
  size = 'default',
  className = '',
}: ButtonStyleProps & { className?: string }) {
  return [
    'inline-flex shrink-0 items-center justify-center gap-3 border font-semibold disabled:cursor-not-allowed disabled:opacity-55 aria-disabled:cursor-not-allowed aria-disabled:opacity-55 [&>svg]:size-5 [&>svg]:shrink-0',
    variants[variant],
    sizes[size],
    variant === 'ghost'
      ? ''
      : 'shadow-[0_4px_0_#081710,0_12px_24px_#0003] not-disabled:not-aria-disabled:hover:brightness-110 not-disabled:not-aria-disabled:active:translate-y-[3px] not-disabled:not-aria-disabled:active:shadow-[0_1px_0_#081710,0_5px_12px_#0003]',
    className,
  ].join(' ')
}

export function Button({
  variant,
  size,
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'> & ButtonStyleProps) {
  return (
    <button {...props} type={type} className={buttonClassName({ variant, size, className })} />
  )
}

function ButtonAnchor({
  variant,
  size,
  className,
  disabled,
  onClick,
  ...props
}: ComponentProps<'a'> & ButtonStyleProps & { disabled?: boolean }) {
  const unavailable =
    disabled || props['aria-disabled'] === true || props['aria-disabled'] === 'true'
  return (
    <a
      {...props}
      className={buttonClassName({ variant, size, className })}
      aria-disabled={unavailable || undefined}
      tabIndex={unavailable ? -1 : props.tabIndex}
      onClick={(event) => {
        if (unavailable) event.preventDefault()
        else onClick?.(event)
      }}
    />
  )
}

export const ButtonLink = createLink(ButtonAnchor)

import { useRef, type MouseEvent, type PointerEvent } from 'react'

const LONG_PRESS_MS = 350

export type PreviewProps = {
  commanding: boolean
  previewed: boolean
  onPreview: () => void
  onPeek: (shown: boolean) => void
}

// Hover (mouse) or long press (touch) shows the range while held, and a long press swallows its click.
// A disabled button stays clickable to toggle its range instead of acting.
export function usePreviewButton(
  disabled: boolean,
  act: () => void,
  { onPreview, onPeek }: PreviewProps,
) {
  const timer = useRef<number>(undefined)
  const peeked = useRef(false)
  const release = () => {
    clearTimeout(timer.current)
    if (peeked.current) onPeek(false)
  }
  return {
    'aria-disabled': disabled,
    onPointerEnter: (event: PointerEvent) => event.pointerType === 'mouse' && onPeek(true),
    onPointerLeave: (event: PointerEvent) => event.pointerType === 'mouse' && onPeek(false),
    onPointerDown: (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return
      peeked.current = false
      timer.current = window.setTimeout(() => {
        peeked.current = true
        onPeek(true)
      }, LONG_PRESS_MS)
    },
    onPointerUp: release,
    onPointerCancel: release,
    onContextMenu: (event: MouseEvent) => event.preventDefault(),
    onClick: () => {
      if (peeked.current) peeked.current = false
      else if (disabled) onPreview()
      else act()
    },
  }
}

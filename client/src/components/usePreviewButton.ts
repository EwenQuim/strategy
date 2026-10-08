import { useRef, type MouseEvent, type PointerEvent } from 'react'
import type { RangeKind } from '../lib/engine'

const LONG_PRESS_MS = 350

export type PreviewProps = {
  commanding: boolean
  previewed: boolean
  onPreview: (range: RangeKind) => void
  onPeek: (range: RangeKind | null) => void
}

// Hover (mouse) or long press (touch) shows the range while held, and a long press swallows its click.
// A disabled button stays clickable to toggle its range instead of acting.
export function usePreviewButton(
  kind: RangeKind,
  disabled: boolean,
  act: () => void,
  { onPreview, onPeek }: PreviewProps,
) {
  const timer = useRef<number>(undefined)
  const peeked = useRef(false)
  const release = () => {
    clearTimeout(timer.current)
    if (peeked.current) onPeek(null)
  }
  return {
    'aria-disabled': disabled,
    onPointerEnter: (event: PointerEvent) => event.pointerType === 'mouse' && onPeek(kind),
    onPointerLeave: (event: PointerEvent) => event.pointerType === 'mouse' && onPeek(null),
    onPointerDown: (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return
      peeked.current = false
      timer.current = window.setTimeout(() => {
        peeked.current = true
        onPeek(kind)
      }, LONG_PRESS_MS)
    },
    onPointerUp: release,
    onPointerCancel: release,
    onContextMenu: (event: MouseEvent) => event.preventDefault(),
    onClick: () => {
      if (peeked.current) peeked.current = false
      else if (disabled) onPreview(kind)
      else act()
    },
  }
}

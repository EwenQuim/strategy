import { useState } from 'react'
import { battleMessage, type GameMode } from '../lib/game-mode'

export function BattleNotifications({
  log,
  logCount,
  mode,
}: {
  log: string[]
  logCount: number
  mode: GameMode
}) {
  const latest = log.slice(-5)
  return (
    <ol
      className="pointer-events-none absolute top-2 left-1/2 m-0 grid w-[min(390px,calc(100%-24px))] -translate-x-1/2 list-none gap-1 p-0"
      aria-label="Recent battle events"
      aria-live="polite"
      aria-relevant="additions"
    >
      {latest.map((message, index) => (
        <Notification
          key={logCount - latest.length + index}
          message={battleMessage(message, mode)}
        />
      ))}
    </ol>
  )
}

function Notification({ message }: { message: string }) {
  const [visible, setVisible] = useState(true)
  return visible ? (
    <li
      className="battle-notification rounded-md bg-[#14271fe6] px-2.5 py-1.5 text-[10px] leading-[1.4] text-[#e7e6cc] shadow-[0_2px_8px_#07180f33]"
      onAnimationEnd={() => setVisible(false)}
    >
      {message}
    </li>
  ) : null
}

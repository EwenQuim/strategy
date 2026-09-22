import { useEffect, useState } from 'react'
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
      className="battle-notifications"
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
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 5000)
    return () => window.clearTimeout(timer)
  }, [])
  return visible ? <li>{message}</li> : null
}

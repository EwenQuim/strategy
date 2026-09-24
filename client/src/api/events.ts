export function watchOnlineGame(code: string, onGame: (data: string) => void) {
  let source: EventSource | undefined
  let watchdog: ReturnType<typeof setTimeout>

  function watch() {
    clearTimeout(watchdog)
    watchdog = setTimeout(connect, 45_000)
  }

  function connect() {
    source?.close()
    source = new EventSource('/api/games/' + encodeURIComponent(code) + '/events')
    watch()
    source.onopen = watch
    source.addEventListener('heartbeat', watch)
    source.onmessage = (event) => {
      watch()
      onGame(event.data)
    }
    source.onerror = () => {
      // EventSource retries dropped streams itself, but not terminal HTTP errors.
      if (source?.readyState === EventSource.CLOSED) {
        clearTimeout(watchdog)
        watchdog = setTimeout(connect, 2000)
      }
    }
  }

  function resume() {
    if (document.visibilityState === 'visible') connect()
  }

  connect()
  window.addEventListener('online', connect)
  document.addEventListener('visibilitychange', resume)
  return () => {
    source?.close()
    clearTimeout(watchdog)
    window.removeEventListener('online', connect)
    document.removeEventListener('visibilitychange', resume)
  }
}

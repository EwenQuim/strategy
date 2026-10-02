export function watchOnlineGame(code: string, onGame: (data: string) => void) {
  let source: EventSource | undefined
  let watchdog: ReturnType<typeof setTimeout>
  let version = -1

  function watch() {
    clearTimeout(watchdog)
    watchdog = setTimeout(connect, 45_000)
  }

  function connect() {
    source?.close()
    version = -1
    source = new EventSource('/api/games/' + encodeURIComponent(code) + '/events')
    watch()
    source.onopen = watch
    source.addEventListener('heartbeat', (event) => {
      watch()
      // A suspended tab can miss snapshots: if the server moved on without
      // this stream delivering the update, reconnect to pull a fresh snapshot.
      const beat = JSON.parse((event as MessageEvent<string>).data) as { version?: number }
      if (typeof beat.version === 'number' && beat.version !== version) connect()
    })
    source.onmessage = (event) => {
      watch()
      version = (JSON.parse(event.data) as { version?: number }).version ?? version
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

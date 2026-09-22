if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .register(import.meta.env.BASE_URL + 'sw.js', { updateViaCache: 'none' })
    .then((registration) => {
      const update = () => {
        if (navigator.onLine) {
          void registration
            .update()
            .catch((error: unknown) =>
              console.warn('Could not check for an offline app update.', error),
            )
        }
      }
      window.addEventListener('online', update)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') update()
      })
    })
    .catch((error: unknown) => console.warn('Offline mode could not be installed.', error))
}

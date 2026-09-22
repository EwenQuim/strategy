if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return
    reloading = true
    location.reload()
  })
  navigator.serviceWorker
    .register(import.meta.env.BASE_URL + 'sw.js', { updateViaCache: 'none' })
    .then((registration) => {
      const showUpdate = () => {
        if (!registration.waiting || !navigator.serviceWorker.controller) return
        if (document.getElementById('pwa-update')) return
        const notice = document.createElement('aside')
        notice.id = 'pwa-update'
        notice.className =
          'fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-sm items-center gap-3 rounded-lg border border-[var(--gold)] bg-[#172a21] p-3 text-xs shadow-lg'
        const message = document.createElement('p')
        message.setAttribute('role', 'status')
        message.textContent = 'Update ready. Finish your match, then tap Update now.'
        const install = document.createElement('button')
        install.type = 'button'
        install.className = 'min-h-11 shrink-0 px-2 font-semibold text-[var(--gold)]'
        install.textContent = 'Update now'
        install.addEventListener('click', () =>
          registration.waiting?.postMessage('skip-waiting'),
        )
        const dismiss = document.createElement('button')
        dismiss.type = 'button'
        dismiss.className = 'min-h-11 shrink-0 px-2 text-[var(--gold)]'
        dismiss.setAttribute('aria-label', 'Dismiss update notice')
        dismiss.textContent = 'Dismiss'
        dismiss.addEventListener('click', () => notice.remove())
        notice.append(message, install, dismiss)
        document.body.append(notice)
      }
      const watchInstalling = () => {
        registration.installing?.addEventListener('statechange', showUpdate)
      }
      registration.addEventListener('updatefound', watchInstalling)
      watchInstalling()
      showUpdate()
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

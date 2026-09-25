interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
}

function noticeStack() {
  let stack = document.getElementById('pwa-notices')
  if (!stack) {
    stack = document.createElement('div')
    stack.id = 'pwa-notices'
    stack.className =
      'fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-sm flex-col gap-2'
    document.body.append(stack)
  }
  return stack
}

function showNotice(id: string, text: string, action: { label: string; onClick: () => void }) {
  const notice = document.createElement('aside')
  notice.id = id
  notice.className =
    'flex items-center gap-3 rounded-lg border border-[var(--gold)] bg-[#172a21] p-3 text-xs shadow-lg'
  const message = document.createElement('p')
  message.setAttribute('role', 'status')
  message.textContent = text
  const actionButton = document.createElement('button')
  actionButton.type = 'button'
  actionButton.className = 'min-h-11 shrink-0 px-2 font-semibold text-[var(--gold)]'
  actionButton.textContent = action.label
  actionButton.addEventListener('click', action.onClick)
  const dismiss = document.createElement('button')
  dismiss.type = 'button'
  dismiss.className = 'min-h-11 shrink-0 px-2 text-[var(--gold)]'
  dismiss.setAttribute('aria-label', 'Dismiss ' + id.replace('pwa-', '') + ' notice')
  dismiss.textContent = 'Dismiss'
  dismiss.addEventListener('click', () => notice.remove())
  notice.append(message, actionButton, dismiss)
  noticeStack().append(notice)
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  if (document.getElementById('pwa-install')) return
  const install = event as InstallPromptEvent
  showNotice('pwa-install', 'Install Hexmate on your device for offline play.', {
    label: 'Install',
    onClick: () => {
      void install.prompt().then(() => document.getElementById('pwa-install')?.remove())
    },
  })
})

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
        showNotice('pwa-update', 'Update ready. Finish your match, then tap Update now.', {
          label: 'Update now',
          onClick: () => registration.waiting?.postMessage('skip-waiting'),
        })
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

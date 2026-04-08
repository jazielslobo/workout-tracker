let deferredInstallPrompt = null;

function showInstallBanner() {
  const banner = document.querySelector('[data-install-banner]');
  if (!banner) return;
  banner.classList.add('is-visible');
}

function hideInstallBanner() {
  const banner = document.querySelector('[data-install-banner]');
  if (!banner) return;
  banner.classList.remove('is-visible');
}

function shouldRegisterServiceWorker() {
  const { protocol, hostname } = window.location;
  if (protocol !== 'https:' && hostname !== 'localhost' && hostname !== '127.0.0.1') return false;
  // Evita dores de cabeça durante desenvolvimento local.
  if (hostname === 'localhost' || hostname === '127.0.0.1') return false;
  return 'serviceWorker' in navigator;
}

export async function registerServiceWorker() {
  if (!shouldRegisterServiceWorker()) return;

  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
    } catch (error) {
      console.error('Falha ao registrar service worker:', error);
    }
  });
}

export function setupInstallPrompt(app) {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    showInstallBanner();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    hideInstallBanner();
    app.toast.create({
      text: 'Jeferson Personal instalado com sucesso.',
      closeTimeout: 2500,
      position: 'center'
    }).open();
  });

  document.addEventListener('click', async (event) => {
    const installTrigger = event.target.closest('[data-install-trigger]');
    const dismissTrigger = event.target.closest('[data-install-dismiss]');

    if (dismissTrigger) {
      hideInstallBanner();
      return;
    }

    if (!installTrigger || !deferredInstallPrompt) return;

    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    hideInstallBanner();
  });
}

import routes from './routes.js';
import { initDatabase } from './db/indexeddb.js';
import { seedInitialData } from './db/seedData.js';
import { registerServiceWorker, setupInstallPrompt } from './modules/pwa.js';
import { renderPageByName } from './modules/pages.js';
import { OBJECT_STORES, APP_NAME, APP_VERSION } from './utils/constants.js';
import * as repository from './db/repository.js';

function renderFatalState(message, details = '') {
  const appRoot = document.querySelector('#app');
  if (!appRoot) return;
  appRoot.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f3f6fb;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif;">
      <div style="max-width:560px;width:100%;background:#fff;border-radius:28px;padding:28px;box-shadow:0 20px 60px rgba(15,23,42,.12);border:1px solid rgba(148,163,184,.18);">
        <div style="width:56px;height:56px;border-radius:18px;background:#fee2e2;color:#b91c1c;display:flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:16px;">!</div>
        <h1 style="margin:0 0 8px;font-size:28px;color:#0f172a;">Não foi possível abrir o app</h1>
        <p style="margin:0 0 16px;color:#475569;line-height:1.6;">${message}</p>
        ${details ? `<pre style="white-space:pre-wrap;background:#f8fafc;color:#334155;padding:12px 14px;border-radius:16px;overflow:auto;font-size:12px;">${details}</pre>` : ''}
        <button onclick="window.location.reload()" style="margin-top:16px;border:0;border-radius:999px;padding:12px 18px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer;">Recarregar</button>
      </div>
    </div>
  `;
}

function exposeDebugApi() {
  window.jpData = {
    ...repository,
    stores: OBJECT_STORES,
    appVersion: APP_VERSION
  };
}

function bindGlobalReload() {
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-page-reload]');
    if (button) window.location.reload();
  });
}

function createFramework7App() {
  return new Framework7({
    el: '#app',
    name: APP_NAME,
    theme: 'ios',
    routes,
    view: {
      stackPages: true,
      browserHistory: false
    },
    dialog: {
      title: APP_NAME
    },
    toast: {
      closeTimeout: 2200
    }
  });
}

function bindPageRendering(app) {
  const renderCurrentPage = async (page) => {
    if (!page?.name || !page?.el) return;
    await renderPageByName(page.name, page.el);
  };

  app.on('pageInit', renderCurrentPage);
  app.on('pageAfterIn', renderCurrentPage);

  requestAnimationFrame(async () => {
    const mainView = app.views?.main;
    const currentRoute = mainView?.router?.currentRoute;
    const currentPageEl = mainView?.el?.querySelector('.page-current');
    if (currentRoute?.name && currentPageEl) {
      await renderPageByName(currentRoute.name, currentPageEl);
    }
  });
}

async function bootstrap() {
  if (typeof window.Framework7 === 'undefined') {
    renderFatalState('A biblioteca visual do app não foi carregada. Verifique sua conexão com a internet ou use uma versão totalmente local do projeto.');
    return;
  }

  try {
    await initDatabase();
    await seedInitialData();
    document.body.dataset.appReady = 'true';
  } catch (error) {
    console.error('Falha ao inicializar IndexedDB/seed:', error);
    renderFatalState('O banco local não pôde ser inicializado.', error?.message || String(error));
    return;
  }

  exposeDebugApi();
  bindGlobalReload();

  const app = createFramework7App();
  window.jpApp = app;

  bindPageRendering(app);
  setupInstallPrompt(app);
  registerServiceWorker();
}

window.addEventListener('error', (event) => {
  console.error('Erro global:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Promise rejeitada sem tratamento:', event.reason);
});

bootstrap();

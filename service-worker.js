const CACHE_NAME = 'jeferson-personal-shell-v13';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/variables.css',
  './css/app.css',
  './js/app.js',
  './js/routes.js',
  './js/db/indexeddb.js',
  './js/db/repository.js',
  './js/db/seedData.js',
  './js/modules/pages.js',
  './js/modules/crud.js',
  './js/modules/schedule.js',
  './js/modules/history.js',
  './js/modules/backup.js',
  './js/modules/workoutTemplates.js',
  './js/modules/whatsapp.js',
  './js/modules/pwa.js',
  './js/modules/ui.js',
  './js/utils/constants.js',
  './js/utils/formatters.js',
  './js/utils/scheduleSlots.js',
  './pages/home.html',
  './pages/agenda.html',
  './pages/alunos.html',
  './pages/academias.html',
  './pages/exercicios.html',
  './pages/configuracoes.html',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    return (await caches.match(request)) || caches.match('./index.html');
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

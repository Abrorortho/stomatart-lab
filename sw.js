// Service worker: программа открывается без интернета.
// Страница программы берётся из сети (чтобы сразу приходили обновления), а без интернета — из кэша.
// Иконки и прочее — из кэша. Запросы к Яндекс Диску не трогаются.
const CACHE = 'stomatart-v2';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const page = e.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request, page ? { cache: 'no-store' } : undefined)
      .then(r => { if (r.ok) c.put(e.request, r.clone()); return r; });
    if (page) {
      // сеть, но не дольше 4 секунд; иначе — сохранённая копия
      const timeout = new Promise(res => setTimeout(() => res(null), 4000));
      const r = await Promise.race([net.catch(() => null), timeout]);
      return r || hit || net;
    }
    return hit || net.catch(() => hit);
  }));
});

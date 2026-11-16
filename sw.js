// Uygulama dosyalarını önbelleğe alır; internet yokken uygulama yine açılır.
// Dosyaları değiştirdiğinizde sürümü artırın (ute-v2, ute-v3 …).
const CACHE = 'ute-v4';
const XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
const SORTABLE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.2/Sortable.min.js';
const DIS = [XLSX_URL, SORTABLE_URL];
const FILES = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(FILES);
    for (const u of DIS) {
      try { await c.add(u); } catch (x) { /* sonra önbelleğe alınır */ }
    }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Uygulama dosyaları: önce ağ, yoksa önbellek
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) {
          const c = await caches.open(CACHE);
          c.put(req, res.clone());
        }
        return res;
      } catch (x) {
        return (await caches.match(req, { ignoreSearch: true })) ||
               (req.mode === 'navigate' ? await caches.match('index.html') : Response.error());
      }
    })());
    return;
  }

  // Excel ve sürükleme kütüphaneleri: önce önbellek
  if (DIS.includes(req.url)) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    })());
  }
  // Apps Script API isteklerine dokunulmaz.
});

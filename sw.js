// Service worker: simpan semua fail supaya app boleh dibuka tanpa internet.
// Tukar nombor VERSION bila anda kemas kini fail app.
const VERSION = 'hkskrt2026-v5';
const ASSETS = [
  './', 'index.html', 'style.css', 'app.js', 'config.js', 'manifest.webmanifest',
  'icons/logo.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png',
  'frames/biru_potret.webp', 'frames/biru_landskap.webp',
  'frames/ungu_potret.webp', 'frames/ungu_landskap.webp',
  'frames/hijau_potret.webp', 'frames/hijau_landskap.webp',
  'frames/merahjambu_potret.webp', 'frames/merahjambu_landskap.webp',
  'frames/pantai_potret.webp', 'frames/pantai_landskap.webp',
  'frames/kuning_potret.webp', 'frames/kuning_landskap.webp',
  'frames/karnival_potret.webp', 'frames/karnival_landskap.webp',
  'frames/candyland_potret.webp', 'frames/candyland_landskap.webp'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // upload ke Google tidak disentuh
  const isImage = /\.(webp|png|jpg)$/.test(url.pathname);
  if (isImage) {
    // gambar: ambil dari simpanan dahulu
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res;
    })));
    return;
  }
  // HTML/JS/CSS: cuba internet dahulu (max 3 saat) supaya kemas kini sampai, kalau gagal guna simpanan
  e.respondWith(
    Promise.race([fetch(req), timeout(3000)]).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html')))
  );
});

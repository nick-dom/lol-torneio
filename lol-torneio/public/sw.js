/* Copa Nexus — service worker. Páginas: rede primeiro, cópia salva só se estiver sem conexão.
   Nunca guarda o painel (/admin), login, votos, inscrições nem rotas de escrita. */
const VERSION = 'v1';
const STATIC = 'nexus-static-' + VERSION, PAGES = 'nexus-pages-' + VERSION, KEEP = [STATIC, PAGES];
const PRECACHE = ['/offline', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];
const NEVER = [/^\/admin/, /^\/api\/(login|users|audit|media|adm|votos|inscricoes|push|cron|ping|riot)/];
const MAX_PAGES = 60;

// Guarda também o CSS da página /offline, para ela aparecer formatada sem internet
async function precache() {
  const c = await caches.open(STATIC); await c.add('/offline'); await Promise.all(PRECACHE.filter((u) => u !== '/offline').map((u) => c.add(u).catch(() => {})));
  try { const t = await (await c.match('/offline')).text(); const css = [...new Set(t.match(/\/_next\/static\/[^"' ]+\.css/g) || [])]; await Promise.all(css.map((u) => c.add(u).catch(() => {}))); } catch {}
}
self.addEventListener('install', (e) => { e.waitUntil(precache().then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('nexus-') && !KEEP.includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

async function trim(cache) { const ks = await cache.keys(); for (let i = 0; i < ks.length - MAX_PAGES; i++) await cache.delete(ks[i]); }
async function networkFirst(req, fallbackUrl) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(req);
    if (res.ok && res.type === 'basic') { cache.put(req, res.clone()).then(() => trim(cache)).catch(() => {}); }
    return res;
  } catch {
    const hit = await cache.match(req, { ignoreSearch: false });
    if (hit) return hit;
    if (fallbackUrl) { const off = await caches.match(fallbackUrl); if (off) return off; }
    return new Response('Sem conexão', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}
async function cacheFirst(req) {
  const c = await caches.open(STATIC), hit = await c.match(req); if (hit) return hit;
  const res = await fetch(req); if (res.ok) c.put(req, res.clone()).catch(() => {}); return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url); if (u.origin !== location.origin) return;
  if (NEVER.some((r) => r.test(u.pathname))) return;
  if (u.pathname.startsWith('/_next/static/') || /^\/(icon|apple-touch|og)/.test(u.pathname) || /^\/api\/img\//.test(u.pathname)) { e.respondWith(cacheFirst(req)); return; }
  if (req.mode === 'navigate') { e.respondWith(networkFirst(req, '/offline')); return; }
  if (u.pathname === '/api/data' || u.pathname.startsWith('/api/pub/')) { e.respondWith(networkFirst(req)); return; }
});

self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch {}
  const url = typeof d.url === 'string' && d.url.startsWith('/') ? d.url : '/';
  e.waitUntil(self.registration.showNotification(d.title || 'Copa Nexus', { body: d.body || '', icon: '/icon-192.png', badge: '/icon-192.png', tag: d.tag || 'copa-nexus', data: { url } }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close(); const url = e.notification.data?.url || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => { for (const w of ws) if ('focus' in w) { w.navigate(url).catch(() => {}); return w.focus(); } return self.clients.openWindow(url); }));
});

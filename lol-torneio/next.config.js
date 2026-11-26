const security = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];
module.exports = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: { unoptimized: true },
  async headers() {
    return [
      { source: '/(.*)', headers: security },
      // painel e APIs nunca podem ser colocados em iframe de outro site nem indexados
      { source: '/admin', headers: [{ key: 'X-Frame-Options', value: 'DENY' }, { key: 'Cache-Control', value: 'no-store' }, { key: 'X-Robots-Tag', value: 'noindex' }] },
      { source: '/api/(.*)', headers: [{ key: 'X-Frame-Options', value: 'DENY' }] },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }, { key: 'Service-Worker-Allowed', value: '/' }, { key: 'Content-Type', value: 'application/javascript; charset=utf-8' }] },
      { source: '/(icon-192.png|icon-512.png|icon-maskable-512.png|apple-touch-icon.png|og.png)', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }] },
    ];
  },
};

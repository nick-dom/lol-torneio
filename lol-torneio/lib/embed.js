// Converte QUALQUER link de transmissão em algo que dá para tocar dentro do site.
// Roda no navegador (precisa do hostname para o Twitch). Nunca devolve URL que não seja https.
//
// Retorno: null (link inválido) ou
//   { type:'iframe', src, provider, sandbox, open }  → player em <iframe>
//   { type:'hls',    src, provider, open }           → stream .m3u8 (hls.js / nativo no iOS)
//   { type:'video',  src, provider, open }           → arquivo .mp4/.webm direto
//   { type:'link',   provider, open, note }          → não dá para incorporar, mostra botão

const YT_ID = /^[\w-]{11}$/;
const host = (u) => u.hostname.replace(/^(www|m|mobile|gaming|music)\./, '').toLowerCase();
const is = (h, ...d) => d.some((x) => h === x || h.endsWith('.' + x));
const seg = (u) => u.pathname.split('/').filter(Boolean);

function toUrl(raw) {
  let s = String(raw || '').trim();
  if (!s || s.length > 2000) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s.replace(/^\/\//, '');
  try {
    const u = new URL(s);
    if (u.protocol === 'http:') u.protocol = 'https:'; // http dentro de site https é bloqueado pelo navegador
    return u.protocol === 'https:' ? u : null;
  } catch { return null; }
}

// Se colaram o código <iframe ...> do provedor, aproveita o src
function fromIframeCode(raw) {
  const m = String(raw || '').match(/<iframe[^>]+src\s*=\s*["']([^"']+)["']/i);
  return m ? m[1].replace(/&amp;/g, '&') : raw;
}

const NO_REFERRER = { referrerPolicy: 'strict-origin-when-cross-origin' };

export function parseLive(raw, hostname) {
  const url = toUrl(fromIframeCode(raw));
  if (!url) return null;
  const h = host(url), p = seg(url), open = url.href;
  const parent = encodeURIComponent(hostname || (typeof location !== 'undefined' ? location.hostname : 'localhost'));
  const ok = (provider, src, extra = {}) => ({ type: 'iframe', provider, src, open, sandbox: false, ...NO_REFERRER, ...extra });

  // ── Arquivos / streams diretos ──
  if (/\.m3u8$/i.test(url.pathname)) return { type: 'hls', provider: 'HLS (.m3u8)', src: open, open };
  if (/\.(mp4|webm|ogv|mov|m4v)$/i.test(url.pathname)) return { type: 'video', provider: 'Vídeo direto', src: open, open };

  // ── YouTube ──
  if (is(h, 'youtube.com', 'youtube-nocookie.com') || h === 'youtu.be') {
    let id = '';
    if (h === 'youtu.be') id = p[0] || '';
    else if (['embed', 'live', 'shorts', 'v'].includes(p[0]) && p[1] !== 'live_stream') id = p[1] || '';
    else if (p[0] === 'watch') id = url.searchParams.get('v') || '';
    if (YT_ID.test(id)) return ok('YouTube', `https://www.youtube.com/embed/${id}?autoplay=0&rel=0&playsinline=1`);
    // youtube.com/channel/UCxxxx/live  (ou embed/live_stream?channel=UCxxxx)
    const ch = p[0] === 'channel' ? p[1] : url.searchParams.get('channel');
    if (ch && /^UC[\w-]{22}$/.test(ch)) return ok('YouTube', `https://www.youtube.com/embed/live_stream?channel=${ch}&rel=0&playsinline=1`);
    return { type: 'link', provider: 'YouTube', open, note: 'Para tocar aqui, use o link do vídeo da live (youtube.com/watch?v=… ou youtu.be/…) ou o link do canal no formato youtube.com/channel/UC…/live.' };
  }

  // ── Twitch ──
  if (h === 'player.twitch.tv') {
    const q = new URLSearchParams(url.search); q.delete('parent');
    return ok('Twitch', `https://player.twitch.tv/?${q.toString()}${q.toString() ? '&' : ''}parent=${parent}`);
  }
  if (h === 'clips.twitch.tv' && p[0]) return ok('Twitch', `https://clips.twitch.tv/embed?clip=${encodeURIComponent(p[0])}&parent=${parent}&autoplay=false`);
  if (is(h, 'twitch.tv')) {
    if (p[0] === 'videos' && /^\d+$/.test(p[1] || '')) return ok('Twitch', `https://player.twitch.tv/?video=v${p[1]}&parent=${parent}&autoplay=false`);
    if (p[1] === 'clip' && p[2]) return ok('Twitch', `https://clips.twitch.tv/embed?clip=${encodeURIComponent(p[2])}&parent=${parent}&autoplay=false`);
    if (/^\w{2,25}$/.test(p[0] || '') && !['directory', 'videos', 'downloads', 'jobs', 'turbo', 'settings'].includes(p[0]))
      return ok('Twitch', `https://player.twitch.tv/?channel=${p[0]}&parent=${parent}&autoplay=false`);
  }

  // ── Kick ──
  if (h === 'player.kick.com' && p[0]) return ok('Kick', `https://player.kick.com/${encodeURIComponent(p[0])}`);
  if (h === 'kick.com' && /^[\w-]{2,40}$/.test(p[0] || '') && p[0] !== 'video') return ok('Kick', `https://player.kick.com/${p[0]}`);

  // ── Facebook ──
  if (is(h, 'facebook.com', 'fb.watch')) return ok('Facebook', `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(open)}&show_text=false&width=734`);

  // ── Vimeo ──
  if (h === 'player.vimeo.com') return ok('Vimeo', open);
  if (h === 'vimeo.com') {
    if (p[0] === 'event' && /^\d+$/.test(p[1] || '')) return ok('Vimeo', `https://vimeo.com/event/${p[1]}/embed`);
    if (/^\d+$/.test(p[0] || '')) return ok('Vimeo', `https://player.vimeo.com/video/${p[0]}${/^[\w]{6,}$/.test(p[1] || '') ? '?h=' + p[1] : ''}`);
  }

  // ── Dailymotion ──
  if (is(h, 'dailymotion.com') || h === 'dai.ly') {
    const id = h === 'dai.ly' ? p[0] : p[0] === 'video' ? p[1] : '';
    if (/^[a-z0-9]+$/i.test(id || '')) return ok('Dailymotion', `https://geo.dailymotion.com/player.html?video=${id}`);
  }

  // ── Qualquer outro site: tenta incorporar a própria página (ou o player que colaram) ──
  // sandbox: o site de terceiros roda isolado (sem navegar a página principal, sem formulários).
  return { type: 'iframe', provider: h, src: open, open, sandbox: true, generic: true, ...NO_REFERRER };
}

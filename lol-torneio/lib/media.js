// Helpers compartilhados (servidor e navegador) da área de mídia
export const MAX_IMG = 400 * 1024; // 400 KB
export const ID_RE = /^[a-f0-9]{16}$/;
export const pk = (teamId, nick) => `${teamId}::${nick}`;

// Aceita links do YouTube (inclusive não listados): watch?v=, youtu.be/, shorts/, embed/, live/
export function ytId(url) {
  const m = String(url || '').trim().match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})(?![\w-])/);
  return m ? m[1] : '';
}
const s = (v, n) => String(v ?? '').slice(0, n);

// Garante a estrutura e descarta qualquer valor inválido (nunca confia no que vem do navegador)
export function cleanMedia(m) {
  const items = (Array.isArray(m?.items) ? m.items : []).filter(Boolean).slice(0, 300).map((x) => {
    const base = { id: s(x.id, 40) || 'm' + Math.random().toString(36).slice(2, 10), title: s(x.title, 120), caption: s(x.caption, 500), date: s(x.date, 10) };
    if (x.kind === 'video' && /^[\w-]{11}$/.test(x.yt || '')) return { ...base, kind: 'video', yt: x.yt };
    if (x.kind === 'photo' && ID_RE.test(x.img || '')) return { ...base, kind: 'photo', img: x.img };
    return null;
  }).filter(Boolean);
  const players = {};
  if (m?.players && typeof m.players === 'object' && !Array.isArray(m.players))
    for (const [k, v] of Object.entries(m.players)) if (k.length <= 120 && ID_RE.test(v)) players[k] = v;
  return { items, players };
}
export const imageIds = (m) => [...(m?.items || []).filter((x) => x.img).map((x) => x.img), ...Object.values(m?.players || {})];

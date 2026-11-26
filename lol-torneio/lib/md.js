// Formatação simples e SEGURA para notícias (nunca gera HTML cru: o resultado é uma árvore que o React renderiza).
// Suporta: # ## ### títulos, listas "- ", citação "> ", linha "---", **negrito**, *itálico*, [texto](https://link) e ![alt](https://imagem | /api/img/ID)
const IMG_LOCAL = /^\/api\/img\/[a-f0-9]{16}$/;
export function safeUrl(u, img = false) {
  const x = String(u || '').trim();
  if (img && IMG_LOCAL.test(x)) return x;
  try { const p = new URL(x); return p.protocol === 'https:' ? p.href : ''; } catch { return ''; }
}
export function inline(text) {
  const out = []; let rest = String(text);
  const re = /(!?)\[([^\]]{0,200})\]\(([^)\s]{1,500})\)|\*\*([^*]{1,500})\*\*|\*([^*]{1,500})\*/;
  while (rest) {
    const m = re.exec(rest);
    if (!m) { out.push({ t: 'text', v: rest }); break; }
    if (m.index) out.push({ t: 'text', v: rest.slice(0, m.index) });
    if (m[3] !== undefined) {
      const url = safeUrl(m[3], m[1] === '!');
      if (!url) out.push({ t: 'text', v: m[0] });
      else if (m[1]) out.push({ t: 'img', src: url, alt: m[2] });
      else out.push({ t: 'link', href: url, kids: [{ t: 'text', v: m[2] || url }] });
    } else if (m[4] !== undefined) out.push({ t: 'b', kids: inline(m[4]) });
    else out.push({ t: 'i', kids: inline(m[5]) });
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}
export function parse(src) {
  const lines = String(src || '').replace(/\r/g, '').split('\n'), blocks = [];
  let para = [], list = null;
  const flush = () => { if (para.length) { blocks.push({ t: 'p', kids: inline(para.join(' ')) }); para = []; } if (list) { blocks.push(list); list = null; } };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (!l.trim()) { flush(); continue; }
    let m;
    if ((m = /^(#{1,3})\s+(.+)$/.exec(l))) { flush(); blocks.push({ t: 'h', n: m[1].length + 1, kids: inline(m[2]) }); }
    else if (/^---+$/.test(l)) { flush(); blocks.push({ t: 'hr' }); }
    else if ((m = /^>\s?(.*)$/.exec(l))) { flush(); blocks.push({ t: 'q', kids: inline(m[1]) }); }
    else if ((m = /^[-*]\s+(.+)$/.exec(l))) { if (para.length) flush(); (list ||= { t: 'ul', items: [] }).items.push(inline(m[1])); }
    else { if (list) flush(); para.push(l.trim()); }
  }
  flush();
  return blocks;
}
export const plain = (src, n = 160) => String(src || '').replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#>*_`-]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

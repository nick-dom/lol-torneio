import { parse } from '@/lib/md';
// Renderiza o texto de notícias. Gera só elementos React (nada de HTML cru), então não há injeção de scripts.
const K = ({ kids }) => kids.map((k, i) => {
  if (k.t === 'text') return k.v;
  if (k.t === 'b') return <strong key={i}><K kids={k.kids} /></strong>;
  if (k.t === 'i') return <em key={i}><K kids={k.kids} /></em>;
  if (k.t === 'link') return <a key={i} href={k.href} target="_blank" rel="noopener noreferrer nofollow"><K kids={k.kids} /></a>;
  if (k.t === 'img') return <img key={i} src={k.src} alt={k.alt} loading="lazy" referrerPolicy="no-referrer" />;
  return null;
});
export default function Md({ text }) {
  return <div className="md">{parse(text).map((b, i) => {
    if (b.t === 'h') { const H = 'h' + Math.min(4, b.n); return <H key={i}><K kids={b.kids} /></H>; }
    if (b.t === 'p') return <p key={i}><K kids={b.kids} /></p>;
    if (b.t === 'q') return <blockquote key={i}><K kids={b.kids} /></blockquote>;
    if (b.t === 'hr') return <hr key={i} />;
    if (b.t === 'ul') return <ul key={i}>{b.items.map((it, j) => <li key={j}><K kids={it} /></li>)}</ul>;
    return null;
  })}</div>;
}

import { Page } from '@/components/Perfil';
import { listPub } from '@/lib/cms';
import { dtBR, img } from '@/lib/pubview';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notícias — Copa Nexus', description: 'Novidades e comunicados do torneio.' };
const byDate = (a, b) => b.publishedAt.localeCompare(a.publishedAt);
export default async function Noticias({ searchParams: sp }) {
  const all = (await listPub('noticias')).sort(byDate);
  const cats = [...new Set(all.map((n) => n.category).filter(Boolean))], tags = [...new Set(all.flatMap((n) => n.tags))].slice(0, 20);
  const cat = cats.includes(sp?.cat) ? sp.cat : '', tag = tags.includes(sp?.tag) ? sp.tag : '';
  const items = all.filter((n) => (!cat || n.category === cat) && (!tag || n.tags.includes(tag)));
  const feat = !cat && !tag ? items.filter((n) => n.featured).slice(0, 3) : [];
  const card = (n) => (
    <a key={n.id} className="ncard" href={'/noticias/' + n.slug}>
      {n.cover ? <img src={img(n.cover)} alt="" loading="lazy" /> : <span className="noimg">Copa Nexus</span>}
      <div><small>{[n.category, dtBR(n.publishedAt)].filter(Boolean).join(' · ')}</small><h3>{n.title}</h3>{n.subtitle && <p>{n.subtitle}</p>}</div>
    </a>
  );
  return (
    <Page>
      <section className="panel"><div className="ph"><h2>Notícias</h2></div>
        {(cats.length > 0 || tags.length > 0) && <div className="chips">
          <a className={'chip' + (!cat && !tag ? ' on' : '')} href="/noticias">Todas</a>
          {cats.map((c) => <a key={c} className={'chip' + (cat === c ? ' on' : '')} href={'?cat=' + encodeURIComponent(c)}>{c}</a>)}
          {tags.map((t) => <a key={t} className={'chip' + (tag === t ? ' on' : '')} href={'?tag=' + encodeURIComponent(t)}>#{t}</a>)}
        </div>}
        {feat.length > 0 && <><h3 className="sh">Em destaque</h3><div className="ngrid feat">{feat.map(card)}</div><h3 className="sh">Mais notícias</h3></>}
        {items.length ? <div className="ngrid">{items.filter((n) => !feat.includes(n)).map(card)}</div> : <p className="note">Nenhuma notícia publicada ainda.</p>}
      </section>
    </Page>
  );
}

import { notFound } from 'next/navigation';
import { Page } from '@/components/Perfil';
import Md from '@/components/Md';
import { listPub } from '@/lib/cms';
import { plain } from '@/lib/md';
import { dtBR, img } from '@/lib/pubview';
export const dynamic = 'force-dynamic';
const find = async (slug) => (await listPub('noticias')).find((n) => n.slug === slug);
export async function generateMetadata({ params }) {
  const n = await find(params.slug); if (!n) return { title: 'Notícia não encontrada', robots: { index: false } };
  const description = n.subtitle || plain(n.content);
  return { title: n.title + ' — Copa Nexus', description, openGraph: { type: 'article', title: n.title, description, publishedTime: n.publishedAt, images: n.cover ? [{ url: img(n.cover) }] : undefined } };
}
export default async function Noticia({ params }) {
  const n = await find(params.slug); if (!n) notFound();
  return (
    <Page>
      <article className="panel news-art">
        <p className="kicker">{[n.category, dtBR(n.publishedAt)].filter(Boolean).join(' · ')}</p>
        <h1>{n.title}</h1>
        {n.subtitle && <p className="sub">{n.subtitle}</p>}
        <p className="note">Por {n.author}</p>
        {n.cover && <img className="cover" src={img(n.cover)} alt="" />}
        <Md text={n.content} />
        {n.tags.length > 0 && <div className="chips" style={{ marginTop: 16 }}>{n.tags.map((t) => <a key={t} className="chip" href={'/noticias?tag=' + encodeURIComponent(t)}>#{t}</a>)}</div>}
        <p style={{ marginTop: 18 }}><a className="btn" href="/noticias">← Todas as notícias</a></p>
      </article>
    </Page>
  );
}

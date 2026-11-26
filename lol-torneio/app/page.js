import Site from '@/components/Site';
import { load } from '@/lib/store';
import { listPub } from '@/lib/cms';
import { vagas } from '@/lib/inscr';
import { fmtLocal } from '@/lib/tz';
export const dynamic = 'force-dynamic';
// Os blocos extras nunca derrubam a página inicial: se algo falhar, ela abre sem eles.
async function extras(d) {
  try {
    const [bc, news, v] = await Promise.all([listPub('transmissoes'), listPub('noticias'), vagas(d)]);
    return {
      broadcasts: bc.filter((b) => ['agendada', 'ao_vivo'].includes(b.status)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3).map((b) => ({ id: b.id, title: b.title, when: fmtLocal(b.date), live: b.status === 'ao_vivo' })),
      news: news.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 3).map((n) => ({ slug: n.slug, title: n.title, subtitle: n.subtitle })),
      vagas: v,
    };
  } catch (e) { console.error('[home extras]', e); return {}; }
}
export default async function Page() { const d = await load(); return <Site data={d} extras={await extras(d)} />; }

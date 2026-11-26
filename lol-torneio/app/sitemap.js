import { SITE } from '@/lib/site';
import { listPub } from '@/lib/cms';
import { listSeasons } from '@/lib/seasons';
export const dynamic = 'force-dynamic';
export default async function sitemap() {
  const fixed = ['', '/midia', '/estatisticas', '/draft', '/simulador', '/noticias', '/transmissoes', '/vods', '/votacao', '/hall-da-fama', '/temporadas', '/inscricao'].map((p) => ({ url: SITE + p, changeFrequency: 'hourly', priority: p ? 0.6 : 1 }));
  try {
    const [news, seasons] = await Promise.all([listPub('noticias'), listSeasons()]);
    return [...fixed, ...news.map((n) => ({ url: `${SITE}/noticias/${n.slug}`, lastModified: n.updatedAt, priority: 0.5 })), ...seasons.filter((s) => s.status !== 'ativa').map((s) => ({ url: `${SITE}/temporadas/${s.id}`, priority: 0.4 }))];
  } catch { return fixed; }
}

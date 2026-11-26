import { Page } from '@/components/Perfil';
import VodCard from '@/components/VodCard';
import { listPub } from '@/lib/cms';
import { listSeasons, getSeasonData } from '@/lib/seasons';
import { load } from '@/lib/store';
import { matchInfo, dayBR, img } from '@/lib/pubview';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Partidas gravadas — Copa Nexus', description: 'VODs e melhores momentos do torneio.' };
export default async function Vods({ searchParams: sp }) {
  const live = await load(), seasons = await listSeasons(live), all = await listPub('vods');
  const cache = {}; const dataOf = async (id) => (cache[id] ||= await getSeasonData(id, live));
  const rows = [];
  for (const v of all) { const d = await dataOf(v.seasonId), mi = v.matchId && d ? matchInfo(d, v.matchId) : null; rows.push({ v, mi, teams: mi ? [mi.a?.name, mi.b?.name].filter(Boolean) : [] }); }
  const temp = seasons.some((s) => s.id === sp?.temp) ? sp.temp : '', equipe = sp?.equipe || '';
  const teamNames = [...new Set(rows.flatMap((r) => r.teams))].sort();
  const items = rows.filter((r) => (!temp || r.v.seasonId === temp) && (!equipe || r.teams.includes(equipe))).sort((a, b) => b.v.date.localeCompare(a.v.date));
  const q = (patch) => { const p = new URLSearchParams(); for (const [k, x] of Object.entries({ temp, equipe, ...patch })) if (x) p.set(k, x); return '?' + p.toString(); };
  const sub = (r) => [dayBR(r.v.date), r.mi ? `${r.mi.label}: ${r.mi.a?.name} x ${r.mi.b?.name}${r.mi.done ? ` (${r.mi.sa}–${r.mi.sb})` : ''}` : '', seasons.find((s) => s.id === r.v.seasonId)?.name].filter(Boolean).join(' · ');
  const grid = (list) => <div className="vgrid">{list.map((r) => <VodCard key={r.v.id} v={r.v} sub={sub(r)} preview={img(r.v.preview)} />)}</div>;
  const vods = items.filter((r) => r.v.kind === 'vod'), hl = items.filter((r) => r.v.kind === 'highlight');
  return (
    <Page>
      <section className="panel"><div className="ph"><h2>Partidas gravadas</h2></div>
        <div className="chips">
          <a className={'chip' + (!temp ? ' on' : '')} href={q({ temp: '' })}>Todas as temporadas</a>
          {seasons.map((s) => <a key={s.id} className={'chip' + (temp === s.id ? ' on' : '')} href={q({ temp: s.id })}>{s.name}</a>)}
        </div>
        {teamNames.length > 0 && <div className="chips"><a className={'chip' + (!equipe ? ' on' : '')} href={q({ equipe: '' })}>Todas as equipes</a>{teamNames.map((t) => <a key={t} className={'chip' + (equipe === t ? ' on' : '')} href={q({ equipe: t })}>{t}</a>)}</div>}
        {vods.length ? grid(vods) : <p className="note">Nenhuma partida gravada cadastrada{temp || equipe ? ' para este filtro' : ''}.</p>}
      </section>
      {hl.length > 0 && <section className="panel"><div className="ph"><h2>Melhores momentos</h2></div>{grid(hl)}</section>}
    </Page>
  );
}

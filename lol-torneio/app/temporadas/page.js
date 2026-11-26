import { Page } from '@/components/Perfil';
import { Logo } from '@/components/Logo';
import { listSeasons, getSeasonData } from '@/lib/seasons';
import { load } from '@/lib/store';
import { dayBR } from '@/lib/pubview';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Temporadas — Copa Nexus', description: 'Histórico de todas as edições da Copa Nexus.' };
const LBL = { ativa: 'Em andamento', encerrada: 'Encerrada', arquivada: 'Arquivada' };
export default async function Temporadas() {
  const live = await load(), list = await listSeasons(live), out = [];
  for (const s of list) { const d = await getSeasonData(s.id, live); out.push({ s, champ: s.result?.champion && d?.teams.find((t) => t.id === s.result.champion) }); }
  return (
    <Page>
      <section className="panel"><div className="ph"><h2>Temporadas</h2></div>
        <div className="bcgrid">{out.map(({ s, champ }) => (
          <a key={s.id} className="bc" href={s.status === 'ativa' ? '/' : '/temporadas/' + s.id}>
            <div className="bc-t"><b>{s.year}</b><span className={'st ' + (s.status === 'ativa' ? 'ao_vivo' : 'finalizada')}>{LBL[s.status]}</span></div>
            <h3>{s.name}</h3>
            <small className="mut">{[s.startDate && dayBR(s.startDate), s.endDate && 'até ' + dayBR(s.endDate)].filter(Boolean).join(' ')}</small>
            {champ ? <div className="bc-m"><Logo t={champ} s={28} /><span>Campeão: <b>{champ.name}</b></span></div> : <small className="mut">{s.status === 'ativa' ? 'Temporada atual — abre o site principal' : 'Sem campeão registrado'}</small>}
          </a>))}</div>
      </section>
    </Page>
  );
}

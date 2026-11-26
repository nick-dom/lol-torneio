import { Page } from '@/components/Perfil';
import { Logo } from '@/components/Logo';
import { listPub } from '@/lib/cms';
import { load } from '@/lib/store';
import { epoch, fmtLocal } from '@/lib/tz';
import { matchInfo, img } from '@/lib/pubview';
import { CREW_ROLES, BC_STATUS } from '@/lib/cms';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Transmissões — Copa Nexus', description: 'Calendário de transmissões, narradores e links para assistir.' };
export default async function Transmissoes() {
  const [bc, crew, d] = await Promise.all([listPub('transmissoes'), listPub('narradores'), load()]);
  const C = Object.fromEntries(crew.map((c) => [c.id, c])), now = Date.now();
  const up = bc.filter((b) => b.status === 'agendada' || b.status === 'ao_vivo').sort((a, b) => a.date.localeCompare(b.date));
  const past = bc.filter((b) => b.status === 'finalizada' || b.status === 'cancelada').sort((a, b) => b.date.localeCompare(a.date));
  const card = (b) => { const mi = b.matchId ? matchInfo(d, b.matchId) : null; return (
    <a key={b.id} className={'bc ' + b.status} href={'/transmissao/' + b.id}>
      <div className="bc-t"><b>{fmtLocal(b.date)}</b><span className={'st ' + b.status}>{b.status === 'ao_vivo' && <i className="ldot" />}{BC_STATUS[b.status]}</span></div>
      <h3>{b.title}</h3>
      {mi && <div className="bc-m"><Logo t={mi.a} s={26} /><span>{mi.a?.name || 'A definir'}</span><i>x</i><span>{mi.b?.name || 'A definir'}</span><Logo t={mi.b} s={26} /></div>}
      <small className="mut">{[b.channel || b.platform, b.crew.map((id) => C[id]?.name).filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</small>
    </a>); };
  return (
    <Page>
      <section className="panel"><div className="ph"><h2>Calendário de transmissões</h2></div>
        {up.length ? <div className="bcgrid">{up.map(card)}</div> : <p className="note">Nenhuma transmissão agendada no momento.</p>}
      </section>
      {past.length > 0 && <section className="panel"><div className="ph"><h2>Encerradas</h2></div><div className="bcgrid">{past.map(card)}</div></section>}
      <section className="panel"><div className="ph"><h2>Equipe de transmissão</h2></div>
        {crew.length ? <div className="mgrid">{crew.map((c) => (
          <div key={c.id} className="mcard">
            {c.photo ? <img src={img(c.photo)} alt={'Foto de ' + c.name} loading="lazy" /> : <div className="noimg">{c.name.slice(0, 1)}</div>}
            <b>{c.name}</b><small className="mut">{CREW_ROLES[c.role]} · {c.available ? 'Disponível' : 'Indisponível'}{c.availNote ? ` (${c.availNote})` : ''}</small>
            {c.bio && <p className="note" style={{ margin: 0 }}>{c.bio}</p>}
            <div className="sbtns">{[['twitch', 'Twitch'], ['youtube', 'YouTube'], ['x', 'X'], ['instagram', 'Instagram']].filter(([k]) => c.social?.[k]).map(([k, l]) => <a key={k} className="btn sm" href={c.social[k]} target="_blank" rel="noopener noreferrer">{l}</a>)}{c.profile && <a className="btn sm" href={c.profile} target="_blank" rel="noopener noreferrer">Perfil</a>}</div>
          </div>))}</div> : <p className="note">A equipe de transmissão será divulgada em breve.</p>}
      </section>
    </Page>
  );
}

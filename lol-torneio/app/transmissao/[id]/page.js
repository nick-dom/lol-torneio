import { notFound } from 'next/navigation';
import { Page } from '@/components/Perfil';
import { Logo } from '@/components/Logo';
import LivePlayer from '@/components/LivePlayer';
import { listPub, CREW_ROLES, BC_STATUS } from '@/lib/cms';
import { load } from '@/lib/store';
import { fmtLocal } from '@/lib/tz';
import { matchInfo, img } from '@/lib/pubview';
export const dynamic = 'force-dynamic';
const find = async (id) => (await listPub('transmissoes')).find((b) => b.id === id);
export async function generateMetadata({ params }) { const b = await find(params.id); return { title: b ? `${b.title} — Transmissão` : 'Transmissão não encontrada', robots: b ? undefined : { index: false } }; }
export default async function Transmissao({ params }) {
  const b = await find(params.id); if (!b) notFound();
  const [crew, d] = await Promise.all([listPub('narradores'), load()]);
  const mi = b.matchId ? matchInfo(d, b.matchId) : null, team = crew.filter((c) => b.crew.includes(c.id));
  return (
    <Page>
      <section className="panel">
        <p className="kicker">{BC_STATUS[b.status]} · {fmtLocal(b.date)}{b.channel ? ' · ' + b.channel : ''}</p>
        <h1 style={{ fontSize: 36, margin: '4px 0 12px' }}>{b.title}</h1>
        {mi && <div className="bc-m big"><Logo t={mi.a} s={48} /><a className="tlink" href={mi.a ? '/equipe/' + mi.a.id : '#'}>{mi.a?.name || 'A definir'}</a><i>{mi.done ? `${mi.sa} x ${mi.sb}` : 'x'}</i><a className="tlink" href={mi.b ? '/equipe/' + mi.b.id : '#'}>{mi.b?.name || 'A definir'}</a><Logo t={mi.b} s={48} /></div>}
        {mi && <p className="note">{mi.label}{mi.a && mi.b && <> · <a className="mlink" href={'/partida/' + mi.id}>Detalhes da partida</a></>}</p>}
        {b.notes && <p style={{ marginTop: 8 }}>{b.notes}</p>}
      </section>
      {b.status === 'cancelada' ? <section className="panel"><p className="note">Esta transmissão foi cancelada.</p></section>
        : b.url ? <section className="panel"><div className="ph"><h2>Assistir</h2></div><LivePlayer url={b.url} /><p style={{ marginTop: 10 }}><a className="btn gold" href={b.url} target="_blank" rel="noopener noreferrer">Assistir na plataforma ↗</a></p></section>
        : <section className="panel"><p className="note">O link da transmissão ainda não foi divulgado.</p></section>}
      {team.length > 0 && <section className="panel"><div className="ph"><h2>Narração e comentários</h2></div><div className="mgrid">{team.map((c) => <div className="mcard" key={c.id}>{c.photo ? <img src={img(c.photo)} alt="" loading="lazy" /> : <div className="noimg">{c.name.slice(0, 1)}</div>}<b>{c.name}</b><small className="mut">{CREW_ROLES[c.role]}</small>{c.profile && <a className="btn sm" href={c.profile} target="_blank" rel="noopener noreferrer">Perfil</a>}</div>)}</div></section>}
      <p><a className="btn" href="/transmissoes">← Calendário de transmissões</a></p>
    </Page>
  );
}

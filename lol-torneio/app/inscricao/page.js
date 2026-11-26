import { Page } from '@/components/Perfil';
import InscricaoForm from '@/components/InscricaoForm';
import { vagas, isOpen, getCfg } from '@/lib/inscr';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Inscrição de equipes — Copa Nexus', description: 'Inscreva a sua equipe na Copa Nexus.' };
export default async function Inscricao({ searchParams: sp }) {
  const info = { ...(await vagas()), open: await isOpen(), deadline: (await getCfg()).deadline };
  const id = typeof sp?.id === 'string' ? sp.id : '', token = typeof sp?.token === 'string' ? sp.token : '';
  return <Page><section className="panel"><div className="ph"><h1 style={{ fontSize: 30 }}>{id ? 'Acompanhar inscrição' : 'Inscrição de equipes'}</h1></div>{!id && <p className="note" style={{ marginTop: 0 }}>Campos com * são obrigatórios. Cada Riot ID só pode estar em uma equipe.</p>}</section><InscricaoForm info={info} editId={id} editToken={token} /></Page>;
}

import { load } from '@/lib/store';
import { Page } from '@/components/Perfil';
import Simulador from '@/components/Simulador';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Simulador — Copa Nexus', description: 'Simule os resultados restantes e veja a classificação e os playoffs.' };
export default async function Sim() {
  const { games, media, ...d } = await load(); // o simulador só precisa de equipes, partidas e configuração
  return <Page><Simulador d={d} /></Page>;
}

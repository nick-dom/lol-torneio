import Midia from '@/components/Midia';
import { load } from '@/lib/store';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mídia — Copa Nexus', description: 'Vídeos, fotos e jogadores do torneio.' };
export default async function Page() { return <Midia data={await load()} />; }

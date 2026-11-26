import { Page } from '@/components/Perfil';
import Votacao from '@/components/Votacao';
export const metadata = { title: 'Votação de MVP — Copa Nexus', description: 'Vote no MVP popular do torneio e veja o MVP estatístico.' };
export default function Page_() { return <Page><section className="panel"><div className="ph"><h1 style={{ fontSize: 30 }}>Votação de MVP</h1></div><p className="note" style={{ marginTop: 0 }}>Um voto por pessoa. O resultado só aparece depois que a votação for encerrada e publicada.</p></section><Votacao /></Page>; }

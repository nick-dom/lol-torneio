import { Page } from '@/components/Perfil';
import PushPrefs from '@/components/PushPrefs';
export const metadata = { title: 'Notificações — Copa Nexus' };
export default function Notificacoes() { return <Page><section className="panel"><div className="ph"><h1 style={{ fontSize: 30 }}>Notificações e app</h1></div><p className="note" style={{ marginTop: 0 }}>Você também pode instalar o Copa Nexus como aplicativo: use “Instalar o app” (Android/desktop) ou “Adicionar à Tela de Início” (iPhone).</p></section><PushPrefs /></Page>; }

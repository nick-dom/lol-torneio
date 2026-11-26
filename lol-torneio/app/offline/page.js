// Página mostrada quando não há conexão e a página pedida não está salva. Sem JavaScript: só HTML.
export const metadata = { title: 'Sem conexão — Copa Nexus', robots: { index: false } };
export default function Offline() {
  return <main id="main" className="adm-login"><div className="panel"><h2>Você está sem conexão</h2><p className="note">Esta página ainda não foi salva neste dispositivo. As páginas que você já abriu continuam disponíveis offline, mas podem estar desatualizadas.</p><p><a className="btn gold" href="/">Tentar novamente</a></p></div></main>;
}

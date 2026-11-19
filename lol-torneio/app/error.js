'use client';
export default function Error({ reset }) {
  return <main id="main" className="adm-login"><div className="panel"><h2>Algo deu errado</h2><p className="note">Não foi possível carregar esta página agora. Tente novamente em instantes.</p><button className="btn gold" onClick={reset}>Tentar novamente</button></div></main>;
}

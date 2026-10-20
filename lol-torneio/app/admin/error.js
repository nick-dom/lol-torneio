'use client';
export default function Error({ error, reset }) {
  return (
    <div className="adm-login"><div className="panel">
      <h2>Erro no painel</h2><p className="err">{error?.message || 'Erro inesperado.'}</p>
      <button className="btn gold" onClick={reset}>Tentar novamente</button><a href="/" className="back">Voltar ao site</a>
    </div></div>
  );
}

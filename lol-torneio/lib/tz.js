// Horários das partidas são guardados como "AAAA-MM-DDTHH:mm" (horário local do torneio).
// Para comparar com "agora" no servidor é preciso saber o fuso: TOURNAMENT_TZ_OFFSET (padrão -03:00, Brasília).
export const TZ_OFFSET = () => (/^[+-]\d\d:\d\d$/.test(process.env.TOURNAMENT_TZ_OFFSET || '') ? process.env.TOURNAMENT_TZ_OFFSET : '-03:00');
export const LOCAL_RE = /^\d{4}-\d\d-\d\dT\d\d:\d\d$/;
export function epoch(local) {
  if (!LOCAL_RE.test(local || '')) return null;
  const t = Date.parse(local + ':00' + TZ_OFFSET());
  return Number.isFinite(t) ? t : null;
}
export const fmtLocal = (t) => (t ? `${t.slice(8, 10)}/${t.slice(5, 7)} às ${t.slice(11, 16)}` : 'A definir');

// "Partida prestes a começar": chamado pelo Vercel Cron (vercel.json). Protegido por CRON_SECRET.
import { load } from '@/lib/store';
import { list } from '@/lib/cms';
import { epoch, fmtLocal } from '@/lib/tz';
import { sadd } from '@/lib/kv';
import { notify } from '@/lib/push';
import { safeEq } from '@/lib/auth';
export const dynamic = 'force-dynamic';
const WINDOW = 30 * 60 * 1000; // avisa quando faltam até 30 min
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response('CRON_SECRET não definido.', { status: 503 });
  if (!safeEq(req.headers.get('authorization') || '', 'Bearer ' + secret)) return new Response('Não autorizado', { status: 401 });
  const live = await load(), now = Date.now(), T = Object.fromEntries(live.teams.map((t) => [t.id, t.name])), sent = [];
  const cands = [
    ...live.matches.filter((m) => m.a && m.b && m.time && m.sa == null).map((m) => ({ k: 'm:' + m.id + ':' + m.time, at: epoch(m.time), title: `${T[m.a]} x ${T[m.b]}`, time: m.time, url: '/partida/' + m.id })),
    ...(await list('transmissoes')).filter((b) => b.status === 'agendada').map((b) => ({ k: 'b:' + b.id + ':' + b.date, at: epoch(b.date), title: b.title, time: b.date, url: '/transmissao/' + b.id })),
  ];
  for (const c of cands) {
    if (c.at == null || c.at < now || c.at - now > WINDOW) continue;
    if (!(await sadd('lol-reminded', c.k))) continue; // já avisado
    await notify('lembretes', { title: 'Começa em breve', body: `${c.title} — ${fmtLocal(c.time)}`, url: c.url }); sent.push(c.k);
  }
  return Response.json({ ok: true, avisados: sent });
}

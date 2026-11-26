import { body, fail, csrf, ipOf } from '@/lib/guard';
import { subscribe, updatePrefs, getPrefs, unsubscribe, configured, vapid, TYPES } from '@/lib/push';
import { hit } from '@/lib/kv';
import { Bad } from '@/lib/cms';
export const dynamic = 'force-dynamic';
export async function GET() { return Response.json({ configured: configured(), publicKey: configured() ? vapid().pub : '', types: TYPES }); }
export async function POST(req) {
  try {
    csrf(req); if (!configured()) throw new Bad('Notificações não estão configuradas neste servidor.', 503);
    if (!(await hit('push:' + ipOf(req), 20, 3600))) throw new Bad('Muitas tentativas.', 429);
    const b = await body(req, 5000);
    if (b.action === 'status') return Response.json(await getPrefs(b.endpoint));
    return Response.json(await subscribe(b.subscription, b.prefs));
  } catch (e) { return fail(e); }
}
export async function PUT(req) { try { csrf(req); const b = await body(req, 5000); return Response.json(await updatePrefs(b.endpoint, b.prefs)); } catch (e) { return fail(e); } }
export async function DELETE(req) { try { csrf(req); const b = await body(req, 5000); await unsubscribe(b.endpoint); return Response.json({ ok: true }); } catch (e) { return fail(e); } }

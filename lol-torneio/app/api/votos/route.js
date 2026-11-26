import { body, fail, csrf, ipOf } from '@/lib/guard';
import { listPolls, publicPoll, castVote, newVoterId, VID_RE, statMvp } from '@/lib/vote';
import { load } from '@/lib/store';
import { hit } from '@/lib/kv';
import { Bad } from '@/lib/cms';
export const dynamic = 'force-dynamic';
const getVid = (req) => (/(?:^|;\s*)vid=([a-f0-9]{32})/.exec(req.headers.get('cookie') || '') || [])[1] || '';
const secure = (req) => ((req.headers.get('x-forwarded-proto') || new URL(req.url).protocol.replace(':', '')) === 'https' ? '; Secure' : '');

export async function GET(req) {
  try {
    const live = await load(), vid = getVid(req);
    const polls = (await listPolls()).filter((p) => p.status !== 'draft');
    const out = []; for (const p of polls.slice(0, 5)) out.push(await publicPoll(p, live, vid));
    return Response.json({ polls: out, mvpEstatistico: statMvp(live) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return fail(e); }
}
export async function POST(req) {
  try {
    csrf(req);
    const b = await body(req, 2000);
    if (!(await hit('vote:' + ipOf(req), 30, 600))) throw new Bad('Muitas tentativas. Aguarde alguns minutos.', 429);
    let vid = getVid(req), fresh = false;
    if (!VID_RE.test(vid)) { vid = newVoterId(); fresh = true; }
    await castVote(String(b.poll || ''), String(b.cand || ''), vid, ipOf(req));
    return new Response('{"ok":true}', { headers: { 'Content-Type': 'application/json', ...(fresh ? { 'Set-Cookie': `vid=${vid}; HttpOnly; Path=/; SameSite=Lax; Max-Age=31536000${secure(req)}` } : {}) } });
  } catch (e) { return fail(e); }
}

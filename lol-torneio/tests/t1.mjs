process.env.ADMIN_PASSWORD = 'senha-teste-123'; process.env.SESSION_SECRET = 'segredo-teste';
const ROOT = process.cwd() + '/app/api/';
const imp = (p) => import(ROOT + p);
let pass = 0, fails = [];
const ok = (c, m) => { if (c) pass++; else { fails.push(m); console.log('  ✗ FALHA:', m); } };
let ip = 1;
async function call(mod, method, body, { cookie, raw, params, qs = '', ipv, headers = {} } = {}) {
  globalThis.__cookie = cookie || '';
  const h = { host: 'localhost', origin: 'http://localhost', 'x-forwarded-for': ipv || '10.0.0.' + (ip++), ...headers, ...(cookie ? {} : {}) };
  if (headers.cookie) h.cookie = headers.cookie;
  const req = new Request('http://localhost/api/x' + qs, { method, headers: h, body: raw ?? (body ? JSON.stringify(body) : undefined) });
  const r = await mod[method](req, { params });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { s: r.status, j, h: r.headers };
}
const login = await imp('login/route.js');
const lr = await call(login, 'POST', { user: '', password: 'senha-teste-123' });
const cookie = /adm=([^;]+)/.exec(lr.h.get('set-cookie'))[1];
ok(lr.s === 200 && cookie, 'login admin');

const insc = await imp('inscricoes/route.js'), logo = await imp('inscricoes/logo/route.js'), admI = await imp('adm/inscricoes/route.js');
const mk = (n, extra = {}) => ({
  team: { name: 'Equipe ' + n, tag: 'E' + n }, rep: { name: 'Rep ' + n, contact: 'rep' + n + '@x.com' },
  players: ['Top', 'Jungle', 'Mid', 'ADC', 'Suporte'].map((l, i) => ({ nick: `P${n}${i}`, riotId: `Jog${n}${i}#BR1`, lane: l })),
  reserves: [{ nick: `R${n}`, riotId: `Res${n}#BR1` }], captain: `P${n}0`, availability: true, rulesAccepted: true, ...extra });
// ---- ETAPA 1
let r = await call(insc, 'POST', mk('A', { rulesAccepted: false })); ok(r.s === 400 && /regulamento/.test(r.j), 'exige aceite do regulamento: ' + r.j);
r = await call(insc, 'POST', { ...mk('A'), players: mk('A').players.slice(0, 4) }); ok(r.s === 400, '5 titulares obrigatórios');
r = await call(insc, 'POST', (() => { const x = mk('A'); x.players[0].riotId = 'semtag'; return x; })()); ok(r.s === 400 && /Riot ID/.test(r.j), 'riot id inválido');
r = await call(insc, 'POST', mk('A')); ok(r.s === 200 && r.j.id && r.j.token, 'cria inscrição'); const A = r.j;
r = await call(insc, 'POST', mk('A')); ok(r.s === 409, 'nome duplicado recusado: ' + r.j);
r = await call(insc, 'POST', (() => { const x = mk('B'); x.players[1].riotId = 'jogA1#br1'; return x; })()); ok(r.s === 409 && /Riot ID/.test(r.j), 'riot id duplicado entre equipes: ' + r.j);
r = await call(insc, 'POST', { ...mk('A'), team: { name: ' EQUIPE  a ' } }); ok(r.s === 409, 'duplicidade normalizada (caixa/espaços)');
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(50)]);
r = await call(logo, 'POST', null, { raw: png }); ok(r.s === 200 && /^[a-f0-9]{16}$/.test(r.j.id), 'upload logo'); const logoId = r.j.id;
r = await call(logo, 'POST', null, { raw: Buffer.from('<svg onload=alert(1)>') }); ok(r.s === 415, 'SVG recusado');
r = await call(logo, 'POST', null, { raw: Buffer.alloc(500 * 1024, 1) }); ok(r.s === 413 || r.s === 415, 'logo grande recusada');
r = await call(admI, 'GET'); ok(r.s === 401, 'lista sem login = 401');
r = await call(admI, 'GET', null, { cookie }); ok(r.s === 200 && r.j.items.length === 1 && !('tokenHash' in r.j.items[0]), 'lista admin sem segredos'); 
r = await call(admI, 'POST', { id: A.id, action: 'correcao' }, { cookie }); ok(r.s === 400, 'correção exige descrição');
r = await call(admI, 'POST', { id: A.id, action: 'correcao', note: 'Riot ID do top está errado' }, { cookie }); ok(r.s === 200 && r.j.item.status === 'aguardando_correcao', 'solicita correção');
r = await call(insc, 'GET', null, { qs: `?id=${A.id}&token=errado` }); ok(r.s === 404, 'token errado nega');
r = await call(insc, 'GET', null, { qs: `?id=${A.id}&token=${A.token}` }); ok(r.s === 200 && /Riot ID/.test(r.j.correction) && !r.j.data.rep.x, 'dono vê pedido de correção');
const fixed = { ...mk('A'), id: A.id, token: A.token, team: { name: 'Equipe A', tag: 'EA', logo: logoId } };
r = await call(insc, 'PUT', fixed); ok(r.s === 200, 'reenvio da correção: ' + JSON.stringify(r.j));
r = await call(admI, 'POST', { id: A.id, action: 'aprovar', note: 'ok' }, { cookie }); ok(r.s === 200 && r.j.item.status === 'aprovada' && r.j.vagas.filled === 1, 'aprova e conta vaga: ' + JSON.stringify(r.j));
const store = await import(process.cwd() + '/lib/store.js');
let live = await store.load(true); const tm = live.teams.find((t) => t.reg === A.id);
ok(tm && tm.name === 'Equipe A' && tm.players.length === 5 && tm.reserves[0] === 'RA' && tm.logo === '/api/img/' + logoId && tm.profiles.PA0.riotId === 'JogA0#BR1', 'equipe oficial criada com jogadores e logo');
// rejeitar libera vaga e nome
r = await call(admI, 'POST', { id: A.id, action: 'rejeitar', note: 'teste' }, { cookie }); ok(r.s === 200 && r.j.vagas.filled === 0, 'rejeitar libera vaga');
live = await store.load(true); ok(!live.teams.some((t) => t.reg) && live.teams.some((t) => t.name === 'Time A'), 'slot restaurado ao padrão');
r = await call(insc, 'POST', mk('A')); ok(r.s === 200, 'após rejeição, nome pode ser reutilizado'); 
// sem vagas
const ids = []; for (const n of ['C', 'D', 'E', 'F', 'G', 'H']) { const x = await call(insc, 'POST', mk(n)); ids.push(x.j.id); }
let okc = 0, last; for (const id of ids) { last = await call(admI, 'POST', { id, action: 'aprovar' }, { cookie }); if (last.s === 200) okc++; }
ok(okc === 5 && last.s === 409 && /vagas/.test(last.j), `limite de vagas (aprovadas ${okc}): ${last.j}`);
r = await call(insc, 'GET'); ok(r.j.filled === 5 && r.j.free === 0, 'vagas públicas atualizadas');
// pendentes não aparecem como oficiais
const rp = await call(insc, 'GET'); ok(!JSON.stringify(rp.j).includes('Equipe H'), 'endpoint público não vaza inscrições');
r = await call(admI, 'PUT', { open: false }, { cookie }); r = await call(insc, 'POST', mk('Z')); ok(r.s === 403, 'inscrições encerradas bloqueiam');
await call(admI, 'PUT', { open: true }, { cookie });
r = await call(insc, 'POST', mk('Y'), { headers: { origin: 'http://evil.com' } }); ok(r.s === 403, 'CSRF: origem externa bloqueada');

console.log(`\nETAPA 1: ${pass} ok, ${fails.length} falhas`);
globalThis.__ctx = { call, cookie, imp, ok, store };
export { call, cookie, imp, ok, store, fails, pass };

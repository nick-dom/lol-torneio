import { call, cookie, imp, ok, store, fails } from './t2.mjs';
const T = await imp('adm/temporadas/route.js'), data = await imp('data/route.js'), adm = await imp('adm/[col]/route.js');
const seasons = await import(process.cwd() + '/lib/seasons.js'), hall = await import(process.cwd() + '/lib/hall.js');
let r = await call(T, 'GET'); ok(r.s === 401, 'temporadas exige login');
r = await call(T, 'GET', null, { cookie }); ok(r.s === 200 && r.j.length === 1 && r.j[0].status === 'ativa' && r.j[0].id === 's1', 'temporada 1 criada a partir dos dados existentes');
r = await call(T, 'POST', { action: 'nova' }, { cookie }); ok(r.s === 409, 'não cria nova com a atual ativa');
r = await call(T, 'POST', { action: 'encerrar' }, { cookie }); ok(r.s === 409 && /final/.test(r.j), 'não encerra sem campeão');
// Prepara resultado completo: define placares dos grupos e mata-mata
let live = await store.load(true);
live.matches.forEach((m, i) => { if (m.phase === 'g') { m.sa = 1; m.sb = 0; } });
const { bracket } = await import(process.cwd() + '/lib/logic.js'); let B = bracket(live);
const set = (id, sa, sb) => { live.matches.find((m) => m.id === id).sa = sa; live.matches.find((m) => m.id === id).sb = sb; };
set('sf1', 2, 0); set('sf2', 2, 1); B = bracket(live); set('third', 1, 0); set('final', 3, 1);
live.games = { g1: [{ winner: 'a', dur: '30:00', first: {}, bans: { a: [], b: [] }, obj: { a: {}, b: {} }, mvp: '', players: { a: [{ nick: 'PA0', champ: 'Ahri', pick: 1, k: 10, d: 2, a: 5, cs: 300, gold: 15000, dmg: 30000, vision: 20, wards: 5 }], b: [] } }] };
await store.save(live);
const before = JSON.stringify((await store.load(true)).matches);
r = await call(T, 'POST', { action: 'encerrar' }, { cookie }); ok(r.s === 200 && r.j.status === 'encerrada' && r.j.result.champion, 'encerra com campeão: ' + JSON.stringify(r.j.result?.champion));
const champ = r.j.result.champion;
r = await call(T, 'POST', { action: 'encerrar' }, { cookie }); ok(r.s === 409, 'não encerra duas vezes');
// painel antigo (com seasonId s1) tenta salvar depois de nova temporada
const stale = await (await imp('data/route.js')).GET(); const staleData = await stale.json();
r = await call(T, 'POST', { action: 'nova', name: 'Copa Nexus II', year: 2027, startDate: '2027-03-10' }, { cookie }); ok(r.s === 200 && r.j.id === 's2' && r.j.status === 'ativa', 'cria temporada 2: ' + JSON.stringify(r.j));
live = await store.load(true); ok(live.config.seasonId === 's2' && live.teams.every((t) => !t.players.length && !t.reg) && live.matches.every((m) => m.sa == null) && !Object.keys(live.games).length, 'temporada nova começa limpa');
const snap = await seasons.getSeasonData('s1'); ok(snap && JSON.stringify(snap.matches) === before && snap.games.g1.length === 1, 'temporada 1 preservada idêntica');
ok(snap.teams.some((t) => t.reg && t.players.length === 5), 'jogadores e equipes de s1 preservados');
r = await call(data, 'PUT', staleData, { cookie }); ok(r.s === 409, 'painel desatualizado não sobrescreve temporada nova: ' + r.j);
live = await store.load(true); ok(live.config.seasonId === 's2' && !live.teams.some((t) => t.reg), 'dados novos intactos após PUT obsoleto');
// jogador em outra equipe numa temporada nova (inscrição + aprovação)
const insc = await imp('inscricoes/route.js'), admI = await imp('adm/inscricoes/route.js');
const mk = (n) => ({ team: { name: 'Nova ' + n, tag: 'N' }, rep: { name: 'Rep', contact: 'r@x.com' }, players: ['Top', 'Jungle', 'Mid', 'ADC', 'Suporte'].map((l, i) => ({ nick: `P${'A'}${i}`, riotId: `JogA${i}#BR1`, lane: l })), reserves: [], availability: true, rulesAccepted: true });
r = await call(insc, 'POST', mk('X')); ok(r.s === 200, 'mesmos jogadores podem se inscrever em outra equipe na nova temporada (claims liberados?) ' + JSON.stringify(r.j));
if (r.s === 200) { const a = await call(admI, 'POST', { id: r.j.id, action: 'aprovar' }, { cookie }); ok(a.s === 200, 'aprova na temporada 2'); }
// correção administrativa
r = await call(T, 'POST', { action: 'corrigir', id: 's1', matchId: 'g1', sa: 0, sb: 1 }, { cookie }); ok(r.s === 400, 'correção exige motivo');
r = await call(T, 'POST', { action: 'corrigir', id: 's1', matchId: 'g1', sa: 0, sb: 1, reason: 'Placar lançado errado na ata' }, { cookie }); ok(r.s === 200 && r.j.corrections.length === 1 && r.j.corrections[0].from === '1x0', 'correção registrada com motivo e valor anterior');
r = await call(T, 'POST', { action: 'corrigir', id: 's2', matchId: 'g1', sa: 0, sb: 1, reason: 'abc def' }, { cookie }); ok(r.s === 409, 'não corrige temporada ativa por aqui');
r = await call(T, 'POST', { action: 'editar', id: 's2', status: 'arquivada' }, { cookie }); ok(r.s === 409, 'ativa não arquiva');
r = await call(T, 'POST', { action: 'editar', id: 's1', status: 'arquivada', name: 'Copa Nexus I' }, { cookie }); ok(r.s === 200 && r.j.status === 'arquivada' && r.j.name === 'Copa Nexus I', 'arquiva s1');
// Hall da fama
const H = await hall.buildHall(); ok(H.seasons.length === 1 && H.seasons[0].champion?.name, 'hall: campeão da s1 vindo do banco');
ok(H.records.some((x) => x.value === 10), 'hall: recorde calculado (10 abates)'); ok(H.awards.length === 1, 'hall: premiações do banco');
// temporada 1 bloqueia premiação para jogador que não existia
r = await call(adm, 'POST', { name: 'MVP S1', seasonId: 's1', winnerType: 'team', winnerTeam: snap.teams.find((t) => t.reg).id }, { cookie, params: { col: 'premiacoes' } }); ok(r.s === 200, 'premiação vinculada a temporada antiga');
r = await call(adm, 'POST', { name: 'X', seasonId: 's99' }, { cookie, params: { col: 'premiacoes' } }); ok(r.s === 400, 'temporada inexistente');
// permissões por papel
const users = await imp('users/route.js');
r = await call(users, 'POST', { login: 'arbitro1', password: 'umasenha123', role: 'arbitro', name: 'Arb' }, { cookie }); ok(r.s === 200, 'cria usuário árbitro');
const login = await imp('login/route.js'); const lr = await call(login, 'POST', { user: 'arbitro1', password: 'umasenha123' }); const c2 = /adm=([^;]+)/.exec(lr.h.get('set-cookie'))[1];
for (const [mod, method, p] of [[admI, 'GET'], [T, 'GET'], [await imp('adm/votacao/route.js'), 'GET'], [await imp('adm/push/route.js'), 'GET']]) { r = await call(mod, method, null, { cookie: c2 }); ok(r.s === 403, 'árbitro bloqueado (403) em ' + (p || 'rota')); }
r = await call(adm, 'GET', null, { cookie: c2, params: { col: 'noticias' } }); ok(r.s === 403, 'árbitro não acessa notícias');
r = await call(users, 'POST', { login: 'tv1', password: 'umasenha123', role: 'transmissao', name: 'TV' }, { cookie }); const lr3 = await call(login, 'POST', { user: 'tv1', password: 'umasenha123' }); const c3 = /adm=([^;]+)/.exec(lr3.h.get('set-cookie'))[1];
r = await call(adm, 'GET', null, { cookie: c3, params: { col: 'transmissoes' } }); ok(r.s === 200, 'equipe de transmissão acessa transmissões');
r = await call(adm, 'GET', null, { cookie: c3, params: { col: 'noticias' } }); ok(r.s === 403, 'equipe de transmissão não edita notícias');
r = await call(T, 'POST', { action: 'nova' }, { cookie: c3 }); ok(r.s === 403, 'transmissão não cria temporada');
// push sem VAPID: nada é simulado
const pushA = await imp('adm/push/route.js'); r = await call(pushA, 'POST', { title: 'Teste', body: 'x', type: 'avisos' }, { cookie }); ok(r.s === 503, 'push sem VAPID retorna 503 (não simula): ' + r.j);
const pushP = await imp('push/route.js'); r = await call(pushP, 'GET'); ok(r.j.configured === false && r.j.publicKey === '', 'config push pública informa não configurado');
r = await call(pushP, 'POST', { subscription: { endpoint: 'https://x', keys: {} } }); ok(r.s === 503, 'inscrever sem VAPID = 503');
// cron
const cron = await imp('cron/lembretes/route.js'); let cr = await cron.GET(new Request('http://localhost/x')); ok(cr.status === 503, 'cron sem CRON_SECRET = 503');
process.env.CRON_SECRET = 'cs'; cr = await cron.GET(new Request('http://localhost/x', { headers: { authorization: 'Bearer errado' } })); ok(cr.status === 401, 'cron com segredo errado = 401');
cr = await cron.GET(new Request('http://localhost/x', { headers: { authorization: 'Bearer cs' } })); ok(cr.status === 200, 'cron ok');
console.log(`\nTOTAL falhas=${fails.length}`);

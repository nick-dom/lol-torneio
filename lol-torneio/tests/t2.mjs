import { call, cookie, imp, ok, store, fails } from './t1.mjs';
let n0 = 0;
const adm = await imp('adm/[col]/route.js'), pub = await imp('pub/[col]/route.js');
const P = (col) => ({ params: { col } });
// ---- ETAPA 2
{ const { putImg, getImg } = store; await putImg('aaaaaaaaaaaaaaaa', 'image/png', 'AAAA'); await putImg('bbbbbbbbbbbbbbbb', 'image/png', 'BBBB');
  const x = await call(adm, 'POST', { name: 'Com Foto', role: 'observador', photo: 'aaaaaaaaaaaaaaaa' }, { cookie, params: { col: 'narradores' } });
  ok(x.s === 200 && await getImg('aaaaaaaaaaaaaaaa'), 'foto salva');
  await call(adm, 'POST', { ...x.j.item, photo: 'bbbbbbbbbbbbbbbb' }, { cookie, params: { col: 'narradores' } }); ok(!(await getImg('aaaaaaaaaaaaaaaa')) && await getImg('bbbbbbbbbbbbbbbb'), 'foto trocada apaga a antiga');
  await call(adm, 'DELETE', null, { cookie, params: { col: 'narradores' }, qs: '?id=' + x.j.item.id }); ok(!(await getImg('bbbbbbbbbbbbbbbb')), 'excluir item apaga a imagem'); }
let r = await call(adm, 'POST', { name: 'Narra' }, { params: { col: 'narradores' } }); ok(r.s === 401, 'crew sem login 401');
r = await call(adm, 'POST', { name: 'João Narrador', role: 'narrador', social: { twitch: 'twitch.tv/joao' }, available: true }, { cookie, ...P('narradores') }); ok(r.s === 200 && r.j.item.social.twitch === 'https://twitch.tv/joao', 'cria narrador: ' + JSON.stringify(r.j)); const crew = r.j.item;
r = await call(adm, 'POST', { name: 'X', role: 'chefe' }, { cookie, ...P('narradores') }); ok(r.s === 400, 'função inválida');
r = await call(adm, 'POST', { name: 'X', role: 'narrador', social: { x: 'javascript:alert(1)' } }, { cookie, ...P('narradores') }); ok(r.s === 400, 'link javascript: recusado');
r = await call(adm, 'POST', { title: 'Jogo 1', matchId: 'g1', date: '2026-12-01T20:00', url: 'https://www.twitch.tv/copanexus', crew: [crew.id], status: 'agendada' }, { cookie, ...P('transmissoes') }); ok(r.s === 200 && r.j.item.platform === 'twitch', 'cria transmissão: ' + JSON.stringify(r.j)); const bc = r.j.item;
r = await call(adm, 'POST', { title: 'x', matchId: 'zzz', date: '2026-12-01T20:00' }, { cookie, ...P('transmissoes') }); ok(r.s === 400, 'partida inexistente');
r = await call(adm, 'POST', { title: 'x', date: 'amanhã' }, { cookie, ...P('transmissoes') }); ok(r.s === 400, 'data inválida');
r = await call(adm, 'POST', { title: 'x', date: '2026-12-01T20:00', crew: ['naoexiste'] }, { cookie, ...P('transmissoes') }); ok(r.s === 400, 'integrante inexistente');
r = await call(adm, 'POST', { ...bc, date: '2026-12-02T21:30' }, { cookie, ...P('transmissoes') }); ok(r.s === 200 && r.j.item.date.endsWith('21:30'), 'altera horário');
r = await call(pub, 'GET', null, P('transmissoes')); ok(r.s === 200 && r.j.length === 1, 'público lista transmissões');
// VOD: partida não finalizada
r = await call(adm, 'POST', { kind: 'vod', title: 'VOD', matchId: 'g1', url: 'https://youtu.be/dQw4w9WgXcQ' }, { cookie, ...P('vods') }); ok(r.s === 400 && /finalizada/.test(r.j), 'VOD exige partida finalizada');
let live = await store.load(true); const i = live.matches.findIndex((m) => m.id === 'g1'); live.matches[i].sa = 1; live.matches[i].sb = 0; await store.save(live);
r = await call(adm, 'POST', { kind: 'vod', title: 'VOD', matchId: 'g1', url: 'https://youtu.be/dQw4w9WgXcQ' }, { cookie, ...P('vods') }); ok(r.s === 200, 'VOD de partida finalizada: ' + JSON.stringify(r.j));
r = await call(adm, 'POST', { kind: 'highlight', title: 'Melhores', url: 'http://inseguro.com/x' }, { cookie, ...P('vods') }); ok(r.s === 200 && r.j.item.url.startsWith('https://'), 'http vira https');
// Notícias
r = await call(adm, 'POST', { title: 'Grande Abertura!', content: 'Texto **forte**', status: 'draft', tags: 'Final, LoL' }, { cookie, ...P('noticias') }); ok(r.s === 200 && r.j.item.slug === 'grande-abertura', 'rascunho com slug'); const nw = r.j.item;
r = await call(pub, 'GET', null, P('noticias')); ok(r.j.length === 0, 'rascunho NÃO é público');
r = await call(adm, 'POST', { ...nw, status: 'published' }, { cookie, ...P('noticias') }); ok(r.s === 200 && r.j.item.publishedAt, 'publica');
r = await call(pub, 'GET', null, { ...P('noticias'), qs: '?slug=grande-abertura' }); ok(r.j.length === 1 && r.j[0].tags.includes('lol'), 'público por slug');
r = await call(adm, 'POST', { title: 'Grande Abertura!', content: 'outra', status: 'draft' }, { cookie, ...P('noticias') }); ok(r.j.item.slug === 'grande-abertura-2', 'slug único');
r = await call(adm, 'POST', { ...nw, status: 'published', content: '' }, { cookie, ...P('noticias') }); ok(r.s === 400, 'publicar sem conteúdo');
r = await call(adm, 'POST', { ...nw, status: 'draft' }, { cookie, ...P('noticias') }); r = await call(pub, 'GET', null, P('noticias')); ok(r.j.length === 0, 'despublicar');
r = await call(adm, 'POST', { ...nw, status: 'published', publishedAt: '2099-01-01T00:00:00Z' }, { cookie, ...P('noticias') }); r = await call(pub, 'GET', null, P('noticias')); ok(r.j.length === 0, 'agendada para o futuro não aparece');
r = await call(adm, 'DELETE', null, { cookie, ...P('noticias'), qs: '?id=' + nw.id }); ok(r.s === 200, 'exclui'); 
r = await call(adm, 'DELETE', null, { cookie, ...P('noticias'), qs: '?id=' + nw.id }); ok(r.s === 404, 'excluir de novo = 404');
r = await call(pub, 'GET', null, P('segredos')); ok(r.s === 404, 'coleção inexistente');
// ---- ETAPA 3 premiações
live = await store.load(true); const team = live.teams.find((t) => t.reg), pl = team.players[0];
r = await call(adm, 'POST', { name: 'MVP', category: 'MVP da temporada', winnerType: 'player', winnerTeam: team.id, winnerPlayer: 'inexistente' }, { cookie, ...P('premiacoes') }); ok(r.s === 400, 'vencedor fora da equipe');
r = await call(adm, 'POST', { name: 'MVP da temporada', category: 'MVP da temporada', winnerType: 'player', winnerTeam: team.id, winnerPlayer: pl, date: '2026-12-20' }, { cookie, ...P('premiacoes') }); ok(r.s === 200, 'premiação válida: ' + JSON.stringify(r.j));
// votação
const vot = await imp('adm/votacao/route.js'), vp = await imp('votos/route.js');
const players = (await call(vot, 'GET', null, { cookie })).j.players; ok(players.length >= 10, 'candidatos elegíveis');
r = await call(vot, 'POST', { title: 'MVP', candidates: [players[0].id] }, { cookie }); ok(r.s === 400, 'mínimo 2 candidatos');
r = await call(vot, 'POST', { title: 'MVP Popular', candidates: [players[0].id, players[1].id, 'x::falso'] }, { cookie }); ok(r.s === 400, 'candidato inventado recusado');
r = await call(vot, 'POST', { title: 'MVP Popular', candidates: [players[0].id, players[1].id] }, { cookie }); ok(r.s === 200, 'cria votação'); const poll = r.j;
const vote = (cand, vid, ipv) => call(vp, 'POST', { poll: poll.id, cand }, { ipv, headers: vid ? { cookie: 'vid=' + vid } : {} });
r = await vote(players[0].id, 'a'.repeat(32), '1.1.1.1'); ok(r.s === 403, 'voto antes de iniciar: ' + r.j);
r = await call(vot, 'PATCH', { id: poll.id, action: 'iniciar' }, { cookie }); ok(r.s === 200, 'inicia');
r = await vote(players[0].id, null, '2.2.2.2'); ok(r.s === 200 && /vid=[a-f0-9]{32}/.test(r.h.get('set-cookie')), 'voto 1 emite cookie'); const vid1 = /vid=([a-f0-9]{32})/.exec(r.h.get('set-cookie'))[1];
r = await vote(players[1].id, vid1, '2.2.2.2'); ok(r.s === 409, 'voto duplicado bloqueado');
r = await vote('x::falso', 'b'.repeat(32), '3.3.3.3'); ok(r.s === 400, 'candidato inválido');
r = await vote(players[1].id, 'c'.repeat(32), '4.4.4.4'); ok(r.s === 200, 'outro navegador vota');
let k = 0; for (let q = 0; q < 6; q++) { const x = await vote(players[0].id, ('d' + q).repeat(16), '5.5.5.5'); if (x.s === 200) k++; } ok(k === 3, `limite por IP (${k} votos)`);
r = await call(vp, 'GET', null, { headers: { cookie: 'vid=' + vid1 } }); ok(r.j.polls[0].voted === true && r.j.polls[0].candidates.every((c) => !('votes' in c)) && r.j.polls[0].totalVotes === 5, 'durante a votação: sem contagem por candidato; total=' + r.j.polls[0].totalVotes);
ok(Array.isArray(r.j.mvpEstatistico), 'MVP estatístico separado');
r = await call(vot, 'PATCH', { id: poll.id, action: 'pausar' }, { cookie }); r = await vote(players[0].id, 'e'.repeat(32), '6.6.6.6'); ok(r.s === 403, 'pausada recusa voto');
await call(vot, 'PATCH', { id: poll.id, action: 'iniciar' }, { cookie });
r = await call(vot, 'PATCH', { id: poll.id, action: 'publicar' }, { cookie }); ok(r.s === 409, 'não publica antes de encerrar');
r = await call(vot, 'PATCH', { id: poll.id, action: 'encerrar' }, { cookie }); ok(r.s === 200, 'encerra');
r = await vote(players[0].id, 'f'.repeat(32), '7.7.7.7'); ok(r.s === 403, 'voto após encerramento recusado');
r = await call(vp, 'GET'); ok(r.j.polls[0].candidates.every((c) => !('votes' in c)), 'encerrada mas não publicada: sem placar');
await call(vot, 'PATCH', { id: poll.id, action: 'publicar' }, { cookie }); r = await call(vp, 'GET'); ok(r.j.polls[0].candidates[0].votes >= 1 && !JSON.stringify(r.j).includes('vkey'), 'resultado publicado com votos');
const adminView = (await call(vot, 'GET', null, { cookie })).j.polls[0]; ok(adminView.total === 5, 'admin vê total 5');
// janela por data
r = await call(vot, 'POST', { title: 'Expirada', candidates: [players[0].id, players[1].id], closesAt: new Date(Date.now() - 1000).toISOString() }, { cookie }); const pe = r.j;
r = await call(vot, 'PATCH', { id: pe.id, action: 'iniciar' }, { cookie }); ok(r.s === 409, 'não inicia com prazo vencido');
console.log(`\nETAPAS 2-3: falhas acumuladas=${fails.length}`);
export { call, cookie, imp, ok, store, fails };

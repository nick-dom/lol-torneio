import { cookies } from 'next/headers';
import { load, save, delImg, isPersistent } from '@/lib/store';
import { valid } from '@/lib/auth';
import { cleanMedia, imageIds } from '@/lib/media';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { return Response.json({ ...(await load(true)), _persistent: isPersistent() }); }
  catch (e) { return new Response('Falha ao ler o banco de dados: ' + e.message, { status: 500 }); }
}
export async function PUT(req) {
  if (!valid(cookies().get('adm')?.value)) return new Response('Não autorizado', { status: 401 });
  const raw = await req.text();
  if (raw.length > 3e6) return new Response('Dados grandes demais (máx. 3 MB). Reduza as imagens enviadas.', { status: 413 });
  let d; try { d = JSON.parse(raw); } catch { return new Response('JSON inválido', { status: 400 }); }
  if (!d || !Array.isArray(d.teams) || !Array.isArray(d.matches) || !d.config) return new Response('Dados inválidos', { status: 400 });
  delete d._persistent;
  let old; try { old = await load(true); } catch (e) { return new Response('Não foi possível ler o banco antes de salvar (nada foi alterado): ' + e.message, { status: 500 }); }
  // Proteção: se o navegador enviar sem o campo 'media' (painel antigo em cache), mantém a mídia já salva
  d.media = 'media' in d ? cleanMedia(d.media) : old.media;
  try { await save(d); } catch (e) { console.error('[api/data PUT]', e); return new Response('Falha ao gravar no banco: ' + e.message, { status: 500 }); }
  // Só depois de salvar: apaga do banco as imagens que não são mais usadas
  const keep = new Set(imageIds(d.media));
  await Promise.all(imageIds(old.media).filter((id) => !keep.has(id)).map(delImg));
  return Response.json({ ok: true });
}

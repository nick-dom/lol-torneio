// Reduz imagens grandes no navegador para caber em 400 KB (GIFs não são recomprimidos)
import { MAX_IMG } from './media';
export async function prep(file, maxDim = 1200) {
  if (!/^image\//.test(file.type)) throw new Error('Escolha um arquivo de imagem (JPG, PNG, WEBP ou GIF).');
  if (file.size <= MAX_IMG && /^image\/(jpeg|png|webp|gif)$/.test(file.type)) return file;
  if (file.type === 'image/gif') throw new Error('GIF acima de 400 KB. Reduza o GIF ou envie como JPG/PNG.');
  let bmp; try { bmp = await createImageBitmap(file); } catch { throw new Error('Não consegui ler esta imagem. Use JPG, PNG ou WEBP.'); }
  let scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  for (let i = 0; i < 8; i++) {
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(bmp.width * scale)); cv.height = Math.max(1, Math.round(bmp.height * scale));
    const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(bmp, 0, 0, cv.width, cv.height);
    for (const q of [0.88, 0.78, 0.68, 0.58, 0.48]) { const b = await new Promise((r) => cv.toBlob(r, 'image/jpeg', q)); if (b && b.size <= MAX_IMG - 2048) return b; }
    scale *= 0.8;
  }
  throw new Error('Não foi possível reduzir a imagem para 400 KB.');
}
export async function upload(url, file, maxDim) {
  const blob = await prep(file, maxDim);
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': blob.type || 'application/octet-stream' }, body: blob });
  if (!r.ok) throw new Error(await r.text());
  return (await r.json()).id;
}

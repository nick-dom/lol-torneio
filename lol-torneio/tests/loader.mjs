import { pathToFileURL } from 'url';
import fs from 'fs';
import path from 'path';
const ROOT = process.cwd();
export async function resolve(spec, ctx, next) {
  if (spec === 'next/headers') return { url: new URL('./next-headers.mjs', import.meta.url).href, shortCircuit: true };
  if (spec.startsWith('@/')) spec = path.join(ROOT, spec.slice(2));
  else if ((spec.startsWith('./') || spec.startsWith('../')) && ctx.parentURL?.startsWith('file://' + ROOT)) spec = path.resolve(path.dirname(new URL(ctx.parentURL).pathname), spec);
  if (path.isAbsolute(spec)) { for (const ext of ['', '.js', '/index.js']) { if (fs.existsSync(spec + ext) && fs.statSync(spec + ext).isFile()) return { url: pathToFileURL(spec + ext).href, shortCircuit: true, format: 'module' }; } }
  return next(spec, ctx);
}
export async function load(url, ctx, next) {
  if (url.startsWith('file://' + ROOT) && url.endsWith('.js')) return { format: 'module', source: fs.readFileSync(new URL(url), 'utf8'), shortCircuit: true };
  return next(url, ctx);
}

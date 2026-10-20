import crypto from 'crypto';
const key = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'dev-only';
const mac = (e) => crypto.createHmac('sha256', key()).update(String(e)).digest('hex');
export const sign = () => { const e = Date.now() + 7 * 864e5; return `${e}.${mac(e)}`; };
export function valid(tok) {
  if (!tok || !process.env.ADMIN_PASSWORD) return false;
  const [e, h] = tok.split('.');
  if (!(+e > Date.now()) || !h) return false;
  const x = mac(e);
  return h.length === x.length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(x));
}
export const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

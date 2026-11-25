import crypto from 'crypto';
const key = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'dev-only';
const mac = (e) => crypto.createHmac('sha256', key()).update(String(e)).digest('hex');
const eq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

// Sessão = { u: id do usuário ('env' = senha mestre), n: nome, r: papel, t: equipe (representante) }
export const sign = (s) => {
  const p = Buffer.from(JSON.stringify({ u: s.u, n: s.n, r: s.r, t: s.t || null, e: Date.now() + 7 * 864e5 })).toString('base64url');
  return `${p}.${mac(p)}`;
};
export function session(tok) {
  if (!tok || !process.env.ADMIN_PASSWORD) return null;
  const [p, h] = String(tok).split('.');
  if (!p || !h || !eq(h, mac(p))) return null;
  try { const s = JSON.parse(Buffer.from(p, 'base64url').toString()); return s && s.e > Date.now() ? s : null; } catch { return null; }
}
export const valid = (tok) => !!session(tok);
export const safeEq = eq;

// Senhas de usuários: scrypt com sal individual
export const hashPw = (pw) => { const salt = crypto.randomBytes(16).toString('hex'); return `${salt}:${crypto.scryptSync(String(pw), salt, 32).toString('hex')}`; };
export function checkPw(pw, stored) {
  const [salt, h] = String(stored || '').split(':');
  if (!salt || !h) return false;
  return eq(crypto.scryptSync(String(pw), salt, 32).toString('hex'), h);
}

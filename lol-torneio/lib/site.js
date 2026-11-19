// URL pública do site (Vercel preenche sozinha em produção). Usada em Open Graph, robots e sitemap.
export const SITE = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : 'http://localhost:3000');

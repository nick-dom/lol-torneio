import { SITE } from '@/lib/site';
export default function sitemap() { return ['', '/midia', '/estatisticas', '/draft', '/simulador'].map((p) => ({ url: SITE + p, changeFrequency: 'hourly', priority: p ? 0.6 : 1 })); }

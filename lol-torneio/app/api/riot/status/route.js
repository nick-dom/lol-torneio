import { getSession } from '@/lib/session';
import { configured } from '@/lib/riot';
export const dynamic = 'force-dynamic';
export async function GET() { return Response.json({ configured: !!(await getSession()) && configured() }); }

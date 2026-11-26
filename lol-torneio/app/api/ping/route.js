// Usado pelo aviso de conexão do PWA: responde sempre fresco (nunca fica em cache)
export const dynamic = 'force-dynamic';
export async function GET() { return Response.json({ t: Date.now() }, { headers: { 'Cache-Control': 'no-store' } }); }

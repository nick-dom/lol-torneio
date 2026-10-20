import Site from '@/components/Site';
import { load } from '@/lib/store';
export const dynamic = 'force-dynamic';
export default async function Page() { return <Site data={await load()} />; }

import { GET as getSync, POST as postSync } from '@/app/api/youzan/sync/route';

export const dynamic = 'force-dynamic';
export const GET = getSync;
export const POST = postSync;

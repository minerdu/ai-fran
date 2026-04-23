import { GET as getYouzan, POST as postYouzan, PUT as putYouzan } from '@/app/api/youzan/route';

export const dynamic = 'force-dynamic';
export const GET = getYouzan;
export const PUT = putYouzan;
export const POST = postYouzan;

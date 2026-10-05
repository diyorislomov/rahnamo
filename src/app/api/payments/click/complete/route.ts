import { handleClickShopRequest } from '@/lib/clickShopApi';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return handleClickShopRequest(request, '1');
}


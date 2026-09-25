import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { bodyOf, failure, HttpError, requireAdmin, uuidField } from '@/lib/server/http';
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await bodyOf(request);
    if (!['approve', 'reject', 'delete'].includes(String(body.action))) throw new HttpError(400, 'invalid_action');
    const { data, error } = await getServiceRoleClient().rpc('moderate_application', { p_id: uuidField(body.applicationId), p_action: body.action });
    if (error) throw error;
    if (!data?.success) throw new HttpError(409, 'invalid_transition');
    return NextResponse.json(data);
  } catch (error) { return failure(error); }
}

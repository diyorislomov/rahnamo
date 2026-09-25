import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';
import { bodyOf, failure, HttpError, requireAdmin, uuidField } from '@/lib/server/http';
export async function GET() {
  try {
    await requireAdmin();
    const { data, error } = await getServiceRoleClient().from('question_threads').select('*, booking:bookings(student_name,email,telegram), counselor:counselors(full_name,headline)').order('created_at', { ascending: false }).limit(1000);
    if (error) throw error;
    return NextResponse.json({ success: true, threads: data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await bodyOf(request);
    if (!['flag', 'confirm_payment'].includes(String(body.action))) throw new HttpError(400, 'invalid_action');
    const { data, error } = await getServiceRoleClient().rpc('admin_update_thread', { p_thread_id: uuidField(body.threadId), p_action: body.action });
    if (error) throw error;
    if (!data?.success) throw new HttpError(409, 'invalid_transition');
    return NextResponse.json(data);
  } catch (error) { return failure(error); }
}

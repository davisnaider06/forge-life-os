import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, sameOrigin, fail, jsonBody, admin, HttpError } from '@/lib/server';
import { syncItem } from '@/lib/pluggy';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await requireUser(),
      body = z.object({ itemId: z.string().uuid().optional() }).parse(await jsonBody(req, 2048));
    let ids = body.itemId ? [body.itemId] : [];
    if (!body.itemId) {
      const { data, error } = await admin()
        .from('forge_bank_items')
        .select('item_id')
        .eq('user_id', user.id);
      if (error) throw new HttpError(503, 'Não foi possível listar suas contas.');
      ids = (data || []).map(i => i.item_id);
    }
    const result = [];
    for (const id of ids) result.push(await syncItem(user.id, id));
    return NextResponse.json({ synced: result });
  } catch (e) {
    return fail(e);
  }
}

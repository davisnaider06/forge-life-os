import { NextResponse } from 'next/server';
import { admin, secretMatches, fail, HttpError } from '@/lib/server';
import { stats, type AppState } from '@/lib/domain';
import { sendPush } from '@/lib/push';
export async function GET(req: Request) {
  try {
    if (
      !process.env.CRON_SECRET ||
      !secretMatches(req.headers.get('authorization'), 'Bearer ' + process.env.CRON_SECRET)
    )
      throw new HttpError(401, 'Não autorizado.');
    const db = admin(),
      { data: docs, error } = await db.from('forge_documents').select('user_id,state');
    if (error) throw new HttpError(503, 'Não foi possível consultar lembretes.');
    let sent = 0;
    for (const doc of docs || []) {
      const s = doc.state as AppState;
      if (!s.notifications) continue;
      const st = stats(s),
        hour = Number(
          new Intl.DateTimeFormat('en-US', {
            timeZone: s.profile.timezone,
            hour: '2-digit',
            hourCycle: 'h23',
          }).format(new Date()),
        );
      const kind = hour === 8 ? 'morning' : hour === 21 && !st.activeToday ? 'streak' : null;
      if (!kind) continue;
      const { subscriptions } = await (async () => {
        const { data } = await db
          .from('forge_push_subscriptions')
          .select('id,subscription')
          .eq('user_id', doc.user_id);
        return { subscriptions: data || [] };
      })();
      if (!subscriptions.length) continue;
      const { error: duplicate } = await db
        .from('forge_notification_receipts')
        .insert({ user_id: doc.user_id, day: st.day, kind });
      if (duplicate) continue;
      let delivered = false;
      for (const sub of subscriptions) {
        try {
          await sendPush(
            sub.subscription,
            kind === 'morning' ? 'Cada dia conta.' : 'Ainda dá tempo.',
            kind === 'morning'
              ? 'Escolha seu primeiro passo de hoje.'
              : 'Uma pequena ação mantém sua sequência.',
          );
          delivered = true;
          sent++;
        } catch (e) {
          if (
            e &&
            typeof e === 'object' &&
            'statusCode' in e &&
            [404, 410].includes(Number(e.statusCode))
          )
            await db.from('forge_push_subscriptions').delete().eq('id', sub.id);
        }
      }
      if (!delivered)
        await db
          .from('forge_notification_receipts')
          .delete()
          .eq('user_id', doc.user_id)
          .eq('day', st.day)
          .eq('kind', kind);
    }
    return NextResponse.json({ sent });
  } catch (e) {
    return fail(e);
  }
}

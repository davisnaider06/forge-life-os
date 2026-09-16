import 'server-only';
import webpush from 'web-push';
import { z } from 'zod';
export const pushSchema = z.object({
  endpoint: z.url().refine(value => {
    const u = new URL(value);
    return (
      u.protocol === 'https:' &&
      !u.port &&
      !u.username &&
      !u.password &&
      ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'].some(
        h => u.hostname === h || u.hostname.endsWith('.' + h),
      )
    );
  }, 'Serviço de push não reconhecido.'),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z
      .string()
      .regex(/^[A-Za-z0-9_-]+$/)
      .min(80)
      .max(200),
    auth: z
      .string()
      .regex(/^[A-Za-z0-9_-]+$/)
      .min(16)
      .max(100),
  }),
});
export async function sendPush(subscription: unknown, title: string, body: string) {
  const validated = pushSchema.parse(subscription);
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  await webpush.sendNotification(validated, JSON.stringify({ title, body, url: '/' }), {
    TTL: 3600,
    timeout: 10000,
  });
}

import { NextResponse } from 'next/server';
import { cloudConfigured, authClient } from '@/lib/server';
export async function GET() {
  const cloud = cloudConfigured();
  let user = null;
  if (cloud) {
    try {
      const client = await authClient(),
        result = await client.auth.getUser();
      if (result.data.user) user = { id: result.data.user.id, email: result.data.user.email || '' };
    } catch {}
  }
  return NextResponse.json({
    cloud,
    user,
    banking: cloud && Boolean(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET),
    push:
      cloud &&
      Boolean(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
        process.env.VAPID_PRIVATE_KEY &&
        process.env.CRON_SECRET,
      ),
  });
}

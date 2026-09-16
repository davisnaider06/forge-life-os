import { NextResponse } from 'next/server';
import { authClient, cloudConfigured } from '@/lib/server';
export async function GET(req: Request) {
  const url = new URL(req.url),
    code = url.searchParams.get('code');
  if (code && cloudConfigured()) {
    const client = await authClient(),
      { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL('/', url.origin));
  }
  return NextResponse.redirect(new URL('/perfil?auth=error', url.origin));
}

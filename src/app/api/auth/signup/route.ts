import { NextResponse } from 'next/server';
import { z } from 'zod';
import { admin, authClient, cloudConfigured, fail, HttpError, jsonBody, sameOrigin } from '@/lib/server';
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().regex(/^\d{10,11}$/, 'Celular inválido.'),
});
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    if (!cloudConfigured()) throw new HttpError(503, 'A nuvem ainda não foi configurada.');
    const body = schema.parse(await jsonBody(req));
    const created = await admin().auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { phone: body.phone },
    });
    if (created.error) {
      if (created.error.code === 'email_exists')
        throw new HttpError(409, 'Esse email já tem uma conta. Entre com sua senha.');
      throw new HttpError(400, 'Não foi possível criar a conta.');
    }
    const client = await authClient(),
      signIn = await client.auth.signInWithPassword({ email: body.email, password: body.password });
    if (signIn.error)
      throw new HttpError(500, 'Conta criada, mas não foi possível entrar automaticamente.');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

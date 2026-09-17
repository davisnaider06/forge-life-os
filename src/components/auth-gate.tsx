'use client';
import { useState, type FormEvent } from 'react';
import { browserSupabase } from '@/lib/supabase-browser';
export function AuthGate() {
  const client = browserSupabase(),
    [mode, setMode] = useState<'login' | 'signup' | 'reset' | 'reset-sent'>('login'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [sentEmail, setSentEmail] = useState('');
  const failure = error ? (
    <p role="alert" className="error-text">
      {error}
    </p>
  ) : null;
  function signIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    (async () => {
      try {
        const data = new FormData(e.currentTarget),
          email = String(data.get('email')),
          password = String(data.get('password')),
          result = await client?.auth.signInWithPassword({ email, password });
        if (result?.error) throw result.error;
        location.href = '/';
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Email ou senha inválidos.');
        setBusy(false);
      }
    })();
  }
  function signUp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    (async () => {
      try {
        const data = new FormData(e.currentTarget),
          email = String(data.get('email')),
          password = String(data.get('password')),
          confirm = String(data.get('confirm')),
          phone = String(data.get('phone')).replace(/\D/g, '');
        if (password !== confirm) throw Error('As senhas não coincidem.');
        if (phone.length < 10 || phone.length > 11)
          throw Error('Informe um celular válido, com DDD.');
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, phone }),
        });
        const result = await res.json();
        if (!res.ok) throw Error(result.error || 'Não foi possível criar a conta.');
        location.href = '/';
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Não foi possível criar a conta.');
        setBusy(false);
      }
    })();
  }
  function reset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    (async () => {
      try {
        const email = String(new FormData(e.currentTarget).get('email')),
          result = await client?.auth.resetPasswordForEmail(email, {
            redirectTo: location.origin + '/auth/callback',
          });
        if (result?.error) throw result.error;
        setSentEmail(email);
        setMode('reset-sent');
        setBusy(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Não foi possível enviar o email.');
        setBusy(false);
      }
    })();
  }
  return (
    <div className="onboarding">
      <span className="wordmark">FORGE</span>
      <div className="hero onboarding-hero">
        <img className="hero-photo" src="/assets/home-hero.webp" alt="Atleta iluminado em teal" />
        <div className="home-copy">
          <p className="hero-eyebrow">Uma vida. Seu ritmo.</p>
          <h1>
            ENTRE NO
            <br />
            SEU RITMO.
          </h1>
        </div>
      </div>
      {mode === 'reset-sent' ? (
        <>
          <h2>Verifique seu email.</h2>
          <p className="form-description">
            Enviamos um link de redefinição de senha para <strong>{sentEmail}</strong>.
          </p>
          <button
            className="primary-button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
          >
            Voltar para entrar
          </button>
        </>
      ) : mode === 'reset' ? (
        <>
          <h2>Redefinir senha.</h2>
          <p className="form-description">
            Informe seu email para receber o link de redefinição.
          </p>
          <form onSubmit={reset}>
            <label htmlFor="reset-email">Seu email</label>
            <input id="reset-email" name="email" type="email" required autoComplete="email" />
            {failure}
            <button className="primary-button" disabled={busy}>
              {busy ? 'Enviando…' : 'Enviar link de redefinição'}
            </button>
          </form>
          <button
            type="button"
            className="text-button onboarding-back"
            disabled={busy}
            onClick={() => {
              setMode('login');
              setError('');
            }}
          >
            Voltar
          </button>
        </>
      ) : (
        <>
          <h2>{mode === 'signup' ? 'Criar sua conta.' : 'Entre na sua conta.'}</h2>
          <p className="form-description">
            Seu progresso fica salvo e sincronizado entre seus dispositivos.
          </p>
          <div className="auth-tabs">
            <button
              type="button"
              className={'text-button' + (mode !== 'signup' ? ' active' : '')}
              onClick={() => {
                setMode('login');
                setError('');
              }}
            >
              Entrar
            </button>
            <button
              type="button"
              className={'text-button' + (mode === 'signup' ? ' active' : '')}
              onClick={() => {
                setMode('signup');
                setError('');
              }}
            >
              Criar conta
            </button>
          </div>
          {mode === 'signup' ? (
            <form onSubmit={signUp}>
              <label htmlFor="signup-email">Seu email</label>
              <input id="signup-email" name="email" type="email" required autoComplete="email" />
              <label htmlFor="signup-phone">Celular</label>
              <input
                id="signup-phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                required
                autoComplete="tel"
                placeholder="(12) 91234-5678"
              />
              <label htmlFor="signup-password">Senha</label>
              <input
                id="signup-password"
                name="password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
              />
              <label htmlFor="signup-confirm">Confirmar senha</label>
              <input
                id="signup-confirm"
                name="confirm"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
              />
              {failure}
              <button className="primary-button" disabled={busy}>
                {busy ? 'Criando conta…' : 'Criar conta'}
              </button>
            </form>
          ) : (
            <form onSubmit={signIn}>
              <label htmlFor="login-email">Seu email</label>
              <input id="login-email" name="email" type="email" required autoComplete="email" />
              <label htmlFor="login-password">Senha</label>
              <input
                id="login-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
              {failure}
              <button className="primary-button" disabled={busy}>
                {busy ? 'Entrando…' : 'Entrar'}
              </button>
              <button
                type="button"
                className="text-button onboarding-back"
                disabled={busy}
                onClick={() => {
                  setMode('reset');
                  setError('');
                }}
              >
                Esqueci minha senha
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

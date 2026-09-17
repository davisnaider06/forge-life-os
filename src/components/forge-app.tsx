'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useForge } from './store';
import { Icon } from './visuals';
import {
  HomeScreen,
  GoalsScreen,
  FinanceScreen,
  ProfileScreen,
  type Screen,
  type Sheet,
} from './screens';
import { Onboarding } from './onboarding';
import { AuthGate } from './auth-gate';
import { Sheets } from './sheets';
import { EnergyButton } from './energy-button';
import { stats } from '@/lib/domain';
const routes: { screen: Screen; label: string; icon: string; href: string }[] = [
  { screen: 'inicio', label: 'Início', icon: 'home', href: '/' },
  { screen: 'metas', label: 'Metas', icon: 'target', href: '/metas' },
  { screen: 'financas', label: 'Finanças', icon: 'wallet', href: '/financas' },
  { screen: 'perfil', label: 'Perfil', icon: 'user', href: '/perfil' },
];
export function ForgeApp({ screen }: { screen: Screen }) {
  const { ready, state, message, demo, dispatch, capabilities } = useForge(),
    [sheet, setSheet] = useState<Sheet | null>(null),
    [month, setMonth] = useState(() => new Date().toLocaleDateString('en-CA').slice(0, 7)),
    [filter, setFilter] = useState<string | null>(null),
    main = useRef<HTMLElement>(null),
    scroll = useRef<HTMLDivElement>(null),
    needsAuth = ready && !demo && capabilities.cloud && !capabilities.user;
  useEffect(() => {
    if (!ready || needsAuth || !state.profile.onboarded) return;
    let disposed = false;
    scroll.current?.scrollTo(0, 0);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
      import('gsap').then(({ gsap }) => {
        if (disposed || !main.current) return;
        gsap.fromTo(
          main.current.children,
          { y: 16, opacity: 0, transition: 'none' },
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            stagger: 0.06,
            ease: 'power3.out',
            clearProps: 'transform,opacity,transition',
          },
        );
      });
    return () => {
      disposed = true;
    };
  }, [ready, needsAuth, screen, state.profile.onboarded]);
  useEffect(() => {
    if (
      ready &&
      !needsAuth &&
      state.profile.onboarded &&
      !demo &&
      !state.awards['checkin:' + stats(state).day]
    )
      dispatch('checkin', {});
  }, [ready, needsAuth, demo, state, dispatch]);
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production')
      navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  const onboarded = ready && !needsAuth && state.profile.onboarded;
  return (
    <div className="device">
      <div className="app-scroll" ref={scroll}>
        {!ready ? (
          <div className="loading-forge">
            <span className="wordmark">FORGE</span>
            <p>Seu próximo passo começa aqui.</p>
          </div>
        ) : needsAuth ? (
          <AuthGate />
        ) : !onboarded ? (
          <Onboarding />
        ) : (
          <>
            <header className="app-header">
              <div>
                <Link className="wordmark" href={'/' + (demo ? '?demo=1' : '')}>
                  FORGE
                </Link>
                <p>
                  {screen === 'inicio'
                    ? `${new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'}, ${state.profile.name}`
                    : routes.find(r => r.screen === screen)?.label}
                </p>
              </div>
              <button
                className="period-button"
                onClick={() =>
                  setSheet({
                    type:
                      screen === 'perfil' ? 'profile' : screen === 'financas' ? 'month' : 'today',
                  })
                }
                aria-label={
                  screen === 'perfil'
                    ? 'Editar perfil'
                    : screen === 'financas'
                      ? 'Escolher mês'
                      : 'Resumo de hoje'
                }
              >
                {screen === 'perfil' ? (
                  <Icon name="settings" />
                ) : (
                  <>
                    {screen === 'financas'
                      ? new Date(month + '-15T12:00:00')
                          .toLocaleDateString('pt-BR', { month: 'long' })
                          .replace(/^./, c => c.toUpperCase())
                      : 'Hoje'}{' '}
                    <span>⌄</span>
                  </>
                )}
              </button>
            </header>
            <main id="screen" ref={main} tabIndex={-1}>
              {screen === 'inicio' ? (
                <HomeScreen open={setSheet} month={month} />
              ) : screen === 'metas' ? (
                <GoalsScreen open={setSheet} />
              ) : screen === 'financas' ? (
                <FinanceScreen
                  open={setSheet}
                  month={month}
                  filter={filter}
                  setFilter={setFilter}
                />
              ) : (
                <ProfileScreen open={setSheet} />
              )}
            </main>
            <footer className="page-end">
              UM POUCO MELHOR. TODOS OS DIAS.
              {demo && <span className="demo-label">Modo demonstração · dados fictícios</span>}
            </footer>
          </>
        )}
      </div>
      {onboarded && (
        <div className="navigation-dock">
          <nav className="bottom-nav" aria-label="Navegação principal">
            {routes.map(r => (
              <Link
                key={r.screen}
                href={r.href + (demo ? '?demo=1' : '')}
                className={'nav-item ' + (r.screen === screen ? 'active' : '')}
                aria-label={r.label}
                aria-current={r.screen === screen ? 'page' : undefined}
              >
                <Icon name={r.icon} />
              </Link>
            ))}
          </nav>
          <EnergyButton
            label="Registrar uma ação"
            onClick={() =>
              setSheet({
                type: screen === 'metas' ? 'goal' : screen === 'financas' ? 'transaction' : 'quick',
              })
            }
          />
        </div>
      )}
      <div className={'toast ' + (message ? 'visible' : '')} role="status" aria-live="polite">
        {message}
      </div>
      <Sheets
        sheet={sheet}
        open={setSheet}
        close={() => setSheet(null)}
        month={month}
        setMonth={setMonth}
      />
    </div>
  );
}

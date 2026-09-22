'use client';
import { useEffect, useRef, useState } from 'react';

// Vale por abertura do app: navegar entre telas não repete a entrada, recarregar repete.
let shown = false;

export function Splash({ ready }: { ready: boolean }) {
  const [phase, setPhase] = useState<'in' | 'leaving' | 'gone'>(() => (shown ? 'gone' : 'in')),
    [minimum, setMinimum] = useState(false),
    start = useRef<number | null>(null);
  useEffect(() => {
    if (phase !== 'in') return;
    const t = setTimeout(() => setMinimum(true), 1900);
    return () => clearTimeout(t);
  }, [phase]);
  useEffect(() => {
    if (phase === 'in' && ready && minimum) setPhase('leaving');
  }, [phase, ready, minimum]);
  useEffect(() => {
    if (phase !== 'leaving') return;
    shown = true;
    const t = setTimeout(() => setPhase('gone'), 700);
    return () => clearTimeout(t);
  }, [phase]);
  if (phase === 'gone') return null;
  const leave = () => ready && setPhase('leaving');
  return (
    <div
      className={'splash ' + phase}
      onClick={leave}
      onPointerDown={e => (start.current = e.clientY)}
      onPointerUp={e => {
        if (start.current !== null && start.current - e.clientY > 40) leave();
        start.current = null;
      }}
    >
      <img
        className="splash-photo"
        src="/assets/splash-mountain.webp"
        alt=""
        fetchPriority="high"
      />
      <h1 className="splash-word">FORGE</h1>
      <p className="splash-hint">
        {ready ? 'Deslize para cima para começar' : 'Preparando seu dia…'}
      </p>
      <i className="splash-bar" aria-hidden="true" />
    </div>
  );
}

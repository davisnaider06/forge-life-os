'use client';
import { useState, type FormEvent } from 'react';
import { useForge } from './store';
import { Icon } from './visuals';
export function Onboarding() {
  const { dispatch } = useForge(),
    [step, setStep] = useState(0),
    [name, setName] = useState(''),
    [city, setCity] = useState(''),
    [habits, setHabits] = useState(['Treinar 45 min', 'Estudar 30 min', 'Beber 2 L de água']),
    [goals, setGoals] = useState(['Lançar meu SaaS', 'Criar minha reserva', 'Avançar nos estudos']),
    [error, setError] = useState('');
  function submit(e: FormEvent) {
    e.preventDefault();
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    try {
      dispatch('onboard', {
        profile: {
          name: name.trim(),
          city: city.trim(),
          handle:
            name
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]/g, '')
              .slice(0, 25) || 'forge',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
        },
        habits: habits.filter(h => h.trim()),
        goals: goals.filter(g => g.trim()),
      });
    } catch {
      setError('Confira os campos para continuar.');
    }
  }
  return (
    <div className="onboarding">
      <a className="wordmark" href="/">
        FORGE
      </a>
      <div className="hero onboarding-hero">
        <img className="hero-photo" src="/assets/home-hero.webp" alt="Atleta iluminado em teal" />
        <div className="home-copy">
          <p className="hero-eyebrow">Uma vida. Seu ritmo.</p>
          <h1>
            {step === 0 ? (
              <>
                SEU PRÓXIMO
                <br />
                CAPÍTULO.
              </>
            ) : step === 1 ? (
              <>
                COMECE
                <br />
                PEQUENO.
              </>
            ) : (
              <>
                DÊ FORMA
                <br />
                AO FUTURO.
              </>
            )}
          </h1>
        </div>
      </div>
      <div className="onboarding-steps" aria-label={`Etapa ${step + 1} de 3`}>
        {[0, 1, 2].map(i => (
          <i key={i} className={i <= step ? 'active' : ''} />
        ))}
      </div>
      <form onSubmit={submit}>
        <h2>
          {
            [
              'Como podemos chamar você?',
              'Três hábitos para começar.',
              'O que você quer construir?',
            ][step]
          }
        </h2>
        <p className="form-description">
          {
            [
              'Seu progresso começa aqui. Você pode usar sem criar conta.',
              'Ações que cabem na sua rotina. Você pode mudar tudo depois.',
              'Defina seus primeiros objetivos. Os detalhes ficam para depois.',
            ][step]
          }
        </p>
        {step === 0 ? (
          <>
            <label htmlFor="onboarding-name">Nome</label>
            <input
              id="onboarding-name"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={25}
              required
              autoComplete="given-name"
              placeholder="Seu nome"
            />
            <label htmlFor="onboarding-city">Cidade</label>
            <input
              id="onboarding-city"
              value={city}
              onChange={e => setCity(e.target.value)}
              maxLength={60}
              autoComplete="address-level2"
              placeholder="Ex.: Jacareí, SP"
            />
          </>
        ) : (
          (step === 1 ? habits : goals).map((v, i) => (
            <div key={i}>
              <label htmlFor={'onboarding-' + i}>
                {step === 1 ? 'Hábito' : 'Meta'} {i + 1}
              </label>
              <input
                id={'onboarding-' + i}
                value={v}
                required
                maxLength={80}
                onChange={e => {
                  const next = [...(step === 1 ? habits : goals)];
                  next[i] = e.target.value;
                  step === 1 ? setHabits(next) : setGoals(next);
                }}
              />
            </div>
          ))
        )}
        {error && <p className="error-text">{error}</p>}
        <button className="primary-button">
          {step === 2 ? 'Começar minha jornada' : 'Continuar'} <Icon name="arrow" />
        </button>
        {step > 0 && (
          <button
            type="button"
            className="text-button onboarding-back"
            onClick={() => setStep(step - 1)}
          >
            Voltar
          </button>
        )}
      </form>
    </div>
  );
}

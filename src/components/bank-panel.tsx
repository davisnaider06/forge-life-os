'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useForge } from './store';
import { money } from '@/lib/domain';
const PluggyConnect = dynamic(() => import('react-pluggy-connect').then(m => m.PluggyConnect), {
  ssr: false,
});
export function BankPanel() {
  const { state, capabilities, demo, notify } = useForge(),
    [token, setToken] = useState(''),
    [sandbox, setSandbox] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [selected, setSelected] = useState<string | null>(null);
  async function sync(itemId?: string) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/banks/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Não foi possível sincronizar.');
      notify('Contas sincronizadas.');
      location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha na sincronização.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h2>Bancos e carteiras.</h2>
      <p>
        Conecte suas contas pelo ambiente seguro do provedor. A disponibilidade depende da
        instituição.
      </p>
      {state.accounts.map(a => (
        <button
          key={a.id}
          className="account-row"
          style={{ width: '100%', textAlign: 'left' }}
          onClick={() => setSelected(selected === a.id ? null : a.id)}
        >
          <span>
            <strong>{a.name}</strong>
            <small>
              {a.type === 'CREDIT' ? 'Saldo devedor / limite utilizado' : 'Saldo disponível'} ·{' '}
              {a.currency}
            </small>
          </span>
          <span>{money(a.balanceCents)}</span>
        </button>
      ))}
      {selected && (
        <div className="account-transactions">
          <h3>Lançamentos da conta</h3>
          {state.transactions
            .filter(t => t.accountId === selected)
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 100)
            .map(t => (
              <div className="account-row" key={t.id}>
                <span>
                  {t.name}
                  <small>
                    {t.date}
                    {t.pending ? ' · pendente' : ''}
                  </small>
                </span>
                <span>
                  {t.type === 'expense' ? '−' : '+'} {money(t.cents)}
                </span>
              </div>
            ))}
        </div>
      )}
      {demo ? (
        <p>Conexões reais ficam desativadas no modo demonstração.</p>
      ) : !capabilities.user ? (
        <p>Sua sessão expirou. Recarregue o app e entre de novo para conectar um banco.</p>
      ) : !capabilities.banking ? (
        <p>
          A conexão bancária precisa ser ativada neste projeto. Enquanto isso, você pode registrar
          entradas e saídas manualmente.
        </p>
      ) : (
        <>
          <button
            className="primary-button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                const res = await fetch('/api/banks/token', { method: 'POST' }),
                  data = await res.json();
                if (!res.ok) throw Error(data.error || 'Não foi possível iniciar.');
                setSandbox(data.sandbox);
                setToken(data.accessToken);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Falha na conexão.');
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Conectando…' : 'Conectar banco ou carteira'}
          </button>
          {state.accounts.length > 0 && (
            <button className="text-button bank-sync" disabled={busy} onClick={() => sync()}>
              Atualizar minhas contas
            </button>
          )}
        </>
      )}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {token && (
        <PluggyConnect
          connectToken={token}
          includeSandbox={sandbox}
          theme="dark"
          language="pt"
          countries={['BR']}
          onClose={() => setToken('')}
          onSuccess={({ item }) => {
            setToken('');
            void sync(item.id);
          }}
          onError={({ message }) => {
            setError(message);
            setToken('');
          }}
        />
      )}
    </>
  );
}

# Continuidade do FORGE

Pasta no PC do trabalho: C:\Users\davi.snaider\Documents\forge
Pasta no PC pessoal: C:\Users\davis\OneDrive\Documentos\forge-life-os
Repositório esperado: https://github.com/davisnaider06/forge-life-os
Produção (Vercel, deploy automático do main): https://forge-life-os-xi.vercel.app

## Continuar em outro computador

1. Entre no GitHub com a conta que tem acesso ao repositório privado.
2. Clone o repositório e abra a pasta no VS Code.
3. Execute npm ci e npm run dev. Abra http://localhost:4180.
4. Copie .env.example para .env.local e configure as credenciais necessárias diretamente no ambiente. Elas não viajam pelo GitHub.
5. Antes de trocar de computador, faça commit e push. No outro computador, faça pull antes de trabalhar.

## Contexto para o Codex

Leia AGENTS.md e README.md antes de alterar o projeto. O usuário exige preservar o frontend aprovado: imagens, fontes, barras texturizadas, números pontilhados e navegação mobile. As referências estão em design/referencias e o protótipo original em design/prototipo. Não substitua por componentes genéricos.

## Estado em 17/09/2026

### Login por email (resolvido e validado)

- O login usa código por email (`verifyOtp`); o link do email continua funcionando como alternativa no mesmo navegador. Commit 132acfd restaurou `emailRedirectTo` para `/auth/callback`, removido por engano no commit aaaa.
- Supabase Auth: Site URL https://forge-life-os-xi.vercel.app. Redirect URLs: http://localhost:4180/auth/callback e https://forge-life-os-xi.vercel.app/auth/callback.
- SMTP próprio configurado: smtp.gmail.com, porta 465, remetente davisnaider06@gmail.com com senha de app do Google. No plano Free os templates só podem ser editados com SMTP próprio.
- Templates "Magic link or OTP" e "Confirm sign up" em português, com `{{ .Token }}` e `{{ .ConfirmationURL }}`.
- A porta estava digitada como 462; isso gerava `504 request_timeout` em `/otp` e o botão ficava "Enviando…" para sempre. Se voltar a travar, veja Logs → Auth no Supabase antes de mexer no código.
- Em 17/09/2026 o usuário confirmou que o código chegou. Falta confirmar sincronização entre dois aparelhos.

### Auditoria de 16–17/09/2026 (pendências, nada corrigido ainda)

Graves:

1. Comando pendente que ficou inválido no servidor (ex.: meta concluída em outro aparelho, hábito arquivado) faz `/api/state` rejeitar o lote inteiro com 400; o cliente tenta de novo a cada 12 s para sempre e nada depois dele sincroniza. `src/app/api/state/route.ts` e `flush` em `src/components/store.tsx`. Confirmado com teste.
2. Em 409 o cliente não busca o estado remoto nem reaplica os pendentes; fica preso até recarregar. Sincronizações bancárias por webhook mudam a versão e provocam isso.
3. Usuário logado sem internet: se `/api/session` falha, o app usa a chave de convidado, mostra onboarding e o que for registrado nunca sincroniza (`.catch` em `store.tsx`). Quebra o uso offline do PWA.
4. Webhook Pluggy faz `syncItem` completo antes de responder; a Pluggy exige 2xx em até 5 s e reenvia até 9 vezes. Headers do webhook só podem ser configurados pela API da Pluggy.

Médios:

5. `item/deleted` remove contas mas mantém transações; compras do cartão passam a contar no fluxo de caixa. Confirmado com teste.
6. Conquistas de sequência usam a sequência atual e somem quando ela quebra (`achievements` em `src/components/screens.tsx`).
7. `dispatch` relê o localStorage; se a gravação falhar por cota, a ação seguinte parte do estado antigo e perde a anterior. `history` cresce sem limite; 10.000 receipts bloqueiam novas ações (`src/lib/domain.ts`).
8. Não há desconexão de banco no app nem importação do arquivo exportado.

Baixos: metas em R$ guardadas em reais com decimais (não centavos); sair da conta mantém o cache local com dados financeiros; `userScalable: false` bloqueia zoom; `npm run format:check` falha no Windows só por CRLF (`core.autocrlf=true`), resolver com `.gitattributes` `* text=auto eol=lf`; comentário de `supabase/schedule-reminders.sql` cita `app_url` mas o código lê `forge_app_url`; testes cobrem só o domínio e `tests/` fica fora do typecheck.

Pontos corretos: RLS e grants, chaves só no servidor, comparação de segredos em tempo constante, checagem de origem, limite de corpo, `npm audit` sem vulnerabilidades, nenhum segredo no histórico, uso de `/v2/transactions` da Pluggy (o v1 sai em 31/12/2026).

Validação em cópia limpa em 17/09/2026: 9 testes, typecheck e build passaram.

### Próximo passo

Corrigir os itens graves 1 a 3 da sincronização (descartar/avisar comando inválido, rebase em 409, cache do último usuário para uso offline) com testes, e depois validar sincronização entre dois aparelhos.

Observação: o servidor MCP segundo-cerebro-search não estava configurado no PC pessoal nesta sessão; este arquivo é o registro oficial do estado até a nota do vault ser atualizada.

## Estado em 16/09/2026

- Quatro telas React/Next.js implementadas, armazenamento local e modo demo separado.
- Nove testes de domínio passaram; compilação de produção passou.
- Projeto Supabase criado pelo usuário: fggzqicdvxmjakvbfxwd.
- Dashboard: https://supabase.com/dashboard/project/fggzqicdvxmjakvbfxwd
- Migration 001 aplicada em 16/09/2026 pelo SQL Editor, em transação. Quatro tabelas verificadas com RLS ativa, sem SELECT anônimo nem INSERT direto por authenticated. Não reaplique a migration neste banco: as políticas já existem.
- Supabase Auth: Site URL http://localhost:4180 e redirect http://localhost:4180/auth/callback configurados. Configure a URL pública quando houver deploy.
- .env.local preenchido localmente pelo usuário e ignorado pelo Git. Conexão real do servidor às quatro tabelas validada; chamadas anônimas negadas com código 42501. Login por email e sincronização de dados reais ainda aguardam validação do usuário.
- Pluggy e push têm implementação, mas não foram ativados ou validados de ponta a ponta.
- Bancos desejados: conta e cartão BB, conta Mercado Pago e VR. A cobertura de VR não está confirmada.
- Validar navegação offline, persistência de conquistas após interrupção da sequência e preservação da classificação de cartão ao remover conexões bancárias.

Os dados locais deste navegador não são enviados pelo GitHub. Use Exportar meus dados no app para fazer uma cópia antes de trocar de computador; a sincronização na nuvem ainda depende da configuração acima.



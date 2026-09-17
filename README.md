# FORGE

Life OS pessoal com quatro telas: Início, Metas, Finanças e Perfil. O frontend mantém os assets, fontes locais, números pontilhados e barras do protótipo aprovado. Animações usam GSAP e um efeito Three.js carregado depois do conteúdo.

## Executar

Requer Node.js compatível com a versão instalada do Next.js.

```sh
npm ci
npm run dev
```

Abra http://localhost:4180 para iniciar com seus dados. Para avaliar o design com dados fictícios, abra http://localhost:4180/?demo=1. O modo demonstração não sincroniza com a nuvem.

```sh
npm test
npm run typecheck
npm run build
npm start
```

## Estado da implementação

Hábitos, tarefas, metas, lançamentos manuais, XP e sequência funcionam com armazenamento local. Os testes cobrem valores em centavos, repetição de comandos, recompensas, metas, calendário e separação dos gastos do cartão do fluxo de caixa.

Login, sincronização, importação bancária e push possuem implementação, mas exigem configuração e validação real antes de serem considerados ativos. Não há conexão bancária funcionando apenas por executar este projeto.

## Configuração da nuvem

1. Copie `.env.example` para `.env.local` e preencha as variáveis do ambiente. Nunca envie esse arquivo ao GitHub.
2. Crie um projeto Supabase e execute `supabase/migrations/001_forge.sql` no SQL Editor desse projeto.
3. Configure a URL do app e a URL de retorno `/auth/callback` no Supabase Auth. O login usa um código enviado por email. Em Authentication → Emails, configure SMTP próprio (no plano Free os templates só são editáveis assim) e inclua `{{ .Token }}` nos templates "Magic link or OTP" e "Confirm sign up"; sem isso o Supabase envia só o link, que funciona apenas no mesmo navegador.
4. Configure URL, chave pública e chave de serviço do Supabase no ambiente do app. A chave de serviço fica exclusivamente no servidor.
5. Para publicar na Vercel, importe o repositório, configure as mesmas variáveis com a URL pública e valide login e sincronização entre dois dispositivos.

O banco restringe acesso por usuário. Alterações do estado passam por comandos validados no servidor. O armazenamento local permite uso sem cadastro; a autenticação habilita sincronização.

## Bancos e carteiras

Preencha as credenciais Pluggy somente no servidor. Comece com sandbox e valide consentimento, importação, atualização, cancelamento e reconexão antes de habilitar bancos reais. Cadastre o webhook `/api/banks/webhook` na Pluggy com o cabeçalho `Authorization: Bearer <PLUGGY_WEBHOOK_SECRET>`.

O escopo desejado é Banco do Brasil (conta e cartão), Mercado Pago e VR. A documentação consultada lista cobertura de BB e conta Mercado Pago; cobertura de VR ainda não foi confirmada. A disponibilidade efetiva depende do conector e da contratação. Não apresente VR como integração ativa.

Contas e cartões aparecem separadamente. Compras do cartão não entram novamente no fluxo de caixa da conta; isso evita duplicá-las com o pagamento da fatura. Importações automáticas não geram XP por transação.

## PWA e notificações

Manifesto e service worker são servidos na versão de produção. Push requer HTTPS, conta autenticada, permissão do usuário e chaves VAPID. Configure um agendador para chamar `/api/cron/reminders` com `Authorization: Bearer <CRON_SECRET>`. O arquivo `supabase/schedule-reminders.sql` contém uma opção de agendamento que precisa ser configurada no ambiente real.

## Antes de liberar para uso diário

- Validar persistência, sincronização entre aparelhos e conflitos de edição.
- Validar instalação e navegação offline no celular alvo.
- Validar push com o app fechado.
- Validar integração bancária primeiro em sandbox e depois com consentimento real.
- Confirmar backup e exportação dos dados.

Validação local em 16/09/2026: nove testes passaram e a compilação de produção concluiu. Navegação nas quatro telas conferida no navegador. Supabase, bancos e push ainda não foram validados de ponta a ponta.

## Supabase deste projeto

A migration 001 já foi aplicada ao projeto `fggzqicdvxmjakvbfxwd` em 16/09/2026. Não execute novamente nesse banco. O script SQL pode ser usado uma vez em um banco novo.

O login local está configurado para `http://localhost:4180/auth/callback`. Depois de preencher as chaves no `.env.local`, execute `node scripts/check-supabase.mjs` para verificar acesso do servidor às tabelas e bloqueio de acesso anônimo. Essa verificação não cria registros e não imprime chaves ou dados de usuários. Ela não substitui o teste real de login e sincronização.

# Continuidade do FORGE

Pasta principal neste computador: C:\Users\davi.snaider\Documents\forge
Repositório esperado: https://github.com/davisnaider06/forge-life-os

## Continuar em outro computador

1. Entre no GitHub com a conta que tem acesso ao repositório privado.
2. Clone o repositório e abra a pasta no VS Code.
3. Execute npm ci e npm run dev. Abra http://localhost:4180.
4. Copie .env.example para .env.local e configure as credenciais necessárias diretamente no ambiente. Elas não viajam pelo GitHub.
5. Antes de trocar de computador, faça commit e push. No outro computador, faça pull antes de trabalhar.

## Contexto para o Codex

Leia AGENTS.md e README.md antes de alterar o projeto. O usuário exige preservar o frontend aprovado: imagens, fontes, barras texturizadas, números pontilhados e navegação mobile. As referências estão em design/referencias e o protótipo original em design/prototipo. Não substitua por componentes genéricos.

## Estado em 16/09/2026

- Quatro telas React/Next.js implementadas, armazenamento local e modo demo separado.
- Nove testes de domínio passaram; compilação de produção passou.
- Projeto Supabase criado pelo usuário: fggzqicdvxmjakvbfxwd.
- Dashboard: https://supabase.com/dashboard/project/fggzqicdvxmjakvbfxwd
- Migration 001 aplicada em 16/09/2026 pelo SQL Editor, em transação. Quatro tabelas verificadas com RLS ativa, sem SELECT anônimo nem INSERT direto por authenticated. Não reaplique a migration neste banco: as políticas já existem.
- Supabase Auth: Site URL http://localhost:4180 e redirect http://localhost:4180/auth/callback configurados. Configure a URL pública quando houver deploy.
- .env.local criado e ignorado pelo Git. Ainda faltam as chaves locais e a validação real do login e da sincronização.
- Pluggy e push têm implementação, mas não foram ativados ou validados de ponta a ponta.
- Bancos desejados: conta e cartão BB, conta Mercado Pago e VR. A cobertura de VR não está confirmada.
- Validar navegação offline, persistência de conquistas após interrupção da sequência e preservação da classificação de cartão ao remover conexões bancárias.

Os dados locais deste navegador não são enviados pelo GitHub. Use Exportar meus dados no app para fazer uma cópia antes de trocar de computador; a sincronização na nuvem ainda depende da configuração acima.


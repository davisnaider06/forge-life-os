# FORGE — regras do projeto

Preserve o design aprovado em `design/prototipo`. Reutilize fotos, fontes, classes CSS, números SVG pontilhados e barras texturizadas. Não refaça telas com componentes genéricos. Compare o modo `?demo=1` com as referências ao mudar layout.

O produto mede hábitos, metas, rotina e finanças. Mobile primeiro. Imagens e fontes são locais. Three.js deve carregar depois do conteúdo e respeitar movimento reduzido; limpeza obrigatória ao desmontar.

Regras de negócio ficam em `src/lib/domain.ts`; mudanças de estado passam por comandos validados. Valores monetários são centavos inteiros. Dados bancários e chaves privadas são exclusivos do servidor. Não declare uma integração ativa sem validar as credenciais e o fluxo real. Não exponha dados pessoais em logs.

Execute `npm test`, `npm run typecheck` e `npm run build` antes de concluir mudanças de domínio ou integração. Não publique nem envie dados demonstrativos a contas reais. O modo demonstração usa armazenamento separado e não sincroniza.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


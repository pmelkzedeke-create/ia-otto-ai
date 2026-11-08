# OTTO — Assistente Inteligente de Computador

Interface conversacional (texto e voz) que opera o computador: terminal, arquivos, execução
de código em sandbox, memória de longo prazo, leitura de artigos, player de vídeo e TTS.

Stack: **React 19 + Vite 8 + Tailwind 4** no frontend, **Express + TypeScript** no backend
(um único processo serve API e interface).

---

## Começando

```bash
npm install
cp .env.example .env      # preencha GROQ_API_KEY ou GEMINI_API_KEY
npm run dev               # http://localhost:3000
```

Sem chave de IA a interface abre e funciona, mas o OTTO não responde — as chamadas de modelo
retornam erro de configuração. Para ativar, defina `GROQ_API_KEY` (Rota A) ou informe a chave
da Rota B direto na UI, em **Configurações → ROTA B**.

### Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | Sobe API + Vite em modo middleware (porta 3000) |
| `npm run build` | Build de produção do frontend em `dist/` |
| `npm start` | Produção (`NODE_ENV=production`), serve `dist/` + API |
| `npm test` | Suíte de testes (`node --test` via tsx) |
| `npm run typecheck` / `npm run lint` | `tsc --noEmit` com `strict` |

### Produção

```bash
npm run build
OTTO_ACCESS_TOKEN="$(openssl rand -hex 24)" npm start
```

O processo serve `dist/` e injeta o token de sessão no HTML automaticamente.

---

## Segurança

O OTTO executa comandos e manipula arquivos — trate-o como software privilegiado.

- **Autenticação obrigatória**: toda rota `/api` exige o header `x-otto-token` (ou
  `Authorization: Bearer`). O token vem de `OTTO_ACCESS_TOKEN` ou é gerado no boot e salvo em
  `otto_workspace/.otto_token` (0600). O frontend o obtém pela meta tag injetada no HTML,
  protegida pela same-origin policy.
- **Terminal é somente leitura** (`ls`, `cat`, `pwd`, `echo`, `mkdir`, `git status/log/diff`).
  Não há execução de `node`/`python`/`npm` pelo terminal, e argumentos com caminho absoluto,
  `..`, glob ou metacaractere de shell são recusados.
- **Execução de código** acontece só no CodeSandbox: diretório temporário, ambiente limpo
  (sem chaves de API), timeout e limite de output.
- **Arquivos** ficam contidos em `otto_workspace` via checagem de `path.relative`
  (não apenas `startsWith`).
- Headers de segurança, rate limit em memória (`OTTO_RATE_LIMIT_PER_MIN`) e middleware de
  erro global.

O servidor escuta em `0.0.0.0`. Para uso doméstico, prefira expor apenas via VPN/reverse proxy
com TLS; o token protege a API, mas não substitui uma camada de rede.

---

## Arquitetura

```
server.ts                 composição: middlewares, rotas restantes, bootstrap (Vite/estático)
server/
  routes/                 routers por domínio (config, memory, files, sandbox, agent, slides)
  middleware/             auth, httpHardening (headers, rate limit, erro global)
  session.ts              geração/persistência do token de sessão
  paths.ts                contenção de caminhos no workspace
  security.ts             whitelist de comandos
  mathEval.ts             avaliador matemático seguro (sem eval)
  codeSandbox.ts          execução isolada de código
  toolExecutor.ts         ferramentas do agente (fs, busca, calculadora, sandbox)
  memoryStore.ts          memória planetária persistida em JSON
  groqService.ts          integração Groq (Rota A)
  textCodeProvider.ts     provedor de texto & código (Rota B)
  taskRouter.ts           roteamento de intenção
  agentOrchestrator.ts    orquestração de tarefas multi-etapa
src/
  App.tsx                 shell da aplicação
  components/             UI (modais pesados carregados com React.lazy)
  services/               http (token), apiBridge, voice, tts, dataHub
tests/                    testes de segurança, caminhos, auth e matemática
otto_workspace/           workspace de runtime (dados não versionados)
```

---

## Testes

```bash
npm test
```

Cobrem: whitelist do terminal (injeção de shell, caminhos absolutos, execução de código),
contenção de caminhos no workspace (incluindo o caso de diretório irmão com prefixo igual),
middleware de autenticação e o avaliador matemático.

## Licença

Apache-2.0 — ver `LICENSE`.

# OTTO • IA Assistente Full-Stack

> **"Seu computador. Sua voz. Seu assistente."**

O **OTTO** é um assistente de inteligência artificial de alta performance, projetado para automação e interação multimodal avançada em ambientes desktop e web. Ele combina modelos de linguagem de última geração, execução real de ferramentas em sandbox isolado, síntese de voz (TTS) de ultra-baixa latência e um orquestrador autônomo multi-agentes com persistência de dados.

---

## 🌟 Funcionalidades Principais

- 🎙️ **Interação por Voz em Tempo Real**: Captura e transcrição contínua de áudio via Web Audio API e modelos multimodais com visualizadores holográficos de onda sonora.
- 🗣️ **Síntese de Voz (TTS Multi-Provider)**: Suporte a múltiplos provedores de voz neurais (Google AI Studio Gemini TTS, ElevenLabs e Respeecher).
- 🛠️ **Execução Real de Ferramentas (Tool Calling)**: Busca real na internet (DuckDuckGo), calculadora matemática segura, leitura e escrita física de arquivos e criação de diretórios no workspace.
- 🧪 **CodeSandbox Isolado**: Executor real de código (Node.js, TypeScript, Python e Bash) executado em ambiente isolado sob `/tmp` com restrição de memória, timeouts estritos e sanitização de variáveis de ambiente.
- 🤖 **Orquestrador Multi-Agentes (Rota B)**: Arquitetura especializada de agentes (Planner, Architect, Coder, Tester, Fixer e Finalizer) que criam projetos completos, executam testes unitários e corrigem falhas automaticamente.
- 🧠 **Memória de Longo Prazo e Contexto Seletivo**: Sistema de nós de conhecimento planetários (Knowledge, Learned, Research, System) com seleção inteligente das 15 memórias mais relevantes por relevância semântica e recência.
- 📁 **Data Hub Integrado**: Gerenciador de arquivos completo com suporte a pré-visualização interativa de código, HTML/Web, vídeos, áudios, imagens e documentos.
- 📊 **Gerador Autônomo de Apresentações**: Criação dinâmica de slides interativos de 6 a 8 páginas e scaffolds de projetos web gerados via IA neural.

---

## 🛠️ Stack Tecnológica

- **Runtime & Gerenciador**: Bun / Node.js
- **Linguagem**: TypeScript (Strict Mode)
- **Backend**: Express.js com arquitetura de rotas modulares
- **Frontend**: React 19, Vite, Tailwind CSS 4, Motion, Lucide Icons, Three.js
- **Modelos de IA**:
  - **GroqCloud**: Llama 3.3 70B Versatile e Llama 3.1 8B Instant (Rota A conversacional e Tool Calling ultrarrápido)
  - **Google Gemini**: Gemini 2.5 Flash / 3.8 Flash (Visão computacional, transcrição de áudio e fallback)
  - **TextCodeProvider**: Motor neural dedicado para geração e refatoração de código (Rota B)

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- [Bun](https://bun.sh/) (recomendado) ou Node.js (v20+)
- Chave de API do GroqCloud (opcional, para modelos Llama) e/ou Google Gemini API Key

### Passo a Passo

1. **Instale as dependências**:
   ```bash
   bun install
   # ou: npm install
   ```

2. **Configure as Variáveis de Ambiente**:
   Copie o arquivo de exemplo e configure suas chaves:
   ```bash
   cp .env.example .env
   ```

   Edite o `.env` e defina obrigatoriamente:
   ```env
   # Token obrigatório para proteção de todas as rotas da API
   OTTO_ACCESS_TOKEN="seu_token_secreto_aqui"

   # Chaves de API das IAs
   GROQ_API_KEY="gsk_..."
   GEMINI_API_KEY="AIza..."
   ```

3. **Inicie o Servidor**:
   ```bash
   bun run server.ts
   # ou: npm run dev
   ```

4. **Acesse no Navegador**:
   Abra `http://localhost:3000` para interagir com o OTTO.

---

## 🔒 Avisos de Segurança & Arquitetura Defensiva

1. **Controle de Acesso (x-otto-token)**:
   - Todas as rotas sob `/api/*` exigem o cabeçalho HTTP `x-otto-token` igual ao valor definido em `OTTO_ACCESS_TOKEN`.
   - Requisições sem o cabeçalho ou com token incorreto recebem código HTTP `401 Unauthorized`.
   - Mantenha o token em segredo e nunca o exponha em repositórios públicos.

2. **Terminal e Política de Lista Branca (Whitelist)**:
   - A rota `/api/terminal/execute` e a ferramenta `execute_command` **não** utilizam lista negra.
   - Apenas comandos explicitamente permitidos na lista branca são autorizados:
     `ls`, `cat`, `pwd`, `echo`, `mkdir`, `node`, `python3`, `git status`, `git log`, `npm`, `bun`.
   - Qualquer comando fora da lista ou que contenha caracteres de encadeamento/injeção (`;`, `&&`, `||`, `|`, `` ` ``, `$()`, `>`, `<`) é bloqueado com código HTTP `403 Forbidden`.

3. **Execução Isolada em CodeSandbox**:
   - Todo comando e script é executado dentro de uma pasta temporária isolada em `/tmp/otto_sb_...`.
   - O ambiente é sanitizado (`cleanEnv`) para não vazar variáveis de ambiente, tokens ou chaves do host.
   - Cada execução possui timeout rígido de CPU e limpeza recursiva garantida ao finalizar.

4. **Chaves de API e Segredos**:
   - Nunca comite chaves de API (`gsk_...`, `AIza...`, tokens) em arquivos de código ou templates como `.env.example`.
   - Caso uma chave tenha sido exposta anteriormente, revogue-a imediatamente no painel do respectivo provedor.

---

## 🧪 Testes de Integração

Para rodar os testes automatizados de integração que validam a busca web real, o sandbox isolado e o bloqueio de rotas sem token:
```bash
bun test_integration.ts
# ou: npx tsx test_integration.ts
```

---

## 📄 Licença

Distribuído sob a licença **MIT**. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.

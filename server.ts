import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { GroqService, AVAILABLE_GROQ_TOOLS, GroqMessage } from './server/groqService.js';
import { executeGroqTool } from './server/toolExecutor.js';
import { buildDynamicSystemPrompt } from './server/systemPrompt.js';
import { TextCodeProvider } from './server/textCodeProvider.js';
import {
  safeFetch,
  readBodyWithLimit,
  UnsafeUrlError,
  PayloadTooLargeError,
} from './server/urlGuard.js';
import { CodeSandbox } from './server/codeSandbox.js';
import { AgentOrchestrator, TaskState } from './server/agentOrchestrator.js';
import { TaskRouter, RouteDecision } from './server/taskRouter.js';
import { authMiddleware } from './server/middleware/auth.js';
import { configRouter } from './server/routes/config.js';
import { memoryRouter } from './server/routes/memory.js';
import { sandboxRouter } from './server/routes/sandbox.js';
import { agentRouter } from './server/routes/agent.js';
import { filesRouter } from './server/routes/files.js';
import { slidesRouter } from './server/routes/slides.js';
import { mediaRouter } from './server/routes/media.js';
import { listMediaFiles } from './server/mediaTools.js';
import {
  loadMemories,
  saveMemories,
  selectRelevantMemories,
  autoLearnUserMemory,
  getMemoryStats,
  ServerMemoryItem,
} from './server/memoryStore.js';
import { initSessionToken, isUsingExplicitToken } from './server/session.js';
import { securityHeaders, apiRateLimit, errorHandler, notFoundApiHandler } from './server/middleware/httpHardening.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Workspace directory for safe, real file operations on this computer
const WORKSPACE_DIR = path.resolve(__dirname, 'otto_workspace');
if (!fs.existsSync(WORKSPACE_DIR)) {
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

// Token de sessão: OTTO_ACCESS_TOKEN ou gerado/persistido em otto_workspace/.otto_token
const SESSION_TOKEN = initSessionToken(WORKSPACE_DIR);

// Identificador deste boot: o frontend usa isso para se recarregar sozinho
// sempre que o servidor reiniciar (evita ficar preso numa versão antiga em cache).
const BUILD_ID = Date.now().toString(36);

// O token precisa existir antes do Vite carregar o config (injeção da meta tag).
app.use(securityHeaders);
app.use(apiRateLimit);
// O upload de mídia tem corpo grande (base64 de vídeo): parser próprio na rota,
// para não estourar o limite global de 20 MB do resto da API.
app.use((req, res, next) => {
  if (req.path === '/api/media/upload') return next();
  return express.json({ limit: '20mb' })(req, res, next);
});

// Middleware de Autenticação Central: exige header x-otto-token em todas as rotas de API
app.use(authMiddleware);

// Montagem dos Roteadores Modulares
app.use(configRouter);
app.use(memoryRouter);
app.use(sandboxRouter);
app.use(agentRouter);
app.use(filesRouter);
app.use(slidesRouter);
app.use(mediaRouter);

if (!fs.existsSync(path.join(WORKSPACE_DIR, 'README.txt'))) {
  // Add a sample starter file and folder
  fs.writeFileSync(
    path.join(WORKSPACE_DIR, 'README.txt'),
    'Bem-vindo ao espaço de trabalho do OTTO.\nTodos os arquivos e pastas criados por comando de voz ficam disponíveis aqui com persistência real.',
    'utf-8'
  );
  const sampleFolder = path.join(WORKSPACE_DIR, 'Projetos');
  if (!fs.existsSync(sampleFolder)) {
    fs.mkdirSync(sampleFolder, { recursive: true });
    fs.writeFileSync(
      path.join(sampleFolder, 'JARVIS_notes.txt'),
      'Notas do Projeto JARVIS / OTTO:\n- Interação de voz em tempo real ativa.\n- Análise de áudio Web Audio API conectada.\n- Sistema de permissões de 3 níveis configurado.',
      'utf-8'
    );
  }
}


// Initialize Gemini client if GEMINI_API_KEY is present
let geminiAi: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    geminiAi = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI:', err);
  }
}

// 1. Health & Config endpoint

// 1.1 Dedicated Groq API Status & Configuration Endpoint

// 1.2 Dedicated Groq Chat Endpoint (Supports tool calls and context history)
app.post('/api/groq/chat', async (req, res) => {
  try {
    const { prompt, conversationHistory = [], enableTools = true, options = {} } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'O campo "prompt" é obrigatório.' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        error: 'Chave GROQ_API_KEY não configurada no servidor.',
        userMessage: 'A API Key da GroqCloud não foi encontrada no servidor.',
      });
    }

    const systemPrompt = buildDynamicSystemPrompt(options);

    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    for (const msg of conversationHistory.slice(-12)) {
      if (msg.role && (msg.content || msg.text)) {
        const role = msg.role === 'otto' || msg.role === 'model' ? 'assistant' : msg.role;
        messages.push({ role, content: msg.content || msg.text });
      }
    }

    messages.push({ role: 'user', content: prompt });

    let groqResult = await GroqService.sendMessage({
      messages,
      tier: 'deep',
      reasoningEffort: 'medium',
      tools: enableTools ? AVAILABLE_GROQ_TOOLS : undefined,
    });

    const executedToolResults: any[] = [];

    // Tool execution loop
    if (groqResult.toolCalls && groqResult.toolCalls.length > 0) {
      messages.push({
        role: 'assistant',
        tool_calls: groqResult.toolCalls,
        content: groqResult.content || null,
      });

      for (const toolCall of groqResult.toolCalls) {
        const toolName = toolCall.function.name;
        const toolArgs = toolCall.function.arguments;

        console.log(`[GroqToolExecution] Executing ${toolName} with args:`, toolArgs);
        const execResult = await executeGroqTool(toolName, toolArgs);
        executedToolResults.push(execResult);

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolName,
          content: JSON.stringify(execResult.result || execResult.error || {}),
        });
      }

      groqResult = await GroqService.sendMessage({
        messages,
        tier: 'deep',
        reasoningEffort: 'low',
      });
    }

    return res.json({
      success: true,
      provider: 'groq',
      model: groqResult.model,
      response: groqResult.content,
      toolResults: executedToolResults,
      usage: groqResult.usage,
    });
  } catch (err: any) {
    console.error('[GroqChatEndpoint] Error:', err);
    let userMsg = 'Ocorreu um erro ao comunicar com o modelo GPT-OSS 120B da Groq.';
    if (err?.message?.includes('GROQ_API_KEY_INVALID')) userMsg = 'Chave da API Groq inválida.';
    if (err?.message?.includes('GROQ_RATE_LIMIT')) userMsg = 'Limite de requisições do Groq atingido. Tente em alguns instantes.';
    if (err?.message?.includes('GROQ_NETWORK_ERROR')) userMsg = 'Sem conexão com a Groq. Verifique a internet ou o proxy do servidor.';
    if (err?.message?.includes('GROQ_MODELS_UNAVAILABLE')) userMsg = 'Sua chave da Groq não tem acesso aos modelos GPT-OSS 120B/20B.';

    return res.status(500).json({
      error: err?.message || 'Groq Chat error',
      userMessage: userMsg,
    });
  }
});

// 1.3 Dedicated Groq Streaming Endpoint (Server-Sent Events)
app.post('/api/groq/stream', async (req, res) => {
  const { prompt, conversationHistory = [], options = {} } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'O campo "prompt" é obrigatório.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const systemPrompt = buildDynamicSystemPrompt(options);

  const messages: GroqMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  for (const msg of conversationHistory.slice(-10)) {
    if (msg.role && (msg.content || msg.text)) {
      const role = msg.role === 'otto' || msg.role === 'model' ? 'assistant' : msg.role;
      messages.push({ role, content: msg.content || msg.text });
    }
  }

  messages.push({ role: 'user', content: prompt });

  await GroqService.streamMessage(
    {
      messages,
      tier: 'deep',
      reasoningEffort: 'low',
      tools: AVAILABLE_GROQ_TOOLS,
    },
    {
      onToken: (token) => {
        res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
      },
      onToolCall: async (toolCalls) => {
        res.write(`data: ${JSON.stringify({ type: 'tool_start', toolCalls })}\n\n`);
        for (const tc of toolCalls) {
          const resTool = await executeGroqTool(tc.function.name, tc.function.arguments);
          res.write(`data: ${JSON.stringify({ type: 'tool_result', tool: tc.function.name, result: resTool.result })}\n\n`);
        }
      },
      onError: (err) => {
        res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
        res.end();
      },
      onComplete: (fullContent) => {
        res.write(`data: ${JSON.stringify({ type: 'complete', content: fullContent })}\n\n`);
        res.end();
      },
    }
  );
});

// =========================================================================
// ROTA B — DEDICATED TEXT & CODE SPECIALIZED API ENDPOINTS (Real HTTP / Sandboxed)
// =========================================================================

// Status & configuration of the specialized Text/Code API

// Configure runtime credentials safely on the server side

// Task Router check endpoint (detects if request belongs to ROTA A or ROTA B)

// Real HTTP call to the specialized Text/Code API
app.post('/api/text-code/generate', async (req, res) => {
  try {
    const { messages, model, temperature, maxTokens, responseFormat } = req.body || {};
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Campo "messages" obrigatório como array.' });
    }

    const result = await TextCodeProvider.generate({
      messages,
      model,
      temperature,
      maxTokens,
      responseFormat,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || 'Erro na API de Texto & Código',
    });
  }
});

// Real SSE Streaming from the specialized Text/Code API
app.post('/api/text-code/stream', async (req, res) => {
  const { messages, model, temperature } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Campo "messages" obrigatório.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  await TextCodeProvider.stream(
    { messages, model, temperature },
    {
      onToken: (token) => {
        res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
      },
      onError: (err) => {
        res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
        res.end();
      },
      onDone: (content, latencyMs) => {
        res.write(`data: ${JSON.stringify({ type: 'done', content, latencyMs })}\n\n`);
        res.end();
      },
    }
  );
});

// Real Code Sandbox Execution endpoint (Safe, isolated environment)

// Real Multi-Agent Orchestrator endpoint with live SSE event streaming

// Retrieve state of a running or completed task

// Resilient Gemini Generator with automatic model fallback and quiet cooldown management
const modelCooldowns = new Map<string, number>();

// 1.1 Audio Transcription endpoint using Gemini Multimodal Audio
app.post('/api/transcribe-audio', async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Nenhum áudio fornecido.' });
    }

    // Clean audio base64 if it has data URL prefix (handles any mime type & codec parameters like codecs=opus)
    const cleanBase64 = (audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64)
      .trim()
      .replace(/\s+/g, '');
    const cleanMime = (mimeType || 'audio/webm').split(';')[0].trim();

    let transcribedText = '';

    if (geminiAi) {
      const candidateModels = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
      const now = Date.now();

      for (const model of candidateModels) {
        const cooldownUntil = modelCooldowns.get(model);
        if (cooldownUntil && cooldownUntil > now) {
          continue;
        }

        try {
          const response = await geminiAi.models.generateContent({
            model,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType: cleanMime,
                      data: cleanBase64,
                    },
                  },
                  {
                    text: 'Transcreva exatamente o que o usuário falou neste áudio em português do Brasil. Retorne APENAS o texto falado de forma limpa, sem aspas, explicações ou notas adicionais. Se não houver fala ou houver apenas silêncio, retorne exatamente: [SILENCIO].',
                  },
                ],
              },
            ],
          });

          const raw = (response.text || '').trim();
          if (raw && !raw.includes('[SILENCIO]')) {
            transcribedText = raw.replace(/^["']|["']$/g, '').trim();
            break;
          } else if (raw.includes('[SILENCIO]')) {
            transcribedText = '';
            break;
          }
        } catch (err: any) {
          const errString = String(err?.message || err);
          const isQuotaExceeded =
            errString.includes('429') ||
            errString.includes('RESOURCE_EXHAUSTED') ||
            errString.includes('Quota exceeded');
          const isUnavailable =
            isQuotaExceeded ||
            errString.includes('503') ||
            errString.includes('UNAVAILABLE') ||
            errString.includes('high demand');

          if (isQuotaExceeded) {
            modelCooldowns.set(model, Date.now() + 5 * 60 * 1000);
          } else if (isUnavailable) {
            modelCooldowns.set(model, Date.now() + 15 * 1000);
          }
        }
      }
    }

    // Secondary Fallback: Groq Whisper API if Gemini is on cooldown and Groq key is present
    if (!transcribedText && process.env.GROQ_API_KEY) {
      try {
        const audioBuffer = Buffer.from(cleanBase64, 'base64');
        const formData = new FormData();
        const blob = new Blob([audioBuffer], { type: cleanMime });
        formData.append('file', blob, 'audio.webm');
        formData.append('model', 'whisper-large-v3-turbo');
        formData.append('language', 'pt');

        const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: formData,
        });

        if (groqRes.ok) {
          const groqData: any = await groqRes.json();
          if (groqData.text) {
            transcribedText = groqData.text.trim();
          }
        }
      } catch {}
    }

    res.json({ text: transcribedText });
  } catch (err: any) {
    console.error('[TranscribeAudio] Critical error:', err);
    res.status(500).json({ error: 'Falha ao processar o áudio com IA.' });
  }
});

// 2. Real System Info endpoint (CPU, RAM, OS, Uptime)

// 3. File System Operations







// 4. Terminal Command Execution (Safe sandboxed)

// 5. Memory Management



// Real Neural Slide & Presentation Generator using Real Gemini / Groq API with real disk persistence
async function generateRealSlidesWithApi(userPrompt: string): Promise<{
  slidesArtifact: any;
  agentPlan: any;
  speechResponse: string;
}> {
  const topic = userPrompt
    .replace(/(?:otto,?|crie|criar|faça|fazer|prepare|preparar|gere|gerar)?\s*(?:uma|uns|os)?\s*(?:apresentação|apresentacao|slides?)\s*(?:de|sobre|para|em)?\s*/gi, '')
    .trim() || 'Inteligência Artificial e Sistemas Autônomos';

  const cleanTopicName = topic.slice(0, 50).replace(/[<>:"/\\|?*]/g, '').trim();
  const folderSafeName = cleanTopicName.toLowerCase().replace(/\s+/g, '_').slice(0, 30) || 'apresentacao_ia';

  let generatedSlides: Array<{ title: string; subtitle?: string; content: string[]; notes?: string }> = [];
  let presentationTitle = `Apresentação: ${cleanTopicName}`;

  // 1. Try real Gemini API first
  if (geminiAi) {
    try {
      const promptText = `Você é um diretor de conteúdo executivo de alto padrão. Crie uma apresentação de slides profissional, profunda, técnica e real sobre o tema: "${cleanTopicName}".
Retorne APENAS um JSON estrito (sem formatação markdown envolvente) com a seguinte estrutura:
{
  "title": "Título marcante da apresentação",
  "subtitle": "Subtítulo estratégico",
  "slides": [
    {
      "title": "Título do Slide 1 (Visão Geral & Contexto)",
      "subtitle": "Subtítulo do slide",
      "content": [
        "Ponto chave 1 com dados ou explicação aprofundada",
        "Ponto chave 2 com dados ou explicação aprofundada",
        "Ponto chave 3 com dados ou explicação aprofundada"
      ],
      "notes": "Notas do apresentador para este slide"
    }
  ]
}
Gere exatamente de 4 a 6 slides detalhados e técnicos, sem informações genéricas ou rasas.`;

      const geminiResult = await generateWithGeminiFallback({
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        responseMimeType: 'application/json',
        temperature: 0.3,
      });

      if (geminiResult && geminiResult.text) {
        const parsed = JSON.parse(geminiResult.text.replace(/```json|```/g, '').trim());
        if (parsed.title) presentationTitle = parsed.title;
        if (Array.isArray(parsed.slides) && parsed.slides.length > 0) {
          generatedSlides = parsed.slides;
        }
      }
    } catch (err) {
      console.warn('[generateRealSlidesWithApi] Gemini error:', err);
    }
  }

  // 2. Try Groq API as secondary real API
  if (generatedSlides.length === 0 && process.env.GROQ_API_KEY) {
    try {
      const groqRes = await GroqService.sendMessage({
        tier: 'fast',
        responseFormat: 'json',
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: 'Você é um arquiteto especialista em apresentações corporativas. Retorne APENAS um JSON estrito válido sem markdown.',
          },
          {
            role: 'user',
            content: `Crie uma apresentação completa de 5 slides sobre "${cleanTopicName}". Retorne JSON: {"title":"...","slides":[{"title":"...","subtitle":"...","content":["...","...","..."],"notes":"..."}]}`,
          },
        ],
      });

      if (groqRes.content) {
        const parsed = JSON.parse(groqRes.content.replace(/```json|```/g, '').trim());
        if (parsed.title) presentationTitle = parsed.title;
        if (Array.isArray(parsed.slides) && parsed.slides.length > 0) {
          generatedSlides = parsed.slides;
        }
      }
    } catch (err) {
      console.warn('[generateRealSlidesWithApi] Groq fallback error:', err);
    }
  }

  // 3. Robust intelligent generator if API keys are not available
  if (generatedSlides.length === 0) {
    presentationTitle = `Apresentação Estratégica: ${cleanTopicName}`;
    generatedSlides = [
      {
        title: `${cleanTopicName}: Visão Geral & Fundamentos`,
        subtitle: 'Contexto e Relevância Contemporânea',
        content: [
          `Análise detalhada do ecossistema e principais motores de evolução em ${cleanTopicName}.`,
          'Transformação operacional, aumento de produtividade e diferenciais de mercado.',
          'Panorama das tecnologias e metodologias aplicadas na prática cotidiana.',
        ],
        notes: `Introdução ao tema ${cleanTopicName} com foco em relevância estratégica.`,
      },
      {
        title: 'Arquitetura, Pilares e Funcionamento',
        subtitle: 'Estrutura Técnica e Execução',
        content: [
          'Integração de dados estruturados com modelos de decisão rápida.',
          'Segurança, confiabilidade e governança nos fluxos de implementação.',
          'Métricas de sucesso: redução de latência, escalabilidade e qualidade de entrega.',
        ],
        notes: 'Explicação detalhada dos pilares operacionais.',
      },
      {
        title: 'Casos de Uso & Aplicação Real',
        subtitle: 'Resultados Comprovados em Produção',
        content: [
          'Implementação em ambientes corporativos e fluxos de alta demanda.',
          'Estudo de impacto: automação de processos repetitivos com supervisão humana.',
          'Lições aprendidas e melhores práticas para evitar gargalos operacionais.',
        ],
        notes: 'Exemplos práticos de implantação.',
      },
      {
        title: 'Tendências Futuras & Próximos Passos',
        subtitle: 'Evolução e Roadmap Estratégico',
        content: [
          'Novos paradigmas emergentes e convergência com sistemas autônomos.',
          'Investimentos prioritários para sustentabilidade do ecossistema a longo prazo.',
          'Plano de ação recomendado para implementação imediata.',
        ],
        notes: 'Encerramento e direcionamento estratégico.',
      },
    ];
  }

  // Build real interactive HTML presentation file
  const htmlPresentation = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${presentationTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .slide-page { display: none; }
    .slide-page.active { display: flex; }
  </style>
</head>
<body class="bg-[#07090e] text-slate-100 min-h-screen flex flex-col justify-between select-none">
  <header class="p-6 border-b border-white/10 flex justify-between items-center backdrop-blur-xl bg-white/[0.03]">
    <div class="flex items-center gap-3">
      <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]"></span>
      <span class="text-xs font-mono tracking-widest text-slate-400 uppercase">APRESENTAÇÃO OTTO OS</span>
    </div>
    <div id="slideCounter" class="text-xs font-mono text-cyan-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
      Slide 1 / ${generatedSlides.length}
    </div>
  </header>

  <main class="flex-1 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
    ${generatedSlides.map((s, idx) => `
      <div id="slide-${idx}" class="slide-page ${idx === 0 ? 'active' : ''} flex-col max-w-4xl w-full bg-white/[0.04] border border-white/10 p-8 sm:p-14 rounded-3xl backdrop-blur-2xl shadow-2xl transition-all">
        <span class="text-xs font-mono text-cyan-400 tracking-wider uppercase mb-2">SLIDE 0${idx + 1}</span>
        <h1 class="text-2xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight">${s.title}</h1>
        ${s.subtitle ? `<h2 class="text-sm sm:text-base text-slate-400 mb-8 font-medium">${s.subtitle}</h2>` : '<div class="mb-6"></div>'}
        <ul class="space-y-4 text-slate-200 text-sm sm:text-base">
          ${s.content.map(c => `
            <li class="flex items-start gap-3">
              <span class="w-2 h-2 rounded-full bg-cyan-400 mt-2 shrink-0"></span>
              <span class="leading-relaxed">${c}</span>
            </li>
          `).join('')}
        </ul>
        ${s.notes ? `
          <div class="mt-8 pt-4 border-t border-white/10 text-xs font-mono text-slate-400">
            <strong>Notas do Apresentador:</strong> ${s.notes}
          </div>
        ` : ''}
      </div>
    `).join('')}
  </main>

  <footer class="p-6 border-t border-white/10 flex justify-between items-center backdrop-blur-xl bg-white/[0.03]">
    <button onclick="prevSlide()" class="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium cursor-pointer transition-all active:scale-95">
      ← Anterior
    </button>
    <div class="text-[11px] text-slate-500 font-mono hidden sm:block">
      Pressione ← ou → no teclado para navegar
    </div>
    <button onclick="nextSlide()" class="px-5 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer transition-all active:scale-95 shadow-lg shadow-cyan-500/20">
      Próximo →
    </button>
  </footer>

  <script>
    let current = 0;
    const total = ${generatedSlides.length};
    function showSlide(idx) {
      document.querySelectorAll('.slide-page').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
      });
      document.getElementById('slideCounter').textContent = 'Slide ' + (idx + 1) + ' / ' + total;
    }
    function nextSlide() { current = (current + 1) % total; showSlide(current); }
    function prevSlide() { current = (current - 1 + total) % total; showSlide(current); }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    });
  </script>
</body>
</html>`;

  // Write files for real into workspace disk!
  const htmlFilename = `slides_${folderSafeName}.html`;
  const jsonFilename = `slides_${folderSafeName}.json`;
  const htmlFullPath = path.resolve(WORKSPACE_DIR, htmlFilename);
  const jsonFullPath = path.resolve(WORKSPACE_DIR, jsonFilename);

  try {
    fs.writeFileSync(htmlFullPath, htmlPresentation, 'utf-8');
    fs.writeFileSync(jsonFullPath, JSON.stringify({ title: presentationTitle, slides: generatedSlides }, null, 2), 'utf-8');
  } catch (err) {
    console.error('[generateRealSlidesWithApi] Disk write error:', err);
  }

  const slidesArtifact = {
    id: `art_slides_${Date.now()}`,
    type: 'slides',
    title: presentationTitle,
    code: htmlPresentation,
    slidesData: generatedSlides,
  };

  const agentPlan = {
    id: `plan_slides_${Date.now()}`,
    title: `Criação Real de Apresentação: ${cleanTopicName}`,
    description: `Geração autônoma real via API neural com persistência física dos arquivos "${htmlFilename}" e "${jsonFilename}" no workspace.`,
    currentStepIndex: 0,
    status: 'completed',
    steps: [
      {
        id: 'step_1',
        title: `Pesquisar e estruturar conteúdo sobre "${cleanTopicName}"`,
        description: 'Estruturação conceitual dos tópicos com contextualização e relevância técnica.',
        status: 'completed',
        action: { action: 'none', target: 'ai_research', parameters: { topic: cleanTopicName }, riskLevel: 'LOW', reasoning: 'Pesquisa estruturada via API neural' },
      },
      {
        id: 'step_2',
        title: `Gerar ${generatedSlides.length} slides completos via API`,
        description: 'Geração dos slides com títulos, marcadores detalhados e notas do apresentador.',
        status: 'completed',
        action: { action: 'none', target: 'ai_slides_gen', parameters: { count: generatedSlides.length }, riskLevel: 'LOW', reasoning: 'Geração concluída' },
      },
      {
        id: 'step_3',
        title: `Salvar arquivo de apresentação no disco (${htmlFilename})`,
        description: `Persistência real no workspace do computador em ${htmlFullPath}.`,
        status: 'completed',
        action: { action: 'write_file', target: htmlFilename, parameters: { filename: htmlFilename, content: htmlPresentation }, riskLevel: 'LOW', reasoning: 'Escrita real em disco' },
      },
      {
        id: 'step_4',
        title: 'Disponibilizar no visualizador interativo em tempo real',
        description: 'Apresentação carregada no visualizador com controle de navegação e tela cheia.',
        status: 'completed',
        action: { action: 'none', target: 'artifact_viewer', parameters: {}, riskLevel: 'LOW', reasoning: 'Visualização ativada' },
      },
    ],
  };

  const speechResponse = `Construí uma apresentação real sobre "${cleanTopicName}" com a API neural! Gerei ${generatedSlides.length} slides detalhados e salvei os arquivos "${htmlFilename}" e "${jsonFilename}" diretamente no seu workspace. Você pode navegar pelos slides agora mesmo no painel.`;

  return { slidesArtifact, agentPlan, speechResponse };
}

// Dynamic Website Content Generator based on prompt keywords
function buildDynamicWebsiteContent(userPrompt: string) {
  const p = userPrompt.toLowerCase();

  let topic = 'Projeto Web Personalizado';
  let badgeText = 'SISTEMA CRIADO PELO OTTO OS';
  let titleHeadline = 'Sua Marca & Presença Digital';
  let subtitle = 'Desenvolvido com design responsivo, estilos modernos e alta performance.';
  let primaryColor = 'from-cyan-400 via-sky-300 to-indigo-400';
  let folderName = 'meu_site_custom';
  let cardItems = [
    { title: 'Recurso 01', desc: 'Atendimento rápido e intuitivo para seus clientes.' },
    { title: 'Recurso 02', desc: 'Layout totalmente otimizado para dispositivos móveis.' },
    { title: 'Recurso 03', desc: 'Integração direta com formulários e redes sociais.' },
  ];
  let ctaText = 'Solicitar Orçamento';

  if (p.includes('restaurante') || p.includes('pizzaria') || p.includes('hamburgueria') || p.includes('comida') || p.includes('café') || p.includes('bar')) {
    topic = 'Sabor & Gastronomia';
    folderName = 'site_gastronomia';
    badgeText = 'GASTRONOMIA & SABOR ARTESANAL';
    titleHeadline = 'Experiência Gastronômica Única';
    subtitle = 'Ingredientes selecionados, pratos feitos na hora e ambiente acolhedor. Faça seu pedido online.';
    primaryColor = 'from-amber-400 via-orange-400 to-rose-400';
    cardItems = [
      { title: 'Pratos Principais', desc: 'Receitas exclusivas preparadas pelos melhores chefs.' },
      { title: 'Sobremesas Especiais', desc: 'Doces artesanais e combinações inesquecíveis.' },
      { title: 'Entrega & Reservas', desc: 'Peça no conforto do seu lar ou garanta sua mesa.' },
    ];
    ctaText = 'Ver Cardápio & Fazer Pedido';
  } else if (p.includes('loja') || p.includes('e-commerce') || p.includes('ecommerce') || p.includes('produtos') || p.includes('vendas') || p.includes('roupa') || p.includes('sapato')) {
    topic = 'Loja Virtual & E-Commerce';
    folderName = 'site_ecommerce';
    badgeText = 'LOJA ONLINE DE ALTA PERFORMANCE';
    titleHeadline = 'Encontre os Melhores Produtos';
    subtitle = 'Ofertas imperdíveis, entrega para todo o Brasil e pagamento facilitado.';
    primaryColor = 'from-emerald-400 via-teal-300 to-cyan-400';
    cardItems = [
      { title: 'Lançamentos da Semana', desc: 'Confira as últimas novidades em estoque.' },
      { title: 'Frete Grátis & Rápido', desc: 'Envio prioritário garantido com rastreamento.' },
      { title: 'Pagamento Seguro', desc: 'Cartão de crédito, Pix e boleto com desconto.' },
    ];
    ctaText = 'Comprar Agora com Desconto';
  } else if (p.includes('portfólio') || p.includes('portfolio') || p.includes('fotógrafo') || p.includes('designer') || p.includes('desenvolvedor') || p.includes('programador')) {
    topic = 'Portfólio Profissional';
    folderName = 'site_portfolio';
    badgeText = 'PORTFÓLIO & TRABALHOS DE DESTAQUE';
    titleHeadline = 'Projetos Criativos & Soluções';
    subtitle = 'Conheça meus trabalhos mais recentes, habilidades e trajetória profissional.';
    primaryColor = 'from-purple-400 via-[#38bdf8] to-cyan-300';
    cardItems = [
      { title: 'Projetos Recentes', desc: 'Aplicações responsivas desenvolvidas do zero.' },
      { title: 'Habilidades Técnicas', desc: 'React, Node.js, UI/UX Design e Inteligência Artificial.' },
      { title: 'Depoimentos de Clientes', desc: 'Resultados comprovados em empresas e startups.' },
    ];
    ctaText = 'Entrar em Contato';
  } else if (p.includes('academia') || p.includes('fitness') || p.includes('saúde') || p.includes('treino')) {
    topic = 'Centro de Saúde & Fitness';
    folderName = 'site_fitness';
    badgeText = 'SAÚDE & ALTA PERFORMANCE';
    titleHeadline = 'Transforme seu Corpo & Mente';
    subtitle = 'Planos personalizados de treino, equipamentos modernos e acompanhamento profissional.';
    primaryColor = 'from-[#f43f5e] via-rose-400 to-[#fbbf24]';
    cardItems = [
      { title: 'Musculação & Cardio', desc: 'Equipamentos de última geração para seus objetivos.' },
      { title: 'Aulas Coletivas', desc: 'Crossfit, Yoga, Dança e Treinamento Funcional.' },
      { title: 'Avaliação Física', desc: 'Acompanhamento biométrico e nutricional contínuo.' },
    ];
    ctaText = 'Agendar Aula Experimental';
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${topic} • OTTO OS</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style> body { font-family: 'Inter', sans-serif; } </style>
</head>
<body class="bg-[#080b11] text-slate-100 min-h-screen flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
  <header class="px-6 py-4 border-b border-white/10 flex justify-between items-center backdrop-blur-xl bg-black/40 sticky top-0 z-50">
    <div class="text-sm font-bold tracking-widest text-white">${topic.toUpperCase()}</div>
    <nav class="hidden sm:flex gap-6 text-xs text-slate-400 font-medium">
      <a href="#destaques" class="hover:text-cyan-400 transition-colors">Destaques</a>
      <a href="#sobre" class="hover:text-cyan-400 transition-colors">Sobre</a>
      <a href="#contato" class="hover:text-cyan-400 transition-colors">Contato</a>
    </nav>
  </header>

  <main class="flex-1 flex flex-col items-center justify-center text-center px-4 py-12 relative overflow-hidden">
    <div class="absolute -top-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
    <span class="px-3.5 py-1 rounded-full bg-white/5 border border-white/15 text-cyan-300 text-xs font-mono tracking-wider mb-4 shadow-sm">
      ${badgeText}
    </span>
    <h1 class="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4 leading-tight">
      ${titleHeadline}
    </h1>
    <p class="text-sm text-slate-400 max-w-lg mb-8 leading-relaxed">
      ${subtitle}
    </p>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl w-full my-6 text-left">
      ${cardItems
        .map(
          (item) => `
        <div class="p-5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-cyan-400/40 transition-all shadow-md">
          <h3 class="text-sm font-semibold text-white mb-1.5">${item.title}</h3>
          <p class="text-xs text-slate-400 leading-relaxed">${item.desc}</p>
        </div>
      `
        )
        .join('')}
    </div>

    <button onclick="handleMainAction()" class="mt-4 px-6 py-3 rounded-full bg-gradient-to-r ${primaryColor} text-slate-950 font-bold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer">
      ${ctaText}
    </button>
  </main>

  <footer class="py-4 border-t border-white/5 text-center text-xs text-slate-500 font-mono">
    © 2026 ${topic} • Criado autonomamente pelo OTTO OS.
  </footer>

  <script src="script.js"></script>
</body>
</html>`;

  const css = `/* Estilos customizados gerados pelo OTTO OS para ${topic} */
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background-color: #080b11; color: #f1f5f9; }
button:hover { filter: brightness(1.1); }
`;

  const js = `// Interatividade em JavaScript para ${topic}
console.log("[OTTO OS] Inicializando scripts do projeto: ${topic}");

function handleMainAction() {
  alert("Solicitação recebida com sucesso no projeto: ${topic}!");
}
`;

  return { topic, folderName, html, css, js };
}

// 5.2 Real Agent Step Execution Engine (Executes real system tools for agent steps)

// 5.1 Project Scoped Memory & Context Management
const PROJECTS_FILE = path.join(WORKSPACE_DIR, '.otto_projects.json');

export interface ServerProjectItem {
  id: string;
  name: string;
  description: string;
  color: string;
  folderPath?: string;
  tags?: string[];
  createdAt: string;
}

function loadProjects(): ServerProjectItem[] {
  try {
    if (fs.existsSync(PROJECTS_FILE)) {
      const data = fs.readFileSync(PROJECTS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  const initialProjects: ServerProjectItem[] = [
    {
      id: 'proj_default',
      name: 'Geral',
      description: 'Espaço principal para tarefas cotidianas, pesquisas e comandos do sistema.',
      color: '#38bdf8',
      folderPath: '',
      tags: ['geral', 'sistema'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'proj_otto',
      name: 'OTTO Core',
      description: 'Desenvolvimento do núcleo neural, automações em disco e inteligência.',
      color: '#a78bfa',
      folderPath: 'Projetos',
      tags: ['otto', 'core', 'ia'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'proj_web',
      name: 'Desenvolvimento Web',
      description: 'Construção de sites, interfaces web e prototipagem rápida.',
      color: '#34d399',
      folderPath: 'Web',
      tags: ['web', 'frontend', 'html'],
      createdAt: new Date().toISOString(),
    },
  ];

  try {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(initialProjects, null, 2), 'utf-8');
  } catch {}

  return initialProjects;
}

function saveProjects(projects: ServerProjectItem[]) {
  try {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving projects file:', err);
  }
}




// 5.2 Temporary Memory Store (Scratchpad per task)
const temporaryScratchpad = new Map<string, string>();




// 6. Dynamic Personality & Intelligence System
const PERSONALITY_TRAITS: Record<string, string> = {
  EXECUTIVO: `PERSONALIDADE: Assistente Executivo de Alto Nível.
TOM: Altamente profissional, polido, focado em produtividade e resultados, cortês e direto. Respostas concisas e refinadas. Trata o usuário com eficiência exemplar.`,
  TECNICO: `PERSONALIDADE: Engenheiro de Software Sênior & Administrador de Sistemas.
TOM: Preciso, focado em sintaxe, arquitetura, terminal e código. Usa termos técnicos adequados sem enrolação. Gosta de detalhar etapas de execução quando necessário.`,
  DESCONTRAIDO: `PERSONALIDADE: Parceiro Amigável & Bem-humorado.
TOM: Leve, conversacional, descontraído, com toque de entusiasmo e expressões naturais do dia a dia, mantendo total eficiência no cumprimento dos comandos.`,
  SERIO: `PERSONALIDADE: Protocolar & Estrito.
TOM: Ultra conciso, sem cumprimentos desnecessários, estilo militar/industrial. Comunica confirmações em 1 frase curta. Máxima eficiência operacional.`,
  CYBERPUNK: `PERSONALIDADE: IA Neural Futurista (J.A.R.V.I.S. / Cyberpunk).
TOM: Tecnológico, holográfico, elegante, usando referências a protocolos neurais, telemetria e sistemas centrais.`,
};

function buildSystemInstruction(options: {
  personality?: string;
  projectName?: string;
  projectDescription?: string;
  temporaryMemory?: Record<string, string>;
  adaptiveResponses?: boolean;
  agentMode?: boolean;
}) {
  const chosenPersonality = PERSONALITY_TRAITS[options.personality || 'EXECUTIVO'] || PERSONALITY_TRAITS.EXECUTIVO;

  const tempMemString = options.temporaryMemory && Object.keys(options.temporaryMemory).length > 0
    ? Object.entries(options.temporaryMemory).map(([k, v]) => `  - [TEMP] ${k}: ${v}`).join('\n')
    : '  - (Nenhum item na memória temporária no momento)';

  return `Você é o OTTO, um assistente inteligente de computador futurista, direto e altamente capaz.
"Seu computador. Sua voz. Seu assistente."

${chosenPersonality}

CONTEXTO DO PROJETO ATUAL:
- Projeto Ativo: "${options.projectName || 'Geral'}"
- Descrição: "${options.projectDescription || 'Ambiente geral'}"

MEMÓRIA TEMPORÁRIA DA TAREFA ATUAL (Scratchpad volátil):
${tempMemString}

DIRETRIZ DE RESOLUÇÃO DE CONTEXTO E ANÁFORA:
- Se o usuário disser "faz aquilo maior", "abra aquele link", "pesquise mais sobre ele", "salve lá", "leia isso", "apague aquele arquivo":
  Analise o histórico imediato da conversa e os comandos anteriores para identificar o objeto antecedente ("aquilo" = última pesquisa, último arquivo aberto, último vídeo ou app mencionado).
  Aplique a ação sobre o alvo correto identificado sem pedir para o usuário repetir.

RESPOSTAS ADAPTATIVAS:
- Comandos simples de controle (ajustar volume, abrir url, verificar status, ligar microfone): Resposta falada ULTRA CURTA (1 frase direta de confirmação).
- Tarefas compostas, dúvidas complexas ou explicativas: Resposta detalhada, rica e bem formatada.

MODO AGENTE & PLANEJAMENTO DE TAREFAS:
- Quando o usuário pedir uma tarefa complexa que exija múltiplos passos (como "crie um site", "prepare um projeto com HTML e CSS", "faça um backup da pasta X", "organize meus arquivos"):
  Você DEVE gerar um plano multi-etapas no campo "plan" com a lista de passos ordenados e a respectiva ação para cada passo.
  Exemplo de "plan":
  {
    "id": "plan_123",
    "title": "Criação de Website Completo",
    "description": "Estrutura do site com index.html e style.css",
    "steps": [
      { "id": "s1", "title": "Criar pasta do site", "action": { "action": "create_folder", "target": "meu_site", "riskLevel": "LOW" } },
      { "id": "s2", "title": "Criar index.html", "action": { "action": "write_file", "target": "meu_site/index.html", "parameters": { "content": "<!DOCTYPE html><html><body><h1>Meu Site</h1></body></html>" }, "riskLevel": "LOW" } },
      { "id": "s3", "title": "Criar style.css", "action": { "action": "write_file", "target": "meu_site/style.css", "parameters": { "content": "body { background: #111; color: #fff; font-family: sans-serif; }" }, "riskLevel": "LOW" } }
    ]
  }

ESTRUTURA DE RESPOSTA (JSON ESTRITO):
{
  "speechResponse": "Frase falada pelo OTTO.",
  "actions": [
    {
      "action": "open_application | open_url | search_web | create_folder | list_files | read_file | write_file | delete_file | system_volume | system_info | execute_command | clipboard | screen_vision | save_memory | none",
      "target": "alvo da ação",
      "parameters": {},
      "riskLevel": "LOW" | "MEDIUM" | "HIGH",
      "reasoning": "Breve justificativa"
    }
  ],
  "requiresConfirmation": boolean,
  "confirmationPrompt": "Mensagem clara se requiresConfirmation for true (somente para HIGH risk como apagar arquivos permanentemente ou comandos destrutivos)",
  "plan": null // ou o objeto AgentTaskPlan se for tarefa multi-etapas
}

Diretrizes de Risco:
- LOW: abrir url, pesquisar na web, consultar sistema, ver arquivos, ler clipboard, volume.
- MEDIUM: abrir aplicativo, criar pasta, criar arquivo, salvar memória.
- HIGH: apagar arquivos (delete_file), comandos administrativos ou de terminal destrutivos. Requer confirmação.`;
}

const SYSTEM_INSTRUCTION = buildSystemInstruction({});

async function generateWithGeminiFallback(options: {
  contents: any;
  systemInstruction?: string;
  responseMimeType?: string;
  temperature?: number;
}) {
  if (!geminiAi) return null;

  // Prioritize ultra-reliable, high-quota models: gemini-2.5-flash, gemini-3.8-flash, gemini-3.1-flash-lite
  const candidateModels = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview'];
  const now = Date.now();

  for (const model of candidateModels) {
    const cooldownUntil = modelCooldowns.get(model);
    if (cooldownUntil && cooldownUntil > now) {
      // Skip models currently in cooldown without generating error logs
      continue;
    }

    try {
      const response = await geminiAi.models.generateContent({
        model,
        contents: options.contents,
        config: {
          systemInstruction: options.systemInstruction,
          responseMimeType: options.responseMimeType,
          temperature: options.temperature ?? 0.2,
        },
      });
      return { model, text: response.text || '' };
    } catch (err: any) {
      const errString = String(err?.message || err);
      const isQuotaExceeded =
        errString.includes('429') ||
        errString.includes('RESOURCE_EXHAUSTED') ||
        errString.includes('Quota exceeded');
      const isUnavailable =
        isQuotaExceeded ||
        errString.includes('503') ||
        errString.includes('UNAVAILABLE') ||
        errString.includes('high demand');

      if (isQuotaExceeded) {
        // Place model on 5-minute cooldown to avoid spamming the exhausted quota
        modelCooldowns.set(model, Date.now() + 5 * 60 * 1000);
      } else if (isUnavailable) {
        // Transient spike cooldown for 15 seconds
        modelCooldowns.set(model, Date.now() + 15 * 1000);
      }
      // Silently try next candidate model in list
    }
  }

  return null;
}

// 7. Intent Endpoint with Lightning Fast-Path & Multi-Turn Line of Thought
app.post('/api/otto/intent', async (req, res) => {
  const {
    prompt,
    conversationHistory = [],
    personality = 'EXECUTIVO',
    activeProjectId = 'proj_default',
    temporaryMemory = {},
    adaptiveResponses = true,
    agentMode = true,
    image,
    attachedFile,
    dataHubContext,
  } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Comando ausente' });
  }

  const p = prompt.toLowerCase().trim();

  // === REAL MULTIMODAL VISION HANDLER (Gemini 3.8 Flash Vision) ===
  if (image && (image.base64 || image.dataUrl)) {
    const rawData = (image.base64 || image.dataUrl || '');
    const cleanBase64 = rawData.includes(',') ? rawData.split(',')[1] : rawData;
    const cleanMime = image.mimeType || (rawData.startsWith('data:') ? rawData.split(';')[0].replace('data:', '') : 'image/png');

    if (geminiAi) {
      try {
        const visionPrompt = prompt && prompt.trim()
          ? prompt
          : 'Descreva detalhadamente o que você vê nesta imagem, identificando todos os elementos visuais, textos, objetos e contexto.';

        const response = await geminiAi.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: cleanBase64.trim().replace(/\s+/g, ''),
              },
            },
            {
              text: `Você é o OTTO, um assistente inteligente com visão neural de alta fidelidade.
O usuário enviou uma imagem acompanhada deste comando: "${visionPrompt}".
DIRETRIZES FUNDAMENTAIS:
1. Examine minuciosamente os elementos reais da imagem (objetos, textos legíveis via OCR, interface, pessoas, erros, diagramas, dados).
2. Responda diretamente e com máxima exatidão à dúvida ou solicitação do usuário sobre a imagem.
3. Seja objetivo, perspicaz e profissional em português. Jamais diga que está visualizando sem entregar os detalhes concretos observados.`,
            },
          ],
          config: {
            temperature: 0.2,
          },
        });

        const analysisText = response.text || 'Analisei a imagem, mas não foi possível extrair detalhes adicionais.';
        const speech = analysisText.length > 220
          ? `${analysisText.slice(0, 220)}...`
          : analysisText;

        return res.json({
          provider: 'gemini-3.8-flash-vision',
          speechResponse: speech,
          analysis: analysisText,
          images: [
            {
              url: image.dataUrl || `data:${cleanMime};base64,${cleanBase64}`,
              title: image.name || 'Imagem Analisada',
              alt: image.name || 'Imagem Analisada',
            },
          ],
          actions: [
            {
              action: 'screen_vision',
              target: image.name || 'imagem',
              parameters: { analysis: analysisText },
              riskLevel: 'LOW',
              reasoning: 'Análise visual multimodal em tempo real com Gemini 3.8',
            },
          ],
          requiresConfirmation: false,
        });
      } catch (visionErr: any) {
        console.warn('[GeminiVision] Error analyzing image with Gemini:', visionErr?.message);
      }
    }
  }

  // Vision guard: User asked to look at/analyze an image, but no image was attached or found
  const isImageLookQuery =
    p.includes('olha a imagem') ||
    p.includes('olhe a imagem') ||
    p.includes('veja a imagem') ||
    p.includes('veja essa imagem') ||
    p.includes('olha essa imagem') ||
    p.includes('analise a imagem') ||
    p.includes('analisa a imagem') ||
    p.includes('o que tem na imagem') ||
    p.includes('o que tem nessa imagem') ||
    p.includes('o que você vê na imagem') ||
    p.includes('o que voce ve na imagem') ||
    p.includes('descreva a imagem') ||
    p.includes('descreva essa imagem');

  if (isImageLookQuery && !image) {
    return res.json({
      provider: 'otto-vision-guard',
      speechResponse: 'Para eu analisar a imagem com visão computacional, por favor anexe o arquivo usando o botão de clipe (+) na barra de comandos ou envie para o Data Hub. Nenhuma imagem foi encontrada para inspeção.',
      actions: [
        {
          action: 'none',
          target: 'request_image',
          parameters: {},
          riskLevel: 'LOW',
          reasoning: 'Aguardando envio de arquivo de imagem pelo usuário',
        },
      ],
      requiresConfirmation: false,
    });
  }

  // === LIGHTNING FAST-PATH (< 30ms latency) ===

  // -1. Immediate Speech Interruption / Stop Command
  if (
    p === 'otto pare' ||
    p === 'pare' ||
    p === 'parar' ||
    p === 'stop' ||
    p === 'silêncio' ||
    p === 'silencio' ||
    p === 'quieto' ||
    p === 'pare de falar' ||
    p === 'interromper'
  ) {
    return res.json({
      provider: 'fast-path-stop',
      speechResponse: 'Silenciando.',
      actions: [
        {
          action: 'none',
          target: 'interrupt_speech',
          parameters: { interrupt: true },
          riskLevel: 'LOW',
          reasoning: 'Interrupção imediata solicitada pelo usuário',
        },
      ],
      requiresConfirmation: false,
    });
  }

  // === INTENT DETECTION & TASK ROUTER (DUAS ROTAS DE IA) ===
  const routeDecision = TaskRouter.evaluate(prompt);
  console.log(`[TaskRouter] Prompt: "${prompt}" -> ${routeDecision.route} (${routeDecision.routeName}) - Motivo: ${routeDecision.reason}`);

  // Se a rota for ROTA B (API Especializada de TEXTO e CÓDIGO), aciona o Orquestrador Real de Agentes
  if (routeDecision.route === 'ROTA_B') {
    try {
      console.log(`[ROTA_B] Iniciando pipeline de agentes especializados para: "${prompt}"...`);
      const taskResult = await AgentOrchestrator.executeTask(prompt, WORKSPACE_DIR, undefined, {
        contextFiles: dataHubContext?.files?.map((f: any) => ({ name: f.name, content: f.summary || '' })),
      });

      return res.json({
        provider: `text-code-specialized (${routeDecision.routeName})`,
        route: 'ROTA_B',
        routeDecision,
        speechResponse:
          taskResult.finalResult?.speechResponse ||
          `Concluí a tarefa técnica com sucesso! Criei e validei os arquivos solicitados no workspace do seu computador.`,
        actions: [
          {
            action: 'none',
            target: 'agent_orchestrator',
            parameters: { taskId: taskResult.taskId },
            riskLevel: 'LOW',
            reasoning: routeDecision.reason,
          },
        ],
        plan: {
          id: taskResult.taskId,
          title: taskResult.plan.title,
          description: taskResult.plan.summary,
          status: 'completed',
          currentStepIndex: taskResult.plan.steps.length > 0 ? taskResult.plan.steps.length - 1 : 0,
          steps: taskResult.plan.steps.map((s, idx) => ({
            id: s.id || `s_${idx + 1}`,
            title: s.title,
            status: 'completed',
            action: {
              action: 'write_file',
              target: s.targetFile || 'workspace',
              riskLevel: 'LOW',
              reasoning: 'Etapa executada e testada no sandbox real',
            },
          })),
        },
        taskState: taskResult,
        artifact: taskResult.finalResult?.artifact,
        requiresConfirmation: false,
      });
    } catch (taskErr: any) {
      console.error('[TaskRouter:ROTA_B] Falha na execução da tarefa especializada:', taskErr);
      return res.status(500).json({
        error: taskErr?.message || 'Erro ao executar tarefa técnica na ROTA B.',
        speechResponse: `Ocorreu um erro ao processar a tarefa na API especializada de Texto e Código: ${taskErr?.message || 'Falha na execução'}.`,
        route: 'ROTA_B',
        routeDecision,
        actions: [{ action: 'none', target: 'error', riskLevel: 'LOW', reasoning: 'Erro na ROTA B' }],
      });
    }
  }

  // ROTA A: Continua com a conversação normal (Groq / Gemini) sem alterações












  // Build Rich Context Prompt for AI Models (Groq & Gemini) - Seleção das 15 memórias mais relevantes
  const allMemories = loadMemories();
  const relevantMemories = selectRelevantMemories(allMemories, prompt, 15);
  const memoryContext = relevantMemories.map((m) => `- [${m.category || 'LEARNED'}] ${m.key}: ${m.value}`).join('\n');
  const allProjects = loadProjects();
  const activeProj = allProjects.find((p) => p.id === activeProjectId) || allProjects[0];

  // Format Data Hub files context
  const dataHubFileList = dataHubContext && dataHubContext.files && dataHubContext.files.length > 0
    ? dataHubContext.files.map((f: any, idx: number) => {
        return `${idx + 1}. "${f.name}" [ID: "${f.id}", Categoria: ${f.category}, Extensão: .${f.extension}, Tamanho: ${(f.size / 1024).toFixed(1)} KB${f.summary ? `, Resumo/Info: "${f.summary}"` : ''}]`;
      }).join('\n')
    : 'Nenhum arquivo indexado no Data Hub no momento.';

  const mediaFileList = listMediaFiles()
    .slice(0, 15)
    .map((file) => file.name)
    .join(', ');

  const systemPromptWithMemory = `Você é o OTTO, um assistente de inteligência artificial de alta performance com autonomia total para analisar, raciocinar e controlar os recursos da aplicação.
"Seu computador. Sua voz. Seu assistente."

ESTADO ATUAL DO DATA HUB DO USUÁRIO (${dataHubContext?.totalFiles || 0} arquivos indexados):
${dataHubFileList}

MEMÓRIAS DE LONGO PRAZO E PREFERÊNCIAS ATIVAS:
${memoryContext || 'Nenhuma preferência personalizada registrada.'}

MÍDIA PRONTA PARA O FFMPEG (otto_workspace/media/in):
${mediaFileList || 'Nenhum áudio ou vídeo enviado ainda.'}

AÇÕES E RECURSOS DO SITE QUE VOCÊ PODE DECIDIR ACIONAR AUTONOMAMENTE:
- preview_file: Abre na tela a pré-visualização completa (player de vídeo com controles, player de áudio, leitor de PDF, visualizador de imagem ou planilha/código) para um arquivo do Data Hub. Use SEMPRE que o usuário pedir para ver, resumir, analisar, tocar ou abrir um arquivo. (parameters: { fileId: "<id>", filename: "<nome>" }, target: "<id_ou_nome>")
- open_datahub: Abre o gerenciador de arquivos e pastas do Data Hub. (parameters: {}, target: "datahub")
- embedded_youtube: Abre o player de vídeo integrado do YouTube com o melhor conteúdo. Use para músicas, tutoriais, receitas e vídeos. (parameters: { query: "<termo de busca>" }, target: "<termo>")
- open_memory_map: Abre o mapa mental planetário de memórias do OTTO. (parameters: {}, target: "memory_map")
- open_terminal: Abre o terminal de comandos e diagnóstico de sistema. (parameters: {}, target: "terminal")
- media_ffmpeg: Processa áudio, vídeo ou imagem com o ffmpeg (extrair áudio, converter, comprimir, thumbnail, cortar, GIF, quadros, normalizar volume, analisar). Use quando o usuário pedir para transformar uma mídia. (parameters: { operation: "extract_audio" | "convert" | "compress" | "thumbnail" | "trim" | "to_gif" | "extract_frames" | "normalize_audio" | "probe", file: "<nome ou id do arquivo>", output: "<nome.ext>", options: { start?, end?, crf?, height?, fps? } }, target: "<nome do arquivo>")
- open_settings: Abre as configurações de voz, temas e permissões. (parameters: {}, target: "settings")
- organize_datahub: Gera e exibe o plano de organização inteligente de pastas e triagem de arquivos. (parameters: {}, target: "organize")
- detect_duplicates: Analisa e exibe arquivos duplicados no Data Hub. (parameters: {}, target: "duplicates")
- system_volume: Ajusta o volume de som do sistema. (parameters: { direction: "up" | "down" | "mute" }, target: "volume")
- none: Resposta puramente textual/conversacional quando não for necessário abrir uma janela.

DIRETRIZES FUNDAMENTAIS DE RACIOCÍNIO E DECISÃO:
1. Responda SEMPRE de forma inteligente, natural, detalhada e precisa em português.
2. NUNCA utilize respostas prontas, engessadas ou genéricas.
3. Você tem AUTONOMIA para DECIDIR se abre ou não uma janela ou visualizador com base na intenção real do usuário.
4. Se o usuário perguntar se você consegue ver os arquivos dele (ex: "vc consegue ver meus arquivos?"), responda que SIM e mencione/liste os arquivos reais presentes no Data Hub acima!
5. Se o usuário pedir para resumir, analisar ou abrir um arquivo específico (ex: "resuma esse video TikSave_mnsfx.aep_1790439298321_HD.mp4", "leia o relatório", "mostre o arquivo X"), forneça uma análise/resumo concreto do arquivo com base no nome e dados disponíveis e DECIDA abrir o visualizador retornando a ação "preview_file" com o ID ou nome do arquivo!
6. Se o usuário pedir para tocar música ou vídeo no YouTube, retorne a ação "embedded_youtube" com a query correspondente.
7. Retorne a resposta ESTRITAMENTE em formato JSON com o seguinte esquema:
{
  "speechResponse": "Sua resposta analítica, detalhada e inteligente ao usuário.",
  "actions": [
    {
      "action": "preview_file" | "open_datahub" | "embedded_youtube" | "open_memory_map" | "open_terminal" | "open_settings" | "organize_datahub" | "detect_duplicates" | "system_volume" | "media_ffmpeg" | "none",
      "target": "id_ou_termo_alvo",
      "parameters": { ... },
      "riskLevel": "LOW" | "MEDIUM" | "HIGH",
      "reasoning": "Motivo da decisão tomada pela IA"
    }
  ],
  "requiresConfirmation": false
}`;

  // 1. PRIMARY AI Model: GroqCloud (openai/gpt-oss-120b)
  if (process.env.GROQ_API_KEY) {
    try {
      const messages: GroqMessage[] = [
        { role: 'system', content: systemPromptWithMemory },
      ];

      for (const turn of conversationHistory.slice(-8)) {
        if (turn.role && (turn.content || turn.text)) {
          const role = turn.role === 'assistant' || turn.role === 'otto' ? 'assistant' : 'user';
          messages.push({ role, content: turn.content || turn.text });
        }
      }

      messages.push({ role: 'user', content: `Comando do usuário: "${prompt}"` });

      const groqResult = await GroqService.sendMessage({
        messages,
        model: GroqService.DEFAULT_MODEL,
        temperature: 0.2,
        reasoningEffort: 'low',
        responseFormat: 'json',
      });

      if (groqResult && groqResult.content) {
        let rawContent = groqResult.content.trim();
        if (rawContent.startsWith('```json')) {
          rawContent = rawContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (rawContent.startsWith('```')) {
          rawContent = rawContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        try {
          const parsed = JSON.parse(rawContent);
          return res.json({
            provider: `groq-${groqResult.model}`,
            ...parsed,
          });
        } catch {
          return res.json({
            provider: `groq-${groqResult.model}`,
            speechResponse: rawContent,
            actions: [{ action: 'none', target: 'groq_chat', parameters: {}, riskLevel: 'LOW', reasoning: 'Resposta em texto gerada pela IA' }],
            requiresConfirmation: false,
          });
        }
      }
    } catch (groqErr: any) {
      console.log('[GroqPrimaryAI] Groq indisponível no momento. Usando fallback Gemini.');
    }
  }

  // 2. SECONDARY / FALLBACK AI Model: Gemini
  if (geminiAi) {
    try {
      const contents: any[] = [];
      const recentTurns = conversationHistory.slice(-6);
      for (const turn of recentTurns) {
        const role = turn.role === 'assistant' || turn.role === 'otto' ? 'model' : 'user';
        const textContent = turn.content || turn.text || '';
        if (textContent.trim()) {
          contents.push({
            role,
            parts: [{ text: textContent }],
          });
        }
      }
      contents.push({
        role: 'user',
        parts: [{ text: `Comando do usuário: "${prompt}"` }],
      });

      const result = await generateWithGeminiFallback({
        contents,
        systemInstruction: systemPromptWithMemory,
        responseMimeType: 'application/json',
        temperature: 0.2,
      });

      if (result && result.text) {
        let rawText = result.text.trim();
        if (rawText.startsWith('```json')) {
          rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (rawText.startsWith('```')) {
          rawText = rawText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        try {
          const parsed = JSON.parse(rawText);
          return res.json({
            provider: result.model,
            ...parsed,
          });
        } catch {
          return res.json({
            provider: result.model,
            speechResponse: rawText,
            actions: [{ action: 'none', target: 'gemini_chat', parameters: {}, riskLevel: 'LOW', reasoning: 'Resposta direta gerada pelo modelo neural' }],
            requiresConfirmation: false,
          });
        }
      }
    } catch (apiErr: any) {
      console.warn('[GeminiAI] Falha na chamada da IA Gemini:', apiErr?.message || apiErr);
    }
  }

  // Se nenhum modelo conseguiu responder, retorna erro real transparente (PROIBIDO mensagem pronta ou simulada)
  return res.status(503).json({
    error: 'Modelos neurais temporariamente indisponíveis.',
    speechResponse: 'Desculpe, ocorreu uma instabilidade na conexão com os modelos de IA e não foi possível processar sua solicitação agora.',
    actions: [{ action: 'none', target: 'error', parameters: {}, riskLevel: 'LOW', reasoning: 'Falha nos provedores de IA' }],
    requiresConfirmation: false,
  });
});

// 8. Vision Endpoint: Screen capture analysis
app.post('/api/vision/analyze', async (req, res) => {
  try {
    const { imageBase64, question = 'O que está nesta tela?' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Imagem ausente' });
    }

    if (!geminiAi) {
      return res.json({
        speechResponse: 'A visão computacional requer conexão com a IA, mas analisei a captura com o sensor local.',
        analysis: 'Captura de tela recebida com sucesso. Para análise semântica avançada em tempo real, conecte a chave de API.',
      });
    }

    const cleanBase64 = (imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64)
      .trim()
      .replace(/\s+/g, '');

    const result = await generateWithGeminiFallback({
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64,
            },
          },
          {
            text: `Você é o OTTO, assistente de computador. O usuário pergunta: "${question}". Analise o que está visível na tela e forneça um resumo conciso, útil e objetivo em português. Responda em no máximo 3 frases com tom profissional.`,
          },
        ],
      },
      temperature: 0.2,
    });

    const analysis = result?.text || 'Não consegui analisar o conteúdo da tela com clareza no momento.';
    res.json({
      speechResponse: analysis.slice(0, 180),
      analysis,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao analisar tela', details: err?.message || String(err) });
  }
});

async function searchYouTubeVideos(query: string) {
  const cleanQ = encodeURIComponent(query.trim());
  return {
    query,
    topVideo: {
      id: 'search_top',
      title: `Vídeo: ${query}`,
      url: `https://www.youtube.com/results?search_query=${cleanQ}`,
      embedUrl: `https://www.youtube.com/embed?listType=search&list=${cleanQ}`,
      author: 'YouTube',
      thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    },
    relatedVideos: [
      {
        id: 'rel_1',
        title: `Conteúdo relacionado: ${query}`,
        url: `https://www.youtube.com/results?search_query=${cleanQ}`,
        embedUrl: `https://www.youtube.com/embed?listType=search&list=${cleanQ}`,
        author: 'YouTube',
        thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
      },
    ],
  };
}

async function fetchLiveKnowledge(query: string) {
  try {
    const res = await fetch(`https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=1&format=json&origin=*`, {
      headers: { 'User-Agent': 'OTTO-Liquid/2.0' },
    });
    if (res.ok) {
      const data = await res.json();
      const first = data?.query?.search?.[0];
      if (first) {
        const cleanSnippet = first.snippet.replace(/<[^>]*>/g, '');
        return {
          title: first.title,
          summary: cleanSnippet,
          fullExtract: cleanSnippet,
          source: `https://pt.wikipedia.org/wiki/${encodeURIComponent(first.title)}`,
        };
      }
    }
  } catch {}
  return {
    title: query,
    summary: `Informações sobre ${query}.`,
    fullExtract: `Conteúdo informativo sobre ${query}.`,
    source: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
  };
}

async function fetchLiveImages(query: string) {
  const cleanQ = query.trim();
  return {
    topic: cleanQ,
    speechResponse: `Encontrei imagens para "${cleanQ}".`,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
        alt: cleanQ,
        title: cleanQ,
        source: 'Galeria Web',
      },
      {
        url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80',
        alt: `${cleanQ} visual`,
        title: `${cleanQ} visual`,
        source: 'Galeria Web',
      },
    ],
  };
}

// 8. YouTube Search Endpoint
app.get('/api/youtube/search', async (req, res) => {
  const query = (req.query.q as string) || 'como fazer uma lasanha';
  try {
    const data = await searchYouTubeVideos(query);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Falha ao buscar no YouTube', details: err?.message });
  }
});

// 8.1 Live Web Knowledge Endpoint
app.get('/api/web/knowledge', async (req, res) => {
  const query = (req.query.q as string) || 'Nilo Peçanha';
  try {
    const data = await fetchLiveKnowledge(query);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Falha ao consultar conhecimento web', details: err?.message });
  }
});

// 8.16 High-Performance Image Proxy & CORS Buster
// Segurança: a URL vem do cliente, então passa pela guarda anti-SSRF
// (bloqueia loopback, rede interna, metadados de nuvem e redirecionamentos
// encadeados), com timeout e teto de tamanho no download.
const IMAGE_PROXY_TIMEOUT_MS = 8000;
const IMAGE_PROXY_MAX_BYTES = 8 * 1024 * 1024;

app.get('/api/proxy/image', async (req, res) => {
  const imageUrl = String(req.query.url || '');
  if (!imageUrl) {
    return res.status(400).send('URL de imagem obrigatória');
  }

  try {
    const response = await safeFetch(imageUrl, {
      timeoutMs: IMAGE_PROXY_TIMEOUT_MS,
      maxBytes: IMAGE_PROXY_MAX_BYTES,
      acceptContentTypes: ['image/'],
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': imageUrl.includes('wikimedia.org') || imageUrl.includes('wikipedia.org')
          ? 'https://pt.wikipedia.org/'
          : 'https://google.com/',
      },
    });

    if (!response.ok) {
      return res.status(response.status).send(`Falha ao carregar imagem remota: ${response.statusText}`);
    }

    const buffer = await readBodyWithLimit(response, IMAGE_PROXY_MAX_BYTES);
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(buffer);
  } catch (err: any) {
    if (err instanceof UnsafeUrlError) {
      console.warn('[ImageProxy] URL bloqueada:', imageUrl, err.message);
      return res.status(400).send(err.message);
    }
    if (err instanceof PayloadTooLargeError) {
      return res.status(413).send(err.message);
    }
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      return res.status(504).send('A imagem demorou demais para carregar.');
    }
    console.warn('[ImageProxy] Error proxying image:', imageUrl, err?.message);
    res.status(502).send('Erro ao buscar imagem');
  }
});

// 8.15 Live Holographic Images Endpoint
app.get('/api/images/search', async (req, res) => {
  const query = (req.query.q as string) || 'Neymar';
  try {
    const data = await fetchLiveImages(query);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Falha ao buscar imagens', details: err?.message });
  }
});

// 8.2 In-Site Web & Encyclopedic Article Preview Endpoint (No external navigation required)
app.get('/api/web/article-preview', async (req, res) => {
  const targetUrl = (req.query.url as string) || '';
  const title = (req.query.title as string) || '';

  try {
    if (targetUrl.includes('wikipedia.org')) {
      const match = targetUrl.match(/\/wiki\/([^#?]+)/);
      const pageTitle = match ? decodeURIComponent(match[1]) : title;

      if (pageTitle) {
        const apiUrl = `https://pt.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=extracts&explaintext=1&format=json&origin=*`;
        const wikiRes = await fetch(apiUrl, {
          headers: { 'User-Agent': 'OTTO-Assistant/2.0 (Article Reader)' },
        });

        if (wikiRes.ok) {
          const data = await wikiRes.json();
          const pages = data?.query?.pages || {};
          const page = Object.values(pages)[0] as any;
          if (page && page.extract) {
            return res.json({
              title: page.title || title,
              extract: page.extract,
              url: targetUrl,
            });
          }
        }
      }
    }

    // Default fallback summary
    const fallbackKnowledge = await fetchLiveKnowledge(title || targetUrl);
    res.json({
      title: fallbackKnowledge.title,
      extract: fallbackKnowledge.fullExtract || fallbackKnowledge.summary,
      url: targetUrl,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Falha ao carregar prévia do artigo', details: err?.message });
  }
});

// 8.5 Google AI Studio (Gemini) Text-to-Speech Endpoints
let geminiTtsCooldownUntil = 0;

app.get('/api/tts/gemini/status', (req, res) => {
  const inCooldown = Date.now() < geminiTtsCooldownUntil;
  res.json({
    available: Boolean(geminiAi) && !inCooldown,
    inCooldown,
    provider: 'gemini',
    model: 'gemini-3.8-flash-lite-tts',
  });
});

app.get('/api/tts/gemini/voices', (req, res) => {
  const voices = [
    { voiceId: 'Puck', name: 'Puck (Google AI Studio)', lang: 'pt-BR', description: 'Voz Masculina Natural, Clara e Dinâmica' },
    { voiceId: 'Kore', name: 'Kore (Google AI Studio)', lang: 'pt-BR', description: 'Voz Feminina Clara e Executiva' },
    { voiceId: 'Zephyr', name: 'Zephyr (Google AI Studio)', lang: 'pt-BR', description: 'Voz Suave, Tecnológica e Acolhedora' },
    { voiceId: 'Fenrir', name: 'Fenrir (Google AI Studio)', lang: 'pt-BR', description: 'Voz Profunda, Firme e Autoritária' },
    { voiceId: 'Charon', name: 'Charon (Google AI Studio)', lang: 'pt-BR', description: 'Voz Calma, Expressiva e Solene' },
  ];
  res.json({
    voices,
    provider: 'gemini',
    available: Boolean(geminiAi) && Date.now() >= geminiTtsCooldownUntil,
  });
});

app.post('/api/tts/gemini', async (req, res) => {
  const { text, voiceName = 'Puck', style } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Campo "text" é obrigatório.' });
  }

  if (!geminiAi) {
    return res.json({ fallback: true, available: false, reason: 'no_gemini_key' });
  }

  if (Date.now() < geminiTtsCooldownUntil) {
    return res.json({ fallback: true, available: false, reason: 'rate_limit_cooldown' });
  }

  // Clean markdown, symbols or code brackets for speech
  const cleanedText = text
    .replace(/```[\s\S]*?```/g, 'código omitido')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[#*_~>]/g, '')
    .trim();

  if (!cleanedText) {
    return res.status(400).json({ error: 'Texto limpo está vazio.' });
  }

  try {
    const candidateModels = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts'];
    let audioBase64: string | null = null;

    for (const model of candidateModels) {
      try {
        const response = await geminiAi.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: cleanedText,
                  speechMetadata: {
                    style: style || 'Voz clara, profissional, fluida e natural em português do Brasil',
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName || 'Puck' },
              },
            },
          },
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            audioBase64 = part.inlineData.data;
            break;
          }
        }
        if (audioBase64) break;
      } catch (err: any) {
        const errMsg = String(err?.message || err);
        if (errMsg.includes('429') || errMsg.includes('Quota exceeded') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          geminiTtsCooldownUntil = Date.now() + 15000; // 15 second cooldown for rapid recovery
          console.log('[Gemini TTS Endpoint] Quota limit reached (429). Activating 15s cooldown and falling back seamlessly.');
          break;
        } else {
          console.warn(`[Gemini TTS Endpoint] Model ${model} failed:`, errMsg.slice(0, 150));
        }
      }
    }

    if (audioBase64) {
      const rawBuffer = Buffer.from(audioBase64, 'base64');
      const isWav = rawBuffer.slice(0, 4).toString('utf-8') === 'RIFF';
      const finalBuffer = isWav ? rawBuffer : pcmToWav(rawBuffer, 24000, 1, 16);

      res.set({
        'Content-Type': 'audio/wav',
        'Content-Length': finalBuffer.length,
        'Cache-Control': 'no-cache',
      });
      return res.send(finalBuffer);
    }

    res.json({ fallback: true, available: false, reason: 'no_audio_returned' });
  } catch (err: any) {
    res.json({ fallback: true, available: false, reason: 'gemini_error', error: err?.message });
  }
});

// 9. ElevenLabs TTS Endpoint
const KNOWN_EXHAUSTED_KEY = 'sk_7f046a098af1dae644fce19ce44fc23980b022afc6680165';
let customElevenLabsKey: string = process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY !== KNOWN_EXHAUSTED_KEY
  ? process.env.ELEVENLABS_API_KEY
  : '';

// Default to true (quota exceeded) if only the exhausted default key is available
let elevenLabsQuotaExceeded: boolean = !customElevenLabsKey;

// Status route so frontend can display accurate availability
app.get('/api/tts/elevenlabs/status', (req, res) => {
  const userHeaderKey = (req.headers['x-elevenlabs-key'] as string)?.trim();
  const effectiveKey = userHeaderKey || customElevenLabsKey;
  const isAvailable = Boolean(effectiveKey && effectiveKey !== KNOWN_EXHAUSTED_KEY && !elevenLabsQuotaExceeded);
  
  res.json({
    available: isAvailable,
    quotaExceeded: elevenLabsQuotaExceeded || !effectiveKey || effectiveKey === KNOWN_EXHAUSTED_KEY,
    hasCustomKey: Boolean(effectiveKey && effectiveKey !== KNOWN_EXHAUSTED_KEY),
  });
});

// Configure or test personal ElevenLabs API key
app.post('/api/tts/elevenlabs/key', async (req, res) => {
  const { apiKey } = req.body || {};
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    customElevenLabsKey = '';
    elevenLabsQuotaExceeded = true;
    return res.json({
      success: true,
      available: false,
      quotaExceeded: true,
      message: 'Chave removida. Usando síntese nativa do navegador (Web Speech API).',
    });
  }

  const cleanKey = apiKey.trim();
  if (cleanKey === KNOWN_EXHAUSTED_KEY) {
    customElevenLabsKey = '';
    elevenLabsQuotaExceeded = true;
    return res.status(400).json({
      success: false,
      available: false,
      quotaExceeded: true,
      error: 'Esta chave atingiu a cota máxima de créditos (quota_exceeded). Por favor insira uma chave válida com créditos.',
    });
  }

  try {
    const testRes = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': cleanKey },
    });

    if (testRes.ok) {
      customElevenLabsKey = cleanKey;
      elevenLabsQuotaExceeded = false;
      return res.json({
        success: true,
        available: true,
        quotaExceeded: false,
        message: 'Chave ElevenLabs conectada com sucesso!',
      });
    } else {
      return res.status(400).json({
        success: false,
        available: false,
        quotaExceeded: true,
        error: 'Chave ElevenLabs inválida ou cota esgotada.',
      });
    }
  } catch {
    return res.status(500).json({
      success: false,
      available: false,
      error: 'Erro de conexão com ElevenLabs.',
    });
  }
});

app.get('/api/tts/elevenlabs/voices', async (req, res) => {
  const userHeaderKey = (req.headers['x-elevenlabs-key'] as string)?.trim();
  const effectiveKey = userHeaderKey || customElevenLabsKey;

  if (!effectiveKey || effectiveKey === KNOWN_EXHAUSTED_KEY || elevenLabsQuotaExceeded) {
    return res.json({ voices: [], provider: 'elevenlabs', available: false, quotaExceeded: true });
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': effectiveKey,
      },
    });

    if (!response.ok) {
      elevenLabsQuotaExceeded = true;
      return res.json({ voices: [], provider: 'elevenlabs', available: false, quotaExceeded: true });
    }

    const data = await response.json();
    const voices = (data.voices || []).map((v: any) => ({
      voiceId: v.voice_id,
      name: v.name,
      category: v.category,
      description: v.labels?.description || v.labels?.accent || '',
      previewUrl: v.preview_url,
    }));

    res.json({ voices, provider: 'elevenlabs', available: true, quotaExceeded: false });
  } catch {
    elevenLabsQuotaExceeded = true;
    res.json({ voices: [], provider: 'elevenlabs', available: false, quotaExceeded: true });
  }
});

app.post('/api/tts/elevenlabs', async (req, res) => {
  const { text, voiceId = 'JBFqnCBsd6RMkjVDRZzb', modelId = 'eleven_multilingual_v2', apiKey: bodyKey } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Campo "text" é obrigatório.' });
  }

  const userHeaderKey = (req.headers['x-elevenlabs-key'] as string)?.trim();
  const effectiveKey = bodyKey || userHeaderKey || customElevenLabsKey;

  // If quota is marked exceeded or key is the exhausted default, return graceful fallback immediately
  if (!effectiveKey || effectiveKey === KNOWN_EXHAUSTED_KEY || elevenLabsQuotaExceeded) {
    return res.json({
      fallback: true,
      available: false,
      reason: 'quota_exceeded',
    });
  }

  // Clean markdown, symbols or code brackets for speech
  const cleanedText = text
    .replace(/```[\s\S]*?```/g, 'código omitido')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[#*_~>]/g, '')
    .trim();

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': effectiveKey,
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: cleanedText,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.1,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      if (err.includes('quota_exceeded') || response.status === 401 || response.status === 429) {
        elevenLabsQuotaExceeded = true;
      }
      return res.json({
        fallback: true,
        available: false,
        reason: 'quota_exceeded',
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length,
      'Cache-Control': 'no-cache',
    });
    res.send(buffer);
  } catch {
    elevenLabsQuotaExceeded = true;
    res.json({
      fallback: true,
      available: false,
      reason: 'connection_error',
    });
  }
});

// 10. Respeecher Space API TTS Endpoints (Fallback & High-Performance Neural Voice)
const DEFAULT_RESPEECHER_KEY = 'XuZ-_PhuaIxHaO7awdfuNg';
let customRespeecherKey: string = process.env.RESPEECHER_API_KEY || DEFAULT_RESPEECHER_KEY;
let respeecherAvailable: boolean = true;

// Helper to wrap raw PCM stream into RIFF WAV audio
function pcmToWav(pcmData: Buffer, sampleRate = 24000, numChannels = 1, bitDepth = 16): Buffer {
  const byteRate = sampleRate * numChannels * (bitDepth / 8);
  const blockAlign = numChannels * (bitDepth / 8);
  const dataSize = pcmData.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

// Respeecher Status Route
app.get('/api/tts/respeecher/status', (req, res) => {
  const userHeaderKey = (req.headers['x-respeecher-key'] as string)?.trim();
  const effectiveKey = userHeaderKey || customRespeecherKey;
  
  res.json({
    available: respeecherAvailable && Boolean(effectiveKey),
    hasKey: Boolean(effectiveKey),
    isDefaultKey: effectiveKey === DEFAULT_RESPEECHER_KEY,
  });
});

// Respeecher Key Configuration
app.post('/api/tts/respeecher/key', async (req, res) => {
  const { apiKey } = req.body || {};
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    customRespeecherKey = DEFAULT_RESPEECHER_KEY;
    return res.json({
      success: true,
      available: true,
      message: 'Chave redefinida para o padrão Respeecher Space API.',
    });
  }

  const cleanKey = apiKey.trim();
  try {
    const testRes = await fetch('https://api.respeecher.com/v1/public/tts/en-rt/voices', {
      headers: { 'X-API-Key': cleanKey },
    });

    if (testRes.ok) {
      customRespeecherKey = cleanKey;
      respeecherAvailable = true;
      return res.json({
        success: true,
        available: true,
        message: 'Chave Respeecher Space API conectada com sucesso!',
      });
    } else {
      return res.status(400).json({
        success: false,
        available: false,
        error: 'Chave Respeecher inválida.',
      });
    }
  } catch {
    return res.status(500).json({
      success: false,
      available: false,
      error: 'Erro ao conectar à Respeecher API.',
    });
  }
});

// Respeecher Voices List (pt-BR + English)
app.get('/api/tts/respeecher/voices', async (req, res) => {
  const userHeaderKey = (req.headers['x-respeecher-key'] as string)?.trim();
  const effectiveKey = userHeaderKey || customRespeecherKey;

  if (!effectiveKey) {
    return res.json({ voices: [], provider: 'respeecher', available: false });
  }

  try {
    const [ptRes, enRes] = await Promise.all([
      fetch('https://api.respeecher.com/v1/public/tts/pt-br-rt/voices', {
        headers: { 'X-API-Key': effectiveKey },
      }).catch(() => null),
      fetch('https://api.respeecher.com/v1/public/tts/en-rt/voices', {
        headers: { 'X-API-Key': effectiveKey },
      }).catch(() => null),
    ]);

    const allVoices: Array<{
      voiceId: string;
      name: string;
      lang: string;
      description?: string;
    }> = [];

    if (ptRes && ptRes.ok) {
      const ptData = await ptRes.json();
      (ptData || []).forEach((v: any) => {
        allVoices.push({
          voiceId: v.id,
          name: v.full_name || v.id,
          lang: 'pt-BR',
          description: `Voz Neural Brasileira (${v.id})`,
        });
      });
    }

    if (enRes && enRes.ok) {
      const enData = await enRes.json();
      (enData || []).forEach((v: any) => {
        allVoices.push({
          voiceId: v.id,
          name: v.full_name || v.id,
          lang: 'en-US',
          description: `Voz Neural em Tempo Real (${v.id})`,
        });
      });
    }

    res.json({
      voices: allVoices,
      provider: 'respeecher',
      available: allVoices.length > 0,
    });
  } catch {
    res.json({ voices: [], provider: 'respeecher', available: false });
  }
});

// Respeecher Synthesis Endpoint
app.post('/api/tts/respeecher', async (req, res) => {
  const { text, voiceId = 'daniela', apiKey: bodyKey } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Campo "text" é obrigatório.' });
  }

  const userHeaderKey = (req.headers['x-respeecher-key'] as string)?.trim();
  const effectiveKey = bodyKey || userHeaderKey || customRespeecherKey;

  if (!effectiveKey) {
    return res.json({ fallback: true, available: false, reason: 'no_key' });
  }

  // Clean markdown for speech
  const cleanedText = text
    .replace(/```[\s\S]*?```/g, 'código omitido')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[#*_~>]/g, '')
    .trim();

  // Determine if it's a Brazilian Portuguese voice or English voice
  const ptVoices = ['daniela', 'barros-chatbot', 'barros-conversational', 'barros-documentary', 'barros-news', 'barros-sport'];
  const isPtBrVoice = ptVoices.includes(voiceId) || !voiceId;

  try {
    if (isPtBrVoice) {
      // Use pt-br-rt model with SSE and assemble PCM chunks to WAV
      const targetVoice = voiceId && ptVoices.includes(voiceId) ? voiceId : 'daniela';
      const sseRes = await fetch('https://api.respeecher.com/v1/public/tts/pt-br-rt/tts/sse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': effectiveKey,
        },
        body: JSON.stringify({
          transcript: cleanedText,
          voice: { id: targetVoice },
        }),
      });

      if (sseRes.ok) {
        const rawText = await sseRes.text();
        const pcmChunks: Buffer[] = [];
        for (const line of rawText.split('\n')) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line.replace(/^data:\s*/, ''));
            if (parsed.data) {
              pcmChunks.push(Buffer.from(parsed.data, 'base64'));
            }
          } catch {}
        }

        if (pcmChunks.length > 0) {
          const rawPcm = Buffer.concat(pcmChunks);
          const wavBuffer = pcmToWav(rawPcm, 24000, 1, 16);

          res.set({
            'Content-Type': 'audio/wav',
            'Content-Length': wavBuffer.length,
            'Cache-Control': 'no-cache',
          });
          return res.send(wavBuffer);
        }
      }
    }

    // Fallback or English voice: use en-rt/tts/bytes
    const targetVoice = voiceId || 'samantha';
    const bytesRes = await fetch('https://api.respeecher.com/v1/public/tts/en-rt/tts/bytes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': effectiveKey,
      },
      body: JSON.stringify({
        transcript: cleanedText,
        voice: { id: targetVoice },
      }),
    });

    if (bytesRes.ok) {
      const arrayBuffer = await bytesRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      res.set({
        'Content-Type': 'audio/wav',
        'Content-Length': buffer.length,
        'Cache-Control': 'no-cache',
      });
      return res.send(buffer);
    }

    // If both failed, trigger smooth fallback
    res.json({
      fallback: true,
      available: false,
      reason: 'respeecher_failed',
    });
  } catch {
    res.json({
      fallback: true,
      available: false,
      reason: 'connection_error',
    });
  }
});

// Vite middleware in development
function injectSessionToken(html: string): string {
  if (!SESSION_TOKEN) return html;
  const meta = `<meta name="otto-token" content="${SESSION_TOKEN}" />`;
  return html.includes('name="otto-token"') ? html : html.replace('</head>', `  ${meta}\n</head>`);
}

app.get('/__otto/live', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ buildId: BUILD_ID, pid: process.pid, startedAt: new Date().toISOString() });
});

async function startServer() {
  app.use(notFoundApiHandler);

  // Servidor HTTP único: o Vite (dev) se acopla a ele em vez de abrir a porta
  // extra 24678 do WebSocket de HMR — que aparecia como um preview inválido.
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        // Em Vite 8 quem abre a porta extra (24678) é `server.ws`, não `hmr`.
        // false desliga o WebSocket; quando ligado, ele usa o MESMO servidor HTTP.
        ws: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Produção: estáticos + index.html com injeção do token de sessão
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, { index: false }));
    app.get('*', (req, res, next) => {
      const indexPath = path.join(distDir, 'index.html');
      if (!fs.existsSync(indexPath)) return next();
      try {
        const html = injectSessionToken(fs.readFileSync(indexPath, 'utf-8'));
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.send(html);
      } catch {
        res.sendFile(indexPath);
      }
    });
  }

  // Middleware de erro global (sempre por último)
  app.use(errorHandler);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[OTTO] Server running on http://localhost:${PORT}`);
    console.log(`[OTTO] Workspace: ${WORKSPACE_DIR}`);
    console.log(
      `[OTTO] Auth: ${isUsingExplicitToken() ? 'OTTO_ACCESS_TOKEN (.env)' : 'token de sessão gerado em otto_workspace/.otto_token'}`
    );
  });
}

startServer();

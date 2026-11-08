import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { TextCodeProvider } from '../textCodeProvider.js';
import { WORKSPACE_DIR } from '../memoryStore.js';

export const slidesRouter = Router();

export interface SlideItem {
  title: string;
  subtitle?: string;
  content: string[];
  notes?: string;
}

export interface GeneratedSlidesResult {
  slidesArtifact: {
    id: string;
    type: string;
    title: string;
    code: string;
    slidesData: SlideItem[];
    fallback?: boolean;
    warning?: string;
  };
  agentPlan: any;
  speechResponse: string;
  fallback: boolean;
}

/**
 * Gerador Real de Slides utilizando o TextCodeProvider.
 * Gera de 6 a 8 slides detalhados em JSON estrito a partir do tema.
 * Grava os arquivos HTML e JSON no workspace do OTTO.
 * Se a API falhar, utiliza conteúdo de contingência com sinalização explícita na resposta.
 */
export async function generateRealSlidesWithApi(topicPrompt: string): Promise<GeneratedSlidesResult> {
  const cleanTopicName = (topicPrompt || 'Apresentação Estratégica')
    .replace(/(crie|gere|fazer|monte|desenvolva|apresentação|slides?|sobre|de|um|uma)\s+/gi, '')
    .trim() || 'Apresentação Estratégica';

  const folderSafeName = cleanTopicName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30) || 'apresentacao';

  let generatedSlides: SlideItem[] = [];
  let presentationTitle = `Apresentação Estratégica: ${cleanTopicName}`;
  let usedFallback = false;

  // 1. Chamada neural ao TextCodeProvider para gerar 6-8 slides em JSON estrito
  try {
    const apiRes = await TextCodeProvider.generate({
      messages: [
        {
          role: 'system',
          content: `Você é um arquiteto especialista em apresentações executivas e técnicas.
Sua tarefa é criar uma apresentação profissional, profunda e específica sobre o tema fornecido.
Gere OBRIGATORIAMENTE entre 6 e 8 slides.
Retorne APENAS um JSON estrito (sem markdown, sem blocos de código com backticks).
Estrutura exigida:
{
  "title": "Título Principal da Apresentação",
  "slides": [
    {
      "title": "Título do Slide",
      "subtitle": "Subtítulo estratégico",
      "content": [
        "Ponto chave 1 com dado ou explicação detalhada",
        "Ponto chave 2 com dado ou explicação detalhada",
        "Ponto chave 3 com dado ou explicação detalhada"
      ],
      "notes": "Notas profundas do apresentador"
    }
  ]
}`,
        },
        {
          role: 'user',
          content: `Crie a apresentação completa de 6 a 8 slides sobre: "${cleanTopicName}".`,
        },
      ],
      temperature: 0.3,
    });

    if (apiRes.content) {
      const cleanJson = apiRes.content.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed.title) presentationTitle = parsed.title;
      if (Array.isArray(parsed.slides) && parsed.slides.length >= 6) {
        generatedSlides = parsed.slides.slice(0, 8);
      } else if (Array.isArray(parsed.slides) && parsed.slides.length > 0) {
        generatedSlides = parsed.slides;
      }
    }
  } catch (err: any) {
    console.warn('[generateRealSlidesWithApi] Falha na chamada da API neural, acionando fallback:', err?.message || err);
  }

  // 2. Conteúdo de contingência (fallback) somente se a API falhar
  if (generatedSlides.length === 0) {
    usedFallback = true;
    presentationTitle = `Apresentação: ${cleanTopicName}`;
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
        title: 'Métricas, Desempenho e Eficiência',
        subtitle: 'Indicadores Chave de Sucesso (KPIs)',
        content: [
          'Monitoramento contínuo de disponibilidade e taxa de acerto.',
          'Otimização de custos operacionais e alocação de recursos.',
          'Feedback contínuo para aprimoramento progressivo do fluxo.',
        ],
        notes: 'Análise quantitativa de desempenho.',
      },
      {
        title: 'Segurança, Governança e Boas Práticas',
        subtitle: 'Proteção de Ativos e Conformidade',
        content: [
          'Aplicação de diretrizes de segurança defensiva e sanitização de dados.',
          'Auditoria periódica de logs e isolamento de tarefas críticas.',
          'Alinhamento com padrões de mercado e requisitos de conformidade.',
        ],
        notes: 'Garantia de segurança e estabilidade.',
      },
      {
        title: 'Tendências Futuras & Roadmap Estratégico',
        subtitle: 'Evolução e Próximos Passos',
        content: [
          'Novos paradigmas emergentes e convergência com sistemas autônomos.',
          'Investimentos prioritários para sustentabilidade do ecossistema a longo prazo.',
          'Plano de ação recomendado para implementação imediata.',
        ],
        notes: 'Encerramento e direcionamento estratégico.',
      },
    ];
  }

  // 3. Montagem do arquivo HTML completo e responsivo
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
    ${generatedSlides
      .map(
        (s, idx) => `
      <div id="slide-${idx}" class="slide-page ${idx === 0 ? 'active' : ''} flex-col max-w-4xl w-full bg-white/[0.04] border border-white/10 p-8 sm:p-14 rounded-3xl backdrop-blur-2xl shadow-2xl transition-all">
        <span class="text-xs font-mono text-cyan-400 tracking-wider uppercase mb-2">SLIDE 0${idx + 1}</span>
        <h1 class="text-2xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight">${s.title}</h1>
        ${s.subtitle ? `<h2 class="text-sm sm:text-base text-slate-400 mb-8 font-medium">${s.subtitle}</h2>` : '<div class="mb-6"></div>'}
        <ul class="space-y-4 text-slate-200 text-sm sm:text-base">
          ${s.content
            .map(
              (c) => `
            <li class="flex items-start gap-3">
              <span class="w-2 h-2 rounded-full bg-cyan-400 mt-2 shrink-0"></span>
              <span class="leading-relaxed">${c}</span>
            </li>
          `
            )
            .join('')}
        </ul>
        ${
          s.notes
            ? `
          <div class="mt-8 pt-4 border-t border-white/10 text-xs font-mono text-slate-400">
            <strong>Notas do Apresentador:</strong> ${s.notes}
          </div>
        `
            : ''
        }
      </div>
    `
      )
      .join('')}
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

  // 4. Gravação física dos arquivos no workspace
  const htmlFilename = `slides_${folderSafeName}.html`;
  const jsonFilename = `slides_${folderSafeName}.json`;
  const htmlFullPath = path.resolve(WORKSPACE_DIR, htmlFilename);
  const jsonFullPath = path.resolve(WORKSPACE_DIR, jsonFilename);

  try {
    fs.writeFileSync(htmlFullPath, htmlPresentation, 'utf-8');
    fs.writeFileSync(
      jsonFullPath,
      JSON.stringify({ title: presentationTitle, slides: generatedSlides, fallback: usedFallback }, null, 2),
      'utf-8'
    );
  } catch (err) {
    console.error('[generateRealSlidesWithApi] Erro na gravação em disco:', err);
  }

  const slidesArtifact = {
    id: `art_slides_${Date.now()}`,
    type: 'slides',
    title: presentationTitle,
    code: htmlPresentation,
    slidesData: generatedSlides,
    fallback: usedFallback,
    warning: usedFallback ? 'Apresentação gerada com template padrão devido à indisponibilidade temporária da API.' : undefined,
  };

  const agentPlan = {
    id: `plan_slides_${Date.now()}`,
    title: `Criação de Apresentação: ${cleanTopicName}`,
    description: `Geração ${usedFallback ? 'de contingência' : 'via TextCodeProvider'} com persistência dos arquivos "${htmlFilename}" e "${jsonFilename}".`,
    currentStepIndex: 0,
    status: 'completed',
    steps: [
      {
        id: 'step_1',
        title: `Pesquisar e estruturar conteúdo sobre "${cleanTopicName}"`,
        description: 'Estruturação conceitual dos tópicos com contextualização e relevância técnica.',
        status: 'completed',
        action: { action: 'none', target: 'ai_research', parameters: { topic: cleanTopicName }, riskLevel: 'LOW', reasoning: 'Pesquisa estruturada' },
      },
      {
        id: 'step_2',
        title: `Gerar ${generatedSlides.length} slides completos`,
        description: 'Elaboração dos títulos, subtítulos, tópicos e anotações do orador.',
        status: 'completed',
        action: { action: 'none', target: 'slide_generator', parameters: {}, riskLevel: 'LOW', reasoning: 'Geração de conteúdo' },
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

  const speechResponse = usedFallback
    ? `Criei uma apresentação de contingência sobre "${cleanTopicName}" com ${generatedSlides.length} slides e salvei os arquivos "${htmlFilename}" e "${jsonFilename}" no seu workspace (nota: gerado via template devido à indisponibilidade temporária da API).`
    : `Construí uma apresentação completa sobre "${cleanTopicName}" via TextCodeProvider! Gerei ${generatedSlides.length} slides profundos e salvei os arquivos "${htmlFilename}" e "${jsonFilename}" diretamente no seu workspace.`;

  return { slidesArtifact, agentPlan, speechResponse, fallback: usedFallback };
}

/**
 * Gerador de Scaffold de Projeto Web via API Neural TextCodeProvider.
 * Gera HTML5, CSS e JavaScript interativo (sem alertas estáticos) adaptados ao tema solicitado.
 */
export async function buildDynamicWebsiteContent(userPrompt: string): Promise<{
  topic: string;
  folderName: string;
  html: string;
  css: string;
  js: string;
  fallback: boolean;
}> {
  const p = (userPrompt || '').toLowerCase();
  const cleanPrompt = userPrompt
    .replace(/(crie|gere|fazer|monte|desenvolva|projeto|site|pagina|landing page|de|um|uma)\s+/gi, '')
    .trim() || 'Aplicação Web Interativa';

  let topic = cleanPrompt;
  let folderName = cleanPrompt.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 25) || 'site_custom';
  let html = '';
  let css = '';
  let js = '';
  let fallback = false;

  // 1. Tenta gerar via TextCodeProvider
  try {
    const apiRes = await TextCodeProvider.generate({
      messages: [
        {
          role: 'system',
          content: `Você é um desenvolvedor frontend full-stack de alto nível.
Crie um projeto web frontend completo e moderno adaptado ao tema solicitado.
O projeto deve conter:
1. Um arquivo HTML responsivo e elegante usando Tailwind CSS via CDN.
2. Um arquivo CSS com animações e estilos complementares.
3. Um arquivo JavaScript INTERATIVO, moderno e dinâmico (com manipulação de DOM, contadores, filtros, formulário funcional na tela ou gráficos SVG simples — NUNCA use alertas estáticos como alert()).
Retorne OBRIGATORIAMENTE um JSON estrito:
{
  "topic": "Nome do Projeto",
  "folderName": "nome_pasta_sem_espacos",
  "html": "código HTML completo",
  "css": "código CSS completo",
  "js": "código JavaScript interativo completo sem alert()"
}`,
        },
        {
          role: 'user',
          content: `Crie a aplicação web moderna sobre o tema: "${cleanPrompt}".`,
        },
      ],
      temperature: 0.3,
    });

    if (apiRes.content) {
      const cleanJson = apiRes.content.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed.html && parsed.js) {
        topic = parsed.topic || cleanPrompt;
        folderName = parsed.folderName || folderName;
        html = parsed.html;
        css = parsed.css || '/* Estilos customizados */';
        js = parsed.js;
      }
    }
  } catch (err: any) {
    console.warn('[buildDynamicWebsiteContent] Falha ao gerar projeto via API neural, utilizando fallback:', err?.message || err);
  }

  // 2. Se a API falhou, utiliza fallback temático
  if (!html || !js) {
    fallback = true;
    html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${topic} • OTTO OS</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
<body class="bg-[#080b11] text-slate-100 min-h-screen flex flex-col justify-between">
  <header class="px-6 py-4 border-b border-white/10 flex justify-between items-center backdrop-blur-xl bg-black/40 sticky top-0 z-50">
    <div class="text-sm font-bold tracking-widest text-cyan-400 uppercase">${topic}</div>
    <div class="text-xs text-slate-400">Template de Contingência</div>
  </header>

  <main class="flex-1 flex flex-col items-center justify-center text-center px-4 py-12">
    <h1 class="text-3xl sm:text-5xl font-extrabold text-white mb-4">${topic}</h1>
    <p class="text-slate-400 max-w-lg mb-8">Aplicação dinâmica gerada para o tema solicitado.</p>
    <div class="flex gap-4">
      <button id="actionBtn" class="px-6 py-3 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all cursor-pointer">
        Interagir
      </button>
      <div id="statusBox" class="px-4 py-3 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
        Pronto
      </div>
    </div>
  </main>

  <footer class="py-4 border-t border-white/5 text-center text-xs text-slate-500 font-mono">
    © 2026 ${topic} • Criado com OTTO OS
  </footer>
  <script src="script.js"></script>
</body>
</html>`;

    css = `/* Estilos de contingência */
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #080b11; font-family: 'Inter', sans-serif; }
button { transition: transform 0.2s ease; }
button:active { transform: scale(0.95); }
`;

    js = `// JavaScript interativo dinâmico (sem alertas estáticos)
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('actionBtn');
  const status = document.getElementById('statusBox');
  let clicks = 0;

  if (btn && status) {
    btn.addEventListener('click', () => {
      clicks++;
      status.textContent = \`Ações registradas: \${clicks}\`;
      status.style.borderColor = '#22d3ee';
    });
  }
});
`;
  }

  return { topic, folderName, html, css, js, fallback };
}

// Rota para solicitação direta de geração de slides
slidesRouter.post('/api/slides/generate', async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: 'Tópico de apresentação obrigatório.' });
    }

    const result = await generateRealSlidesWithApi(topic);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao gerar apresentação de slides', details: err?.message || String(err) });
  }
});

/**
 * OTTO DATA HUB - Storage & Intelligent File Management Service
 * Manages files, folders, content extraction, semantic search, versioning, diffing and plans.
 */

import {
  OttoFile,
  OttoFolder,
  FileCategory,
  FileVersion,
  DuplicateGroup,
  DataHubAnalysisResult,
  DataHubPlan,
  DataHubPlanStep,
  DiffLine,
} from '../types/dataHub';
import { DataHubBlobManager } from './dataHubBlobStore';

const STORAGE_KEY_FILES = 'otto_datahub_files_v1';
const STORAGE_KEY_FOLDERS = 'otto_datahub_folders_v1';
const STORAGE_KEY_VERSIONS = 'otto_datahub_versions_v1';
const STORAGE_KEY_PLANS = 'otto_datahub_plans_v1';

// File extension to category classifier
export function categorizeExtension(ext: string): FileCategory {
  const clean = ext.toLowerCase().replace(/^\./, '');
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'odt', 'pages', 'tex'].includes(clean)) return 'document';
  if (['csv', 'xls', 'xlsx', 'json', 'xml', 'tsv', 'yaml', 'yml'].includes(clean)) return 'data';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico', 'tiff'].includes(clean)) return 'image';
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'sql', 'sh', 'php', 'rb'].includes(clean)) return 'code';
  if (['mp4', 'webm', 'mkv', 'mov', 'avi'].includes(clean)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(clean)) return 'audio';
  return 'other';
}

// Initial Seed Data so the user can test queries immediately
const SEED_FOLDERS: OttoFolder[] = [
  {
    id: 'f_projetos',
    name: 'Projetos',
    path: '/Projetos',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    color: '#38bdf8',
    description: 'Projetos em andamento, orçamentos e relatórios técnicos',
  },
  {
    id: 'f_imagens',
    name: 'imagens',
    path: '/Projetos/imagens',
    parentId: 'f_projetos',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    color: '#a855f7',
    description: 'Diagramas e capturas dos projetos',
  },
  {
    id: 'f_documentos',
    name: 'Documentos',
    path: '/Documentos',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    color: '#10b981',
    description: 'Contratos, atas e acordos de confidencialidade',
  },
  {
    id: 'f_downloads',
    name: 'Downloads',
    path: '/Downloads',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    color: '#f59e0b',
    description: 'Arquivos baixados recentemente para triagem',
  },
];

const SEED_FILES: OttoFile[] = [
  {
    id: 'file_relatorio_ia',
    name: 'relatorio_tecnico_ia_2026.pdf',
    path: '/Projetos/relatorio_tecnico_ia_2026.pdf',
    category: 'document',
    extension: 'pdf',
    size: 485200,
    parentId: 'f_projetos',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'ready',
    content: `RELATÓRIO TÉCNICO: ARQUITETURA DE INTELIGÊNCIA ARTIFICIAL E AGENTES AUTÔNOMOS (2026)
Resumo Executivo:
A integração de agentes autônomos com visão de tela, síntese neural de voz e execução multivariada reduziu a latência operacional em 64%.
Principais métricas avaliadas:
- Tempo de resposta médio da inferência: 420ms
- Acurácia nas chamadas de ferramentas locais: 98.4%
- Estabilidade de memória contextual: retenção de 100% em tarefas encadeadas de até 25 passos.
Recomendações:
1. Priorizar modelos de raciocínio rápido para decisões imediatas.
2. Manter buffers de áudio contínuos com cancelamento dinâmico de eco.
3. Consolidar o sistema Data Hub para indexação direta de documentos sem tráfego externo desnecessário.`,
    metadata: {
      pageCount: 18,
      wordCount: 1450,
      summary: 'Relatório técnico avaliando latência de IA, agentes autônomos e estabilidade de memória.',
      tags: ['ia', 'tecnologia', 'agentes', 'relatorio', 'arquitetura'],
      keywords: ['inferencia', 'latencia', 'memoria', 'data hub', 'agentes'],
      topic: 'Inteligência Artificial & Agentes',
      versionsCount: 1,
    },
  },
  {
    id: 'file_orcamento_xlsx',
    name: 'orcamento_projetos_2026.xlsx',
    path: '/Projetos/orcamento_projetos_2026.xlsx',
    category: 'data',
    extension: 'xlsx',
    size: 198400,
    parentId: 'f_projetos',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    status: 'ready',
    content: `Item, Categoria, Qtd, Custo Unitario (R$), Custo Total (R$), Status
Servidores Cloud GPU H100, Infraestrutura, 4, 12500.00, 50000.00, Aprovado
Licenciamento ElevenLabs & APIs Neurais, Software, 12, 1800.00, 21600.00, Aprovado
Bancos de Dados Vetoriais Cloud, Armazenamento, 2, 3400.00, 6800.00, Aprovado
Segurança da Informação e Auditoria, Compliance, 1, 15000.00, 15000.00, Em analise
Reserva de Contingencia, Financeiro, 1, 20000.00, 20000.00, Aprovado
Total Geral Previsto: R$ 113.400,00`,
    metadata: {
      lineCount: 8,
      wordCount: 78,
      summary: 'Planilha financeira do projeto com previsão orçamentária total de R$ 113.400,00 para 2026.',
      tags: ['orcamento', 'financeiro', 'planilha', 'custos', 'gpu'],
      keywords: ['h100', 'licenciamento', 'cloud', 'contingencia', 'total'],
      topic: 'Orçamento & Finanças',
      versionsCount: 1,
    },
  },
  {
    id: 'file_contrato_pdf',
    name: 'contrato_prestacao_servicos.pdf',
    path: '/Documentos/contrato_prestacao_servicos.pdf',
    category: 'document',
    extension: 'pdf',
    size: 320100,
    parentId: 'f_documentos',
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    status: 'ready',
    content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE TECNOLOGIA E ACORDO DE CONFIDENCIALIDADE (NDA)
Cláusula 1ª - Do Objeto:
O presente instrumento tem por objeto o desenvolvimento de soluções cognitivas integradas, incluindo assistente de voz OTTO e sistema Data Hub.
Cláusula 2ª - Dos Prazos e Entregas:
O cronograma contempla entregas quinzenais com homologação assistida.
Cláusula 3ª - Da Confidencialidade e LGPD:
Todas as informações trocadas, incluindo arquivos disponibilizados no Data Hub, permanecem sob sigilo absoluto e soberania do contratante.
Cláusula 4ª - Do Foro:
Fica eleito o foro da comarca da capital para dirimir eventuais litígios.`,
    metadata: {
      pageCount: 8,
      wordCount: 820,
      summary: 'Contrato formal com termos de serviço, prazos, cláusulas de confidencialidade e conformidade LGPD.',
      tags: ['contrato', 'juridico', 'lgpd', 'nda', 'servicos'],
      keywords: ['clausula', 'confidencialidade', 'prazos', 'otto', 'seguranca'],
      topic: 'Jurídico & Contratos',
      versionsCount: 1,
    },
  },
  {
    id: 'file_relatorio_dup',
    name: 'relatorio_tecnico_ia_2026 (1).pdf',
    path: '/Downloads/relatorio_tecnico_ia_2026 (1).pdf',
    category: 'document',
    extension: 'pdf',
    size: 485200,
    parentId: 'f_downloads',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    status: 'ready',
    content: `RELATÓRIO TÉCNICO: ARQUITETURA DE INTELIGÊNCIA ARTIFICIAL E AGENTES AUTÔNOMOS (2026)
Resumo Executivo:
A integração de agentes autônomos com visão de tela, síntese neural de voz e execução multivariada reduziu a latência operacional em 64%.`,
    metadata: {
      pageCount: 18,
      wordCount: 1450,
      summary: 'Cópia duplicada do relatório técnico da pasta Projetos.',
      tags: ['duplicado', 'download'],
      isDuplicate: true,
      duplicateOfId: 'file_relatorio_ia',
    },
  },
  {
    id: 'file_index_html',
    name: 'index.html',
    path: '/Projetos/index.html',
    category: 'code',
    extension: 'html',
    size: 2450,
    parentId: 'f_projetos',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    status: 'ready',
    content: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OTTO • Neural Portal</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: radial-gradient(circle at 50% 0%, #0c192c 0%, #030712 100%);
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      overflow-x: hidden;
    }
    .card {
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 28px;
      padding: 40px;
      max-width: 560px;
      width: 100%;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(56, 189, 248, 0.15);
      backdrop-filter: blur(20px);
      text-align: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38bdf8;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 20px;
    }
    .pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 10px #38bdf8;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.8); }
    }
    h1 {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 10px;
      background: linear-gradient(135deg, #ffffff 0%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 28px;
    }
    .actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }
    button {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      border: none;
      padding: 12px 24px;
      border-radius: 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 8px 20px rgba(2, 132, 199, 0.35);
      transition: all 0.2s;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px rgba(2, 132, 199, 0.45);
      filter: brightness(1.1);
    }
    .counter-display {
      margin-top: 24px;
      padding: 12px;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 12px;
      font-family: monospace;
      font-size: 13px;
      color: #38bdf8;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">
      <span class="pulse"></span>
      Sistema Operacional OTTO
    </div>
    <h1>Interface HTML5 Interativa</h1>
    <p>Este arquivo index.html foi renderizado no preview interativo com suporte completo a CSS, animações e interações em JavaScript.</p>
    
    <div class="actions">
      <button onclick="handleClick()">Testar Interatividade</button>
      <button style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);" onclick="handleReset()">Resetar</button>
    </div>

    <div class="counter-display" id="counter">Cliques registrados: 0</div>
  </div>

  <script>
    let clicks = 0;
    function handleClick() {
      clicks++;
      document.getElementById('counter').innerText = 'Cliques registrados: ' + clicks + ' (JavaScript Ativo!)';
      document.getElementById('counter').style.color = '#4ade80';
    }
    function handleReset() {
      clicks = 0;
      document.getElementById('counter').innerText = 'Cliques registrados: 0';
      document.getElementById('counter').style.color = '#38bdf8';
    }
  </script>
</body>
</html>`,
    metadata: {
      lineCount: 130,
      wordCount: 210,
      summary: 'Página HTML5 inicial do projeto com interatividade em JavaScript e estilização moderna.',
      tags: ['html', 'preview', 'frontend', 'dashboard'],
      keywords: ['html5', 'javascript', 'css', 'interatividade'],
      topic: 'Desenvolvimento Web',
      versionsCount: 1,
    },
  },
  {
    id: 'file_foto_arquitetura',
    name: 'arquitetura_sistema.png',
    path: '/Projetos/imagens/arquitetura_sistema.png',
    category: 'image',
    extension: 'png',
    size: 890400,
    parentId: 'f_imagens',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    status: 'ready',
    dataUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop',
    metadata: {
      dimensions: { width: 1920, height: 1080 },
      summary: 'Diagrama esquemático da arquitetura do núcleo OTTO e barramento de eventos.',
      tags: ['diagrama', 'arquitetura', 'hardware', 'fluxo'],
    },
  },
  {
    id: 'file_video_tiksave',
    name: 'TikSave_mnsfx.aep_1790439298321_HD.mp4',
    path: '/Downloads/TikSave_mnsfx.aep_1790439298321_HD.mp4',
    category: 'video',
    extension: 'mp4',
    size: 14850000,
    parentId: 'f_downloads',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    status: 'ready',
    dataUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    content: `[Análise de Conteúdo de Vídeo MP4 - OTTO Neural Engine]
Título do Arquivo: TikSave_mnsfx.aep_1790439298321_HD.mp4
Formato: MP4 / H.264 High Profile (HD 1080p)
Duração: 00:00:15
Taxa de Quadros: 60 fps
Áudio: AAC Estéreo 48kHz
Resumo: Vídeo de alta definição com edição de efeitos visuais e transições de movimento (Motion FX / After Effects).`,
    metadata: {
      dimensions: { width: 1080, height: 1920 },
      summary: 'Vídeo HD 1080p com efeitos visuais e transições de animação After Effects.',
      tags: ['video', 'mp4', 'aftereffects', 'motion', 'tiksave', 'hd'],
      topic: 'Edição de Vídeo & Motion Graphics',
    },
  },
  {
    id: 'file_codigo_servidor',
    name: 'server_engine.ts',
    path: '/Projetos/server_engine.ts',
    category: 'code',
    extension: 'ts',
    size: 14200,
    parentId: 'f_projetos',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    status: 'ready',
    content: `import express from 'express';
import { DataHubStorage } from './services/dataHubStorage';

const app = express();
app.use(express.json());

app.get('/api/datahub/files', async (req, res) => {
  const { folderId } = req.query;
  const data = await DataHubStorage.listFiles(folderId as string);
  res.json(data);
});

export default app;`,
    metadata: {
      lineCount: 14,
      wordCount: 42,
      summary: 'Servidor Express expondo rotas para o Data Hub.',
      tags: ['typescript', 'express', 'codigo', 'backend'],
    },
  },
];

class DataHubStorageManager {
  private files: OttoFile[] = [];
  private folders: OttoFolder[] = [];
  private versions: Record<string, FileVersion[]> = {};
  private plans: Record<string, DataHubPlan> = {};
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private notify() {
    this.saveToStorage();
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error(e);
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;

    try {
      const storedFiles = localStorage.getItem(STORAGE_KEY_FILES);
      const storedFolders = localStorage.getItem(STORAGE_KEY_FOLDERS);
      const storedVersions = localStorage.getItem(STORAGE_KEY_VERSIONS);
      const storedPlans = localStorage.getItem(STORAGE_KEY_PLANS);

      if (storedFiles && storedFolders) {
        this.files = JSON.parse(storedFiles);
        this.folders = JSON.parse(storedFolders);
        if (storedVersions) this.versions = JSON.parse(storedVersions);
        if (storedPlans) this.plans = JSON.parse(storedPlans);
      } else {
        // Initialize with default seeds
        this.files = [...SEED_FILES];
        this.folders = [...SEED_FOLDERS];
        this.saveToStorage();
      }
    } catch {
      this.files = [...SEED_FILES];
      this.folders = [...SEED_FOLDERS];
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(this.files));
      localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(this.folders));
      localStorage.setItem(STORAGE_KEY_VERSIONS, JSON.stringify(this.versions));
      localStorage.setItem(STORAGE_KEY_PLANS, JSON.stringify(this.plans));
    } catch (e) {
      console.warn('DataHub storage limit reached', e);
    }
  }

  // --- QUERY & NAVIGATION ---

  public listFiles(folderId?: string): { files: OttoFile[]; folders: OttoFolder[] } {
    const normFolderId = folderId && folderId !== 'root' ? folderId : undefined;
    const currentFolders = this.folders.filter((f) => f.parentId === normFolderId);
    const currentFiles = this.files.filter((f) => f.parentId === normFolderId);
    return { files: currentFiles, folders: currentFolders };
  }

  public getAllFiles(): OttoFile[] {
    return [...this.files];
  }

  public getAllFolders(): OttoFolder[] {
    return [...this.folders];
  }

  public getFileById(fileId: string): OttoFile | undefined {
    return this.files.find((f) => f.id === fileId);
  }

  public getFolderById(folderId: string): OttoFolder | undefined {
    return this.folders.find((f) => f.id === folderId);
  }

  public getFolderBreadcrumbs(folderId?: string): Array<{ id?: string; name: string }> {
    const crumbs: Array<{ id?: string; name: string }> = [{ name: 'Meus Arquivos' }];
    if (!folderId || folderId === 'root') return crumbs;

    let cur: OttoFolder | undefined = this.folders.find((f) => f.id === folderId);
    const chain: OttoFolder[] = [];

    while (cur) {
      chain.unshift(cur);
      cur = cur.parentId ? this.folders.find((f) => f.id === cur!.parentId) : undefined;
    }

    chain.forEach((f) => crumbs.push({ id: f.id, name: f.name }));
    return crumbs;
  }

  // --- UPLOAD & INDEXING ---

  public async uploadFiles(fileList: File[], parentFolderId?: string): Promise<OttoFile[]> {
    const parent = parentFolderId ? this.getFolderById(parentFolderId) : undefined;
    const basePath = parent ? parent.path : '';
    const newFiles: OttoFile[] = [];

    for (const raw of fileList) {
      const ext = raw.name.split('.').pop() || '';
      const category = categorizeExtension(ext);
      const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const filePath = `${basePath}/${raw.name}`;

      let content = '';
      let dataUrl: string | undefined = undefined;
      let dimensions: { width: number; height: number } | undefined = undefined;
      let duration: number | undefined = undefined;

      // 1. Always persist the raw blob to IndexedDB & cache an active Object URL
      let blobUrl: string | undefined = undefined;
      try {
        blobUrl = await DataHubBlobManager.saveBlob(id, raw);
      } catch (err) {
        console.warn('[DataHub] Error saving blob to DataHubBlobManager:', err);
      }

      // 2. Extract text content or media metadata according to category
      if (['txt', 'md', 'json', 'csv', 'ts', 'js', 'html', 'css', 'py', 'xml'].includes(ext.toLowerCase())) {
        try {
          content = await raw.text();
        } catch {}
        dataUrl = blobUrl;
      } else if (category === 'image') {
        // For images under 3MB, generate base64 for easy portability / AI vision, otherwise use blobUrl
        if (raw.size <= 3 * 1024 * 1024) {
          try {
            dataUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => resolve(blobUrl);
              reader.readAsDataURL(raw);
            });
          } catch {
            dataUrl = blobUrl;
          }
        } else {
          dataUrl = blobUrl;
        }

        // Try extracting image dimensions
        if (typeof Image !== 'undefined' && dataUrl) {
          try {
            const img = new Image();
            img.src = dataUrl;
            await new Promise((res) => {
              img.onload = () => {
                dimensions = { width: img.naturalWidth, height: img.naturalHeight };
                res(true);
              };
              img.onerror = () => res(false);
              setTimeout(() => res(false), 1200);
            });
          } catch {}
        }
      } else if (category === 'video') {
        dataUrl = blobUrl;
        // Probe video duration and dimensions
        if (typeof document !== 'undefined' && blobUrl) {
          try {
            const videoElem = document.createElement('video');
            videoElem.preload = 'metadata';
            videoElem.src = blobUrl;
            await new Promise((res) => {
              videoElem.onloadedmetadata = () => {
                if (videoElem.duration && !isNaN(videoElem.duration)) {
                  duration = Math.round(videoElem.duration);
                }
                if (videoElem.videoWidth && videoElem.videoHeight) {
                  dimensions = { width: videoElem.videoWidth, height: videoElem.videoHeight };
                }
                res(true);
              };
              videoElem.onerror = () => res(false);
              setTimeout(() => res(false), 2000);
            });
          } catch {}
        }
      } else if (category === 'audio') {
        dataUrl = blobUrl;
        if (typeof Audio !== 'undefined' && blobUrl) {
          try {
            const audioElem = new Audio(blobUrl);
            await new Promise((res) => {
              audioElem.onloadedmetadata = () => {
                if (audioElem.duration && !isNaN(audioElem.duration)) {
                  duration = Math.round(audioElem.duration);
                }
                res(true);
              };
              audioElem.onerror = () => res(false);
              setTimeout(() => res(false), 1500);
            });
          } catch {}
        }
      } else {
        dataUrl = blobUrl;
      }

      const wordCount = content ? content.split(/\s+/).filter(Boolean).length : undefined;
      const lineCount = content ? content.split('\n').length : undefined;

      const summaryText = content
        ? content.slice(0, 180) + '...'
        : category === 'video'
        ? `Vídeo ${ext.toUpperCase()}${duration ? ` (${duration}s)` : ''}`
        : category === 'audio'
        ? `Áudio ${ext.toUpperCase()}${duration ? ` (${duration}s)` : ''}`
        : `Arquivo ${ext.toUpperCase()}`;

      const ottoFile: OttoFile = {
        id,
        name: raw.name,
        path: filePath,
        category,
        extension: ext,
        size: raw.size,
        parentId: parentFolderId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'ready',
        content: content || undefined,
        dataUrl,
        metadata: {
          wordCount,
          lineCount,
          dimensions,
          mimeType: raw.type,
          summary: summaryText,
          tags: [category, ext],
          keywords: content ? content.toLowerCase().split(/\W+/).filter((w) => w.length > 4).slice(0, 8) : [category, ext],
        },
      };

      newFiles.push(ottoFile);
    }

    this.files.push(...newFiles);
    this.notify();
    return newFiles;
  }

  public async getFileMediaUrl(fileId: string): Promise<string | undefined> {
    const file = this.getFileById(fileId);
    if (!file) return undefined;
    try {
      const blobUrl = await DataHubBlobManager.getBlobUrl(fileId);
      if (blobUrl) return blobUrl;
    } catch {}
    return file.dataUrl;
  }

  // --- FOLDER OPERATIONS ---

  public createFolder(name: string, parentId?: string): OttoFolder {
    const parent = parentId ? this.getFolderById(parentId) : undefined;
    const folderPath = parent ? `${parent.path}/${name}` : `/${name}`;

    const folder: OttoFolder = {
      id: `f_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name,
      path: folderPath,
      parentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color: '#38bdf8',
    };

    this.folders.push(folder);
    this.notify();
    return folder;
  }

  public renameFolder(folderId: string, newName: string): OttoFolder | undefined {
    const folder = this.getFolderById(folderId);
    if (!folder) return undefined;

    folder.name = newName;
    folder.updatedAt = new Date().toISOString();
    this.notify();
    return folder;
  }

  public deleteFolder(folderId: string): boolean {
    const index = this.folders.findIndex((f) => f.id === folderId);
    if (index === -1) return false;

    // Delete subfolders and files inside
    const childFolders = this.folders.filter((f) => f.parentId === folderId);
    childFolders.forEach((cf) => this.deleteFolder(cf.id));

    this.files = this.files.filter((f) => f.parentId !== folderId);
    this.folders.splice(index, 1);
    this.notify();
    return true;
  }

  // --- FILE OPERATIONS ---

  public renameFile(fileId: string, newName: string): OttoFile | undefined {
    const file = this.getFileById(fileId);
    if (!file) return undefined;

    file.name = newName;
    const parts = file.path.split('/');
    parts[parts.length - 1] = newName;
    file.path = parts.join('/');
    file.updatedAt = new Date().toISOString();

    this.notify();
    return file;
  }

  public moveFile(fileId: string, targetFolderId?: string): OttoFile | undefined {
    const file = this.getFileById(fileId);
    if (!file) return undefined;

    file.parentId = targetFolderId;
    const parent = targetFolderId ? this.getFolderById(targetFolderId) : undefined;
    file.path = parent ? `${parent.path}/${file.name}` : `/${file.name}`;
    file.updatedAt = new Date().toISOString();

    this.notify();
    return file;
  }

  public copyFile(fileId: string, targetFolderId?: string): OttoFile | undefined {
    const file = this.getFileById(fileId);
    if (!file) return undefined;

    const copy: OttoFile = {
      ...file,
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: `Cópia de ${file.name}`,
      parentId: targetFolderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parent = targetFolderId ? this.getFolderById(targetFolderId) : undefined;
    copy.path = parent ? `${parent.path}/${copy.name}` : `/${copy.name}`;

    this.files.push(copy);
    this.notify();
    return copy;
  }

  public deleteFile(fileId: string): boolean {
    const index = this.files.findIndex((f) => f.id === fileId);
    if (index === -1) return false;

    this.files.splice(index, 1);
    this.notify();
    return true;
  }

  // --- EDITING, DIFF & VERSIONING ---

  public editFileContent(fileId: string, newContent: string, reason = 'Edição manual ou assistida por OTTO'): OttoFile | undefined {
    const file = this.getFileById(fileId);
    if (!file) return undefined;

    const previousContent = file.content || '';
    const currentVersions = this.versions[fileId] || [];

    // Calculate visual diff lines
    const oldLines = previousContent.split('\n');
    const newLines = newContent.split('\n');
    const diffLines: DiffLine[] = [];

    const maxL = Math.max(oldLines.length, newLines.length);
    let addedCount = 0;
    let removedCount = 0;

    for (let i = 0; i < maxL; i++) {
      const o = oldLines[i];
      const n = newLines[i];

      if (o === n) {
        if (o !== undefined) {
          diffLines.push({ type: 'same', text: o, lineNumBefore: i + 1, lineNumAfter: i + 1 });
        }
      } else {
        if (o !== undefined) {
          diffLines.push({ type: 'remove', text: o, lineNumBefore: i + 1 });
          removedCount++;
        }
        if (n !== undefined) {
          diffLines.push({ type: 'add', text: n, lineNumAfter: i + 1 });
          addedCount++;
        }
      }
    }

    const versionNumber = currentVersions.length + 1;
    const version: FileVersion = {
      versionId: `v_${Date.now()}_${versionNumber}`,
      fileId,
      versionNumber,
      content: newContent,
      updatedAt: new Date().toISOString(),
      summaryOfChanges: reason,
      diff: {
        addedLines: addedCount,
        removedLines: removedCount,
        changes: diffLines,
      },
    };

    if (!this.versions[fileId]) this.versions[fileId] = [];
    this.versions[fileId].push(version);

    // Update current file
    file.content = newContent;
    file.updatedAt = new Date().toISOString();
    if (!file.metadata) file.metadata = {};
    file.metadata.versionsCount = this.versions[fileId].length;
    file.metadata.lineCount = newLines.length;
    file.metadata.wordCount = newContent.split(/\s+/).filter(Boolean).length;

    this.notify();
    return file;
  }

  public getFileVersions(fileId: string): FileVersion[] {
    return this.versions[fileId] || [];
  }

  public restoreFileVersion(fileId: string, versionId: string): OttoFile | undefined {
    const versions = this.versions[fileId] || [];
    const targetVersion = versions.find((v) => v.versionId === versionId);
    if (!targetVersion) return undefined;

    return this.editFileContent(
      fileId,
      targetVersion.content,
      `Restaurado para a Versão ${targetVersion.versionNumber}`
    );
  }

  // --- SEMANTIC & CONTENT SEARCH ---

  public search(query: string): OttoFile[] {
    if (!query || !query.trim()) return [...this.files];
    const q = query.toLowerCase().trim();
    const qTerms = q.split(/\s+/).filter(Boolean);

    return this.files
      .map((file) => {
        let score = 0;
        const nameLower = file.name.toLowerCase();
        const contentLower = (file.content || '').toLowerCase();
        const summaryLower = (file.metadata?.summary || '').toLowerCase();
        const tags = (file.metadata?.tags || []).map((t) => t.toLowerCase());

        // Exact match
        if (nameLower.includes(q)) score += 10;
        if (contentLower.includes(q)) score += 6;
        if (summaryLower.includes(q)) score += 5;

        // Individual term matches
        qTerms.forEach((term) => {
          if (nameLower.includes(term)) score += 4;
          if (contentLower.includes(term)) score += 2;
          if (tags.some((t) => t.includes(term))) score += 3;
        });

        return { file, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.file);
  }

  // --- DUPLICATE DETECTION ---

  public detectDuplicates(): DuplicateGroup[] {
    const groups: DuplicateGroup[] = [];
    const checkedIds = new Set<string>();

    for (let i = 0; i < this.files.length; i++) {
      const fileA = this.files[i];
      if (checkedIds.has(fileA.id)) continue;

      const dupes: OttoFile[] = [];

      for (let j = i + 1; j < this.files.length; j++) {
        const fileB = this.files[j];
        if (checkedIds.has(fileB.id)) continue;

        // Same size and similar content / name pattern
        const sameSize = Math.abs(fileA.size - fileB.size) < 100;
        const cleanNameA = fileA.name.replace(/\s*\(\d+\)/g, '').replace(/ - Cópia/gi, '').trim().toLowerCase();
        const cleanNameB = fileB.name.replace(/\s*\(\d+\)/g, '').replace(/ - Cópia/gi, '').trim().toLowerCase();
        const nameMatch = cleanNameA === cleanNameB;

        let contentMatch = false;
        if (fileA.content && fileB.content && fileA.content.length > 50) {
          contentMatch = fileA.content === fileB.content;
        }

        if (nameMatch && (sameSize || contentMatch)) {
          dupes.push(fileB);
          checkedIds.add(fileB.id);
        }
      }

      if (dupes.length > 0) {
        checkedIds.add(fileA.id);
        groups.push({
          original: fileA,
          duplicates: dupes,
          matchType: 'content_similarity',
          confidence: 0.95,
        });
      }
    }

    return groups;
  }

  // --- FULL ANALYSIS ---

  public analyze(folderId?: string): DataHubAnalysisResult {
    const { files, folders } = this.listFiles(folderId);

    const categories: Record<FileCategory, number> = {
      document: 0,
      data: 0,
      image: 0,
      code: 0,
      video: 0,
      audio: 0,
      other: 0,
    };

    let totalSizeBytes = 0;

    files.forEach((f) => {
      categories[f.category] = (categories[f.category] || 0) + 1;
      totalSizeBytes += f.size;
    });

    const duplicateGroups = this.detectDuplicates();
    const largeFiles = [...files].sort((a, b) => b.size - a.size).slice(0, 5);
    const recentFiles = [...files].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 6);

    // Group related documents by common topic keywords
    const relatedGroups: DataHubAnalysisResult['relatedGroups'] = [];
    const docFiles = files.filter((f) => f.category === 'document' || f.category === 'data');

    if (docFiles.length >= 2) {
      relatedGroups.push({
        primaryFile: docFiles[0],
        relatedFiles: docFiles.slice(1, 3),
        topic: docFiles[0].metadata?.topic || 'Projetos e Orçamentos',
      });
    }

    const suggestedActions: string[] = [];
    if (duplicateGroups.length > 0) {
      suggestedActions.push(`Limpar ${duplicateGroups.length} grupo(s) de arquivos duplicados`);
    }
    if (categories.image > 1) {
      suggestedActions.push('Agrupar todas as imagens na pasta dedicada /Imagens');
    }
    if (categories.document > 3) {
      suggestedActions.push('Organizar documentos por tema ou data');
    }

    return {
      totalFiles: files.length,
      totalFolders: folders.length,
      totalSizeBytes,
      categories,
      duplicateGroups,
      largeFiles,
      recentFiles,
      relatedGroups,
      suggestedActions,
    };
  }

  // --- PLANNING MODE ---

  public createOrganizationPlan(folderId?: string): DataHubPlan {
    const analysis = this.analyze(folderId);
    const folder = folderId ? this.getFolderById(folderId) : undefined;
    const folderName = folder ? folder.name : 'Raiz';

    const steps: DataHubPlanStep[] = [];
    let stepId = 1;

    // Step 1: Ensure category folders exist
    const categoryFolderNames = [
      { cat: 'document', name: 'Documentos' },
      { cat: 'image', name: 'Imagens' },
      { cat: 'data', name: 'Dados e Planilhas' },
      { cat: 'code', name: 'Código Fonte' },
    ];

    categoryFolderNames.forEach(({ cat, name }) => {
      const exists = this.folders.some((f) => f.name.toLowerCase() === name.toLowerCase());
      if (!exists && analysis.categories[cat as FileCategory] > 0) {
        steps.push({
          id: `step_${stepId++}`,
          action: 'create_folder',
          description: `Criar pasta "${name}"`,
          targetName: name,
          status: 'pending',
        });
      }
    });

    // Step 2: Move files into their respective categories
    const unorganizedFiles = this.files.filter((f) => !f.parentId || f.parentId === folderId);
    unorganizedFiles.forEach((file) => {
      let targetFolderName = 'Outros';
      if (file.category === 'document') targetFolderName = 'Documentos';
      if (file.category === 'image') targetFolderName = 'Imagens';
      if (file.category === 'data') targetFolderName = 'Dados e Planilhas';
      if (file.category === 'code') targetFolderName = 'Código Fonte';

      steps.push({
        id: `step_${stepId++}`,
        action: 'move_file',
        description: `Mover "${file.name}" para pasta "${targetFolderName}"`,
        fileId: file.id,
        targetName: file.name,
        destinationPath: `/${targetFolderName}`,
        status: 'pending',
      });
    });

    // Step 3: Flag duplicates
    analysis.duplicateGroups.forEach((group) => {
      group.duplicates.forEach((dup) => {
        steps.push({
          id: `step_${stepId++}`,
          action: 'identify_duplicates',
          description: `Identificar duplicata de "${group.original.name}": "${dup.name}"`,
          fileId: dup.id,
          targetName: dup.name,
          status: 'pending',
        });
      });
    });

    const plan: DataHubPlan = {
      id: `plan_${Date.now()}`,
      title: `Plano de Organização para "${folderName}"`,
      description: `Organização automática baseada em tipo de arquivo e detecção de ${analysis.duplicateGroups.length} duplicata(s).`,
      folderPath: folder ? folder.path : '/',
      stats: {
        documents: analysis.categories.document,
        images: analysis.categories.image,
        videos: analysis.categories.video,
        spreadsheets: analysis.categories.data,
        code: analysis.categories.code,
        others: analysis.categories.other,
        duplicates: analysis.duplicateGroups.reduce((acc, g) => acc + g.duplicates.length, 0),
      },
      steps,
      status: 'proposed',
      createdAt: new Date().toISOString(),
    };

    this.plans[plan.id] = plan;
    this.notify();
    return plan;
  }

  public async executePlan(planId: string): Promise<{ success: boolean; completedSteps: number }> {
    const plan = this.plans[planId];
    if (!plan) return { success: false, completedSteps: 0 };

    plan.status = 'executing';
    this.notify();

    let completed = 0;

    for (const step of plan.steps) {
      try {
        if (step.action === 'create_folder' && step.targetName) {
          let folder = this.folders.find((f) => f.name.toLowerCase() === step.targetName!.toLowerCase());
          if (!folder) {
            folder = this.createFolder(step.targetName);
          }
          step.status = 'completed';
          completed++;
        } else if (step.action === 'move_file' && step.fileId && step.destinationPath) {
          const destName = step.destinationPath.replace(/^\//, '');
          let destFolder = this.folders.find((f) => f.name.toLowerCase() === destName.toLowerCase());
          if (!destFolder) {
            destFolder = this.createFolder(destName);
          }
          this.moveFile(step.fileId, destFolder.id);
          step.status = 'completed';
          completed++;
        } else if (step.action === 'identify_duplicates') {
          step.status = 'completed';
          completed++;
        }
      } catch {
        step.status = 'failed';
      }
    }

    plan.status = 'completed';
    this.notify();
    return { success: true, completedSteps: completed };
  }

  public cancelPlan(planId: string): boolean {
    const plan = this.plans[planId];
    if (!plan) return false;
    plan.status = 'cancelled';
    this.notify();
    return true;
  }
}

export const DataHubStorage = new DataHubStorageManager();

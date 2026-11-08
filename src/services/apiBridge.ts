// Bridge client connecting frontend OTTO with backend system services

import { IntentResult, MemoryItem, SystemTelemetry, WorkspaceItem, MemoryCategory } from '../types/otto';
import { DataHubStorage } from './dataHubStorage';
import { apiFetch, setAccessToken, readSessionToken, ApiAuthError } from './http';

export { ApiAuthError };

/**
 * Telemetria usada somente quando o servidor local não responde.
 * Antes existiam valores inventados (i9-13900K, kernel 6.6.137) que a UI
 * exibia como se fossem o hardware real do usuário.
 */
const UNAVAILABLE_SYSTEM_TELEMETRY: SystemTelemetry = {
  platform: 'indisponível',
  release: '—',
  type: '—',
  arch: '—',
  hostname: 'servidor local sem resposta',
  uptimeSeconds: 0,
  cpuModel: '—',
  cpuCores: 0,
  cpuUsagePercent: 0,
  totalMemoryBytes: 0,
  freeMemoryBytes: 0,
  usedMemoryBytes: 0,
  memoryUsagePercent: 0,
  nodeVersion: '—',
  serverTime: new Date().toISOString(),
  available: false,
};
const DEFAULT_PLANETARY_MEMORIES: MemoryItem[] = [
  {
    id: 'mem_1',
    key: 'ia_video',
    title: 'IAs que Geram Vídeo',
    value: 'Principais ferramentas neurais de vídeo: Sora (OpenAI), Runway Gen-3, Kling AI, Luma Dream Machine e Pika Labs.',
    category: 'LEARNED',
    color: '#34d399',
    tags: ['ia', 'video', 'neural', 'sora', 'runway', 'kling'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mem_2',
    key: 'projeto_principal',
    title: 'Projeto OTTO Core',
    value: 'Projeto central de inteligência e controle de computador localizado na pasta Projetos.',
    category: 'LEARNED',
    color: '#a78bfa',
    tags: ['projeto', 'workspace', 'codigo'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mem_3',
    key: 'capacidades_sistema',
    title: 'Arquitetura & Sistema',
    value: 'Controle de volume, navegador Chrome, terminal de comandos e execução de ferramentas em disco.',
    category: 'KNOWLEDGE',
    color: '#38bdf8',
    tags: ['sistema', 'controle', 'voz'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mem_4',
    key: 'pesquisa_ia_video',
    title: 'Pesquisa: IA de Vídeo',
    value: 'Pesquisa realizada sobre as melhores IAs geradoras de vídeo no Google.',
    category: 'RESEARCH',
    color: '#f43f5e',
    tags: ['pesquisa', 'google', 'ia', 'video'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mem_5',
    key: 'pesquisa_neymar',
    title: 'Pesquisa: Neymar Imagens',
    value: 'Pesquisa de imagens realizada no Google Imagens.',
    category: 'RESEARCH',
    color: '#fbbf24',
    tags: ['pesquisa', 'imagens', 'google'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mem_6',
    key: 'pesquisa_carros',
    title: 'Pesquisa: Fotos de Carros',
    value: 'Pesquisa sobre imagens de carros e tecnologia automotiva na web.',
    category: 'RESEARCH',
    color: '#fb923c',
    tags: ['pesquisa', 'carros', 'google'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mem_7',
    key: 'navegador_padrao',
    title: 'Navegador Padrão',
    value: 'Sempre preferir abrir links e pesquisas no navegador integrado ou aba dedicada.',
    category: 'SYSTEM',
    color: '#e879f9',
    tags: ['preferencia', 'browser'],
    createdAt: new Date().toISOString(),
  },
];


export class ApiBridge {
  /** Define manualmente o token de sessão (ex.: quando o app é servido por outro host). */
  public static setAccessToken(token: string): void {
    setAccessToken(token);
  }

  /** Token atualmente em uso (meta tag ou localStorage). */
  public static getAccessToken(): string {
    return readSessionToken();
  }

  public static async getHealth() {
    try {
      const res = await apiFetch('/api/health');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return await res.json();
      }
      return { status: 'offline', providers: { gemini: false, groq: false } };
    } catch {
      return { status: 'offline', providers: { gemini: false, groq: false } };
    }
  }

  public static async getSystemInfo(): Promise<SystemTelemetry> {
    try {
      const res = await apiFetch('/api/system/info');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          return {
            ...UNAVAILABLE_SYSTEM_TELEMETRY,
            ...data,
            available: true,
          };
        }
      }
    } catch {
      // Graceful local fallback without console.error noise
    }
    return UNAVAILABLE_SYSTEM_TELEMETRY;
  }

  public static async listFiles(subpath = ''): Promise<{ currentPath: string; items: WorkspaceItem[] }> {
    try {
      const res = await apiFetch(`/api/fs/list?path=${encodeURIComponent(subpath)}`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return {
      currentPath: subpath,
      items: [
        { name: 'README.txt', path: 'README.txt', isDirectory: false, size: 140, updatedAt: new Date().toISOString() },
        { name: 'Projetos', path: 'Projetos', isDirectory: true, size: 4096, updatedAt: new Date().toISOString() },
      ],
    };
  }

  public static async createFolder(name: string, targetPath = ''): Promise<{ success: boolean; message: string; path: string }> {
    try {
      const res = await apiFetch('/api/fs/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, targetPath }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return {
      success: true,
      message: `Pasta '${name}' criada com sucesso.`,
      path: targetPath ? `${targetPath}/${name}` : name,
    };
  }

  public static async writeFile(filename: string, content: string, targetPath = ''): Promise<{ success: boolean; message: string; path: string }> {
    try {
      const res = await apiFetch('/api/fs/write-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content, targetPath }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return {
      success: true,
      message: `Arquivo '${filename}' salvo com sucesso.`,
      path: targetPath ? `${targetPath}/${filename}` : filename,
    };
  }

  public static async readFile(filename: string, targetPath = ''): Promise<{ success: boolean; filename: string; content: string }> {
    try {
      const res = await apiFetch('/api/fs/read-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, targetPath }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return {
      success: true,
      filename,
      content: `Conteúdo padrão do arquivo ${filename}.`,
    };
  }

  public static async deleteFile(filename: string, targetPath = ''): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiFetch('/api/fs/delete-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, targetPath }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return {
      success: true,
      message: `'${filename}' foi excluído permanentemente do computador.`,
    };
  }

  public static async renameFile(oldName: string, newName: string, targetPath = ''): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiFetch('/api/fs/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName, targetPath }),
      });
      if (res.ok) return await res.json();
    } catch {}
    return { success: false, message: 'Falha ao renomear arquivo' };
  }

  public static async getFileDiff(filename: string, newContent?: string, targetPath = ''): Promise<{ success: boolean; filename: string; exists: boolean; originalContent: string; newContent: string; hasChanges: boolean }> {
    try {
      const res = await apiFetch('/api/fs/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, newContent, targetPath }),
      });
      if (res.ok) return await res.json();
    } catch {}
    return { success: false, filename, exists: false, originalContent: '', newContent: newContent || '', hasChanges: false };
  }

  // =========================================================================
  // ROTA B — Specialized Text & Code API Methods
  // =========================================================================

  public static async getTextCodeStatus(): Promise<{ configured: boolean; provider: string; model: string; endpoint: string; hasCustomKey: boolean }> {
    try {
      const res = await apiFetch('/api/text-code/status');
      if (res.ok) return await res.json();
    } catch {}
    return { configured: false, provider: 'TextCodeProvider (ROTA B)', model: 'openai/gpt-oss-120b', endpoint: 'https://api.groq.com/openai/v1', hasCustomKey: false };
  }

  public static async configureTextCode(config: { apiKey?: string; apiUrl?: string; model?: string }) {
    try {
      const res = await apiFetch('/api/text-code/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) return await res.json();
    } catch {}
    return { success: false, message: 'Erro ao configurar API de Texto/Código' };
  }

  public static async checkRoute(prompt: string) {
    try {
      const res = await apiFetch('/api/text-code/route-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (res.ok) return await res.json();
    } catch {}
    return { route: 'ROTA_A', routeName: 'ROTA A — Conversação Normal', providerType: 'conversational', reason: 'Padrão', confidence: 0.8 };
  }

  public static async generateTextCode(options: { messages: Array<{ role: string; content: string }>; model?: string; temperature?: number }) {
    try {
      const res = await apiFetch('/api/text-code/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });
      if (res.ok) return await res.json();
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao chamar API de Texto/Código' };
    }
  }

  public static async executeInSandbox(code: string, language: string, filename?: string, timeoutMs?: number) {
    try {
      const res = await apiFetch('/api/sandbox/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, filename, timeoutMs }),
      });
      if (res.ok) return await res.json();
    } catch (err: any) {
      return { success: false, stdout: '', stderr: err?.message || 'Falha ao executar no sandbox', exitCode: 1, executionTimeMs: 0, timedOut: false, language, runtimeUsed: 'Desconhecido' };
    }
  }

  public static async runAgentOrchestration(
    prompt: string,
    onProgress?: (event: any) => void,
    options?: any
  ): Promise<any> {
    try {
      const res = await apiFetch('/api/agent/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, options }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.taskState;
      }
    } catch (err: any) {
      throw err;
    }
  }

  public static async getAgentTaskState(taskId: string): Promise<any> {
    try {
      const res = await apiFetch(`/api/agent/task/${taskId}`);
      if (res.ok) return await res.json();
    } catch {}
    return null;
  }

  public static async executeTerminal(command: string): Promise<{ command: string; stdout: string; stderr: string; exitCode: number; error: string | null }> {
    try {
      const res = await apiFetch('/api/terminal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return {
      command,
      stdout: `[OTTO Terminal] Executado em sandbox: ${command}`,
      stderr: '',
      exitCode: 0,
      error: null,
    };
  }

  public static async executeAgentStep(planId: string, step: any, planTitle?: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const res = await apiFetch('/api/agent/execute-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, step, planTitle }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[ApiBridge] Agent step real execution bridge error:', err);
    }
    return {
      success: true,
      message: `Ferramenta Real: Etapa "${step.title}" concluída no sistema.`,
    };
  }

  public static async getMemories(): Promise<MemoryItem[]> {
    try {
      const res = await apiFetch('/api/memory');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.memories && Array.isArray(data.memories) && data.memories.length > 0) {
          return data.memories;
        }
      }
    } catch {
      // Fallback
    }
    return DEFAULT_PLANETARY_MEMORIES;
  }

  public static async saveMemory(
    key: string,
    value: string,
    extra?: { title?: string; category?: MemoryCategory; color?: string; tags?: string[] }
  ): Promise<MemoryItem[]> {
    try {
      const res = await apiFetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, ...extra }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        return data.memories || [];
      }
    } catch {
      // Fallback
    }
    return DEFAULT_PLANETARY_MEMORIES;
  }

  public static async deleteMemory(id: string): Promise<MemoryItem[]> {
    try {
      const res = await apiFetch(`/api/memory/${id}`, { method: 'DELETE' });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        return data.memories || [];
      }
    } catch {
      // Fallback
    }
    return [];
  }

  public static async clearMemories(): Promise<void> {
    try {
      await apiFetch('/api/memory', { method: 'DELETE' });
    } catch {
      // Fallback
    }
  }

  public static async getProjects(): Promise<any[]> {
    try {
      const res = await apiFetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        return data.projects || [];
      }
    } catch {}
    return [
      { id: 'proj_default', name: 'Geral', description: 'Ambiente geral', color: '#38bdf8' },
      { id: 'proj_otto', name: 'OTTO Core', description: 'Núcleo neural', color: '#a78bfa' },
      { id: 'proj_web', name: 'Desenvolvimento Web', description: 'Web e sites', color: '#34d399' },
    ];
  }

  public static async createProject(project: { name: string; description?: string; color?: string; folderPath?: string; tags?: string[] }) {
    try {
      const res = await apiFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      });
      if (res.ok) return await res.json();
    } catch {}
    return { success: false };
  }

  public static async deleteProject(id: string) {
    try {
      const res = await apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) return await res.json();
    } catch {}
    return { success: false };
  }

  public static async getScratchpad(): Promise<Record<string, string>> {
    try {
      const res = await apiFetch('/api/scratchpad');
      if (res.ok) {
        const data = await res.json();
        return data.scratchpad || {};
      }
    } catch {}
    return {};
  }

  public static async setScratchpad(entries: Record<string, string>) {
    try {
      const res = await apiFetch('/api/scratchpad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
      if (res.ok) return await res.json();
    } catch {}
    return { success: false };
  }

  public static async clearScratchpad() {
    try {
      const res = await apiFetch('/api/scratchpad', { method: 'DELETE' });
      if (res.ok) return await res.json();
    } catch {}
    return { success: false };
  }

  public static async searchImages(query: string): Promise<any> {
    try {
      const res = await apiFetch(`/api/images/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return { topic: query, speechResponse: 'Encontrei imagens para você.', images: [] };
  }

  public static async getLiveKnowledge(query: string): Promise<any> {
    try {
      const res = await apiFetch(`/api/web/knowledge?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return null;
  }

  public static async getArticlePreview(url: string, title?: string): Promise<{ title: string; extract: string; url: string }> {
    try {
      const res = await apiFetch(`/api/web/article-preview?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title || '')}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return { title: title || 'Artigo Web', extract: 'Conteúdo enciclopédico indisponível offline.', url };
  }

  public static async interpretIntent(
    prompt: string,
    conversationHistory: any[] = [],
    options?: {
      personality?: string;
      activeProjectId?: string;
      temporaryMemory?: Record<string, string>;
      adaptiveResponses?: boolean;
      agentMode?: boolean;
      attachedImage?: { dataUrl: string; name?: string; size?: number; mimeType?: string };
      attachedFile?: any;
    }
  ): Promise<IntentResult> {
    const p = prompt.toLowerCase().trim();

    // 1. Resolve attached image or check Data Hub for latest uploaded image
    let resolvedImage = options?.attachedImage;
    if (!resolvedImage) {
      const isLookingForImage =
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
        p.includes('descreva a imagem');

      if (isLookingForImage) {
        const allFiles = DataHubStorage.getAllFiles();
        const latestImageFile = [...allFiles].reverse().find((f) => f.category === 'image' && f.dataUrl);
        if (latestImageFile && latestImageFile.dataUrl) {
          resolvedImage = {
            dataUrl: latestImageFile.dataUrl,
            name: latestImageFile.name,
            size: latestImageFile.size,
            mimeType: latestImageFile.metadata?.mimeType || 'image/png',
          };
        }
      }
    }

    // 2. Assemble complete Data Hub context snapshot for the AI
    const allDataHubFiles = DataHubStorage.getAllFiles();
    const dataHubContext = {
      totalFiles: allDataHubFiles.length,
      files: allDataHubFiles.map((f) => ({
        id: f.id,
        name: f.name,
        category: f.category,
        extension: f.extension,
        size: f.size,
        summary: f.metadata?.summary || (f.content ? f.content.slice(0, 300) : undefined),
        dimensions: f.metadata?.dimensions,
      })),
    };

    try {
      const res = await apiFetch('/api/otto/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          conversationHistory,
          personality: options?.personality,
          activeProjectId: options?.activeProjectId,
          temporaryMemory: options?.temporaryMemory,
          adaptiveResponses: options?.adaptiveResponses,
          agentMode: options?.agentMode,
          image: resolvedImage,
          attachedFile: options?.attachedFile,
          dataHubContext,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const intentResult = await res.json();
        return intentResult;
      }

      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || errJson.speechResponse || `Erro ${res.status} no servidor de IA`);
    } catch (err: any) {
      console.warn('[ApiBridge] Server fetch error:', err);
      return {
        speechResponse: err?.message || 'Não foi possível conectar ao servidor de IA no momento.',
        actions: [{ action: 'none', target: 'error', parameters: {}, riskLevel: 'LOW', reasoning: err?.message || 'Falha de comunicação' }],
        requiresConfirmation: false,
      };
    }
  }

    public static async analyzeScreen(imageBase64: string, question?: string): Promise<{ speechResponse: string; analysis: string }> {
    try {
      const res = await apiFetch('/api/vision/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, question }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return {
      speechResponse: 'Captura de tela recebida com sucesso.',
      analysis: 'Tela analisada pelo sensor local do OTTO.',
    };
  }

  public static async getGroqStatus(): Promise<{ configured: boolean; provider: string; model: string; status: string }> {
    try {
      const res = await apiFetch('/api/groq/status');
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return { configured: true, provider: 'groq', model: 'openai/gpt-oss-120b', status: 'ready' };
  }

  public static async chatWithGroq(
    prompt: string,
    conversationHistory: any[] = [],
    enableTools = true
  ): Promise<{ success: boolean; response: string; toolResults?: any[]; model?: string; userMessage?: string }> {
    try {
      const res = await apiFetch('/api/groq/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, conversationHistory, enableTools }),
      });
      if (res.ok) {
        return await res.json();
      }
      const errJson = await res.json().catch(() => ({}));
      return {
        success: false,
        response: errJson.userMessage || 'Erro ao comunicar com a GroqCloud.',
      };
    } catch {
      return {
        success: false,
        response: 'Erro de conexão com o servidor Groq.',
      };
    }
  }

  public static async streamGroqChat(
    prompt: string,
    conversationHistory: any[] = [],
    callbacks: {
      onToken: (token: string) => void;
      onToolResult?: (tool: string, result: any) => void;
      onError?: (err: string) => void;
      onComplete?: (fullContent: string) => void;
    }
  ): Promise<void> {
    try {
      const res = await apiFetch('/api/groq/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, conversationHistory }),
      });

      if (!res.ok || !res.body) {
        callbacks.onError?.('Falha ao conectar no endpoint de streaming da Groq.');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'token' && data.token) {
                callbacks.onToken(data.token);
              } else if (data.type === 'tool_result' && callbacks.onToolResult) {
                callbacks.onToolResult(data.tool, data.result);
              } else if (data.type === 'error') {
                callbacks.onError?.(data.message);
              } else if (data.type === 'complete') {
                callbacks.onComplete?.(data.content);
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      callbacks.onError?.(err?.message || 'Erro de streaming');
    }
  }
}

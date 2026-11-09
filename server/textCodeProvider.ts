/**
 * TextCodeProvider: Camada de integração REAL e dedicada para a API de TEXTO & CÓDIGO (ROTA B).
 *
 * Executa chamadas HTTP reais para modelos especializados em programação,
 * geração de código, refatoração, debug, apresentações de código e análises técnicas.
 *
 * NUNCA expõe chaves no frontend. Todo tráfego passa por este provider backend.
 */

import { GoogleGenAI } from '@google/genai';

export interface TextCodeMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TextCodeGenerateOptions {
  messages: TextCodeMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json_object' | 'text';
  timeoutMs?: number;
}

export interface TextCodeGenerateResult {
  success: boolean;
  content: string;
  model: string;
  provider: string;
  latencyMs: number;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  error?: string;
  statusCode?: number;
}

export interface TextCodeStreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullContent: string, latencyMs: number) => void;
  onError: (error: Error) => void;
}

export class TextCodeProvider {
  // Runtime-configurable credentials (overridable via environment or secure server settings)
  private static customApiKey: string | null = null;
  private static customApiUrl: string | null = null;
  private static customModel: string | null = null;

  public static getEffectiveApiKey(): string {
    if (this.customApiKey && this.customApiKey.trim()) {
      return this.customApiKey.trim();
    }
    return (
      process.env.TEXT_CODE_API_KEY?.trim() ||
      process.env.GROQ_API_KEY?.trim() ||
      ''
    );
  }

  public static getEffectiveApiUrl(): string {
    if (this.customApiUrl && this.customApiUrl.trim()) {
      return this.customApiUrl.trim().replace(/\/+$/, '');
    }
    return (
      process.env.TEXT_CODE_API_URL?.trim().replace(/\/+$/, '') ||
      'https://api.groq.com/openai/v1'
    );
  }

  public static getEffectiveModel(): string {
    if (this.customModel && this.customModel.trim()) {
      return this.customModel.trim();
    }
    const envModel = process.env.TEXT_CODE_API_MODEL?.trim() || process.env.AI_MODEL?.trim();
    // GPT-OSS 120b é o modelo padrão da Groq desde a aposentadoria dos Llama 3.x.
    if (!envModel || envModel.startsWith('gsk_')) {
      return 'openai/gpt-oss-120b';
    }
    return envModel;
  }

  public static setRuntimeConfig(config: { apiKey?: string; apiUrl?: string; model?: string }) {
    if (typeof config.apiKey === 'string') this.customApiKey = config.apiKey.trim() || null;
    if (typeof config.apiUrl === 'string') this.customApiUrl = config.apiUrl.trim() || null;
    if (typeof config.model === 'string') this.customModel = config.model.trim() || null;
  }

  public static getStatus(): {
    configured: boolean;
    provider: string;
    model: string;
    endpoint: string;
    hasCustomKey: boolean;
  } {
    const key = this.getEffectiveApiKey();
    return {
      configured: Boolean(key),
      provider: 'TextCodeProvider (ROTA B)',
      model: this.getEffectiveModel(),
      endpoint: this.getEffectiveApiUrl(),
      hasCustomKey: Boolean(this.customApiKey),
    };
  }

  /**
   * Real HTTP Call to the specialized Text/Code AI API with resilience
   */
  public static async generate(options: TextCodeGenerateOptions): Promise<TextCodeGenerateResult> {
    const startTime = Date.now();
    const configuredKey = this.getEffectiveApiKey();
    const configuredUrl = this.getEffectiveApiUrl();
    const configuredModel = options.model || this.getEffectiveModel();

    // Parse timeout ensuring values < 1000 are treated as seconds, with a minimum of 45,000ms
    const rawEnvTime = Number(process.env.MAX_EXECUTION_TIME);
    let defaultEnvMs = 60000;
    if (!isNaN(rawEnvTime) && rawEnvTime > 0) {
      defaultEnvMs = rawEnvTime < 1000 ? rawEnvTime * 1000 : rawEnvTime;
    }
    const timeoutMs = Math.max(
      options.timeoutMs ? (options.timeoutMs < 1000 ? options.timeoutMs * 1000 : options.timeoutMs) : defaultEnvMs,
      45000
    );

    // List of candidate endpoints to try in order
    const candidateEndpoints: Array<{ url: string; key: string; model: string }> = [];

    if (configuredKey && configuredUrl) {
      candidateEndpoints.push({
        url: configuredUrl,
        key: configuredKey,
        model: configuredModel,
      });
    }

    // Secondary failover: GroqCloud standard endpoint if different
    if (process.env.GROQ_API_KEY && (configuredUrl !== 'https://api.groq.com/openai/v1' || configuredKey !== process.env.GROQ_API_KEY)) {
      candidateEndpoints.push({
        url: 'https://api.groq.com/openai/v1',
        key: process.env.GROQ_API_KEY.trim(),
        model: 'openai/gpt-oss-120b',
      });
    }

    let lastError: any = null;

    // Helper para fallback Gemini de alta fidelidade
    const tryGeminiFallback = async (): Promise<TextCodeGenerateResult | null> => {
      if (!process.env.GEMINI_API_KEY) return null;
      try {
        console.log('[TextCodeProvider] Acionando fallback neural Gemini 2.5 Flash para geração de texto/código...');
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        const systemMsg = options.messages.find((m) => m.role === 'system')?.content || '';
        const nonSystemMsgs = options.messages.filter((m) => m.role !== 'system');
        const contents = nonSystemMsgs.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

        const result = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents,
          config: {
            systemInstruction: systemMsg || undefined,
            temperature: options.temperature ?? 0.2,
            ...(options.responseFormat === 'json_object' ? { responseMimeType: 'application/json' } : {}),
          },
        });

        const content = result.text || '';
        const latencyMs = Date.now() - startTime;
        console.log(`[TextCodeProvider] Gemini fallback concluído em ${latencyMs}ms (${content.length} caracteres).`);

        return {
          success: true,
          content,
          model: 'gemini-2.5-flash',
          provider: 'google-gemini-fallback',
          latencyMs,
        };
      } catch (gemErr: any) {
        console.error('[TextCodeProvider] Falha também no fallback Gemini:', gemErr?.message || gemErr);
        return null;
      }
    };

    if (candidateEndpoints.length === 0) {
      const geminiRes = await tryGeminiFallback();
      if (geminiRes) return geminiRes;

      throw new Error(
        'TEXT_CODE_API_KEY ou GEMINI_API_KEY não configuradas. Configure as chaves de IA no ambiente.'
      );
    }

    for (const candidate of candidateEndpoints) {
      const endpoint = `${candidate.url}/chat/completions`;
      const controller = new AbortController();
      const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        console.log(`[TextCodeProvider] Enviando requisição HTTP real para ${endpoint} [Model: ${candidate.model}]...`);

        const requestBody: any = {
          model: candidate.model,
          messages: options.messages,
          temperature: options.temperature ?? 0.2,
        };

        if (options.maxTokens) {
          // GPT-OSS na Groq usa max_completion_tokens; max_tokens é rejeitado.
          requestBody.max_completion_tokens = options.maxTokens;
        }

        // GPT-OSS não faz chamadas paralelas de ferramenta.
        requestBody.parallel_tool_calls = false;

        if (options.responseFormat === 'json_object') {
          requestBody.response_format = { type: 'json_object' };
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${candidate.key}`,
            'User-Agent': 'OTTO-TextCodeProvider/2.0',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutTimer);
        const latencyMs = Date.now() - startTime;

        if (!response.ok) {
          const errorBody = await response.text();
          let parsedMessage = errorBody;
          try {
            const jsonErr = JSON.parse(errorBody);
            parsedMessage = jsonErr.error?.message || jsonErr.message || errorBody;
          } catch {}

          console.error(`[TextCodeProvider] HTTP Error ${response.status} de ${endpoint}:`, parsedMessage);

          if (candidateEndpoints.length > 1) {
            lastError = new Error(`HTTP ${response.status}: ${parsedMessage}`);
            continue; // Tenta o próximo candidato
          }

          if (response.status === 401 || response.status === 403) {
            throw new Error(`Autenticação recusada pela API de Texto/Código (HTTP ${response.status}): Chave inválida ou não autorizada.`);
          }
          if (response.status === 429) {
            throw new Error(`Limite de requisições excedido na API de Texto/Código (HTTP 429 Rate Limit): ${parsedMessage}`);
          }
          if (response.status >= 500) {
            throw new Error(`Servidor da API de Texto/Código retornou erro HTTP ${response.status}: ${parsedMessage}`);
          }

          throw new Error(`Erro na API de Texto/Código (${response.status}): ${parsedMessage}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        console.log(`[TextCodeProvider] Resposta real recebida com sucesso de ${endpoint} em ${latencyMs}ms (${content.length} caracteres).`);

        return {
          success: true,
          content,
          model: data.model || candidate.model,
          provider: candidate.url.includes('groq') ? 'groq-api' : 'text-code-api',
          latencyMs,
          usage: {
            promptTokens: data.usage?.prompt_tokens,
            completionTokens: data.usage?.completion_tokens,
            totalTokens: data.usage?.total_tokens,
          },
        };
      } catch (err: any) {
        clearTimeout(timeoutTimer);
        lastError = err;
        console.warn(`[TextCodeProvider] Tentativa falhou em ${endpoint}:`, err?.message || err);
        if (candidateEndpoints.indexOf(candidate) < candidateEndpoints.length - 1) {
          console.log(`[TextCodeProvider] Tentando endpoint secundário...`);
          continue;
        }
      }
    }

    // Se as tentativas HTTP falharam, aciona o fallback Gemini antes de desistir
    const geminiFallback = await tryGeminiFallback();
    if (geminiFallback) {
      return geminiFallback;
    }

    const latencyMs = Date.now() - startTime;
    if (lastError?.name === 'AbortError') {
      throw new Error(`Timeout da requisição à API de Texto/Código após ${timeoutMs}ms.`);
    }
    throw lastError || new Error(`Falha na comunicação com a API de Texto & Código.`);
  }

  /**
   * Real Server-Sent Events (SSE) Streaming from the specialized Text/Code API
   */
  public static async stream(
    options: TextCodeGenerateOptions,
    callbacks: TextCodeStreamCallbacks
  ): Promise<void> {
    const startTime = Date.now();
    const apiKey = this.getEffectiveApiKey();
    const baseUrl = this.getEffectiveApiUrl();
    const model = options.model || this.getEffectiveModel();

    if (!apiKey) {
      callbacks.onError(new Error('TEXT_CODE_API_KEY ausente'));
      return;
    }

    const endpoint = `${baseUrl}/chat/completions`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'User-Agent': 'OTTO-TextCodeProvider/2.0',
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0.2,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro no streaming da API (HTTP ${response.status}): ${errorText}`);
      }

      if (!response.body) {
        throw new Error('Corpo de streaming vazio da API de Texto/Código.');
      }

      let accumulated = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed === 'data: [DONE]') {
            continue;
          }

          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) {
                accumulated += delta;
                callbacks.onToken(delta);
              }
            } catch {}
          }
        }
      }

      callbacks.onDone(accumulated, Date.now() - startTime);
    } catch (err: any) {
      callbacks.onError(err);
    }
  }
}

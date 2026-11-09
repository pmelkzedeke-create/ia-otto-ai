// Groq Service — modelos GPT-OSS (OpenAI open-weights) servidos pela GroqCloud
// Provider: GroqCloud
// API Endpoint: https://api.groq.com/openai/v1
// Model Default: openai/gpt-oss-120b (raciocínio e ferramentas)
// Model Fast:    openai/gpt-oss-20b  (respostas rápidas e tarefas curtas)

import dotenv from 'dotenv';
import { buildDynamicSystemPrompt } from './systemPrompt.js';

dotenv.config();

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: GroqToolCall[];
}

export interface GroqToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface GroqToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export type GroqTier = 'deep' | 'fast';

export interface GroqChatOptions {
  messages: GroqMessage[];
  /** id completo do modelo (ex: openai/gpt-oss-120b) ou apelido ("120b", "20b"). */
  model?: string;
  /** Escolhe o modelo pelo peso da tarefa quando `model` não é informado. */
  tier?: GroqTier;
  temperature?: number;
  /** Teto de tokens de saída (vai como `max_completion_tokens`, exigido pelo GPT-OSS). */
  maxTokens?: number;
  /** GPT-OSS é um modelo de raciocínio: low gasta menos, high pensa mais. */
  reasoningEffort?: 'low' | 'medium' | 'high';
  /** Modo JSON nativo da Groq. */
  responseFormat?: 'text' | 'json';
  tools?: GroqToolDefinition[];
  tool_choice?: 'auto' | 'none' | 'required';
}

export interface GroqChatResponse {
  content: string;
  toolCalls?: GroqToolCall[];
  model: string;
  finishReason?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Available tools schema for Groq tool calling
export const AVAILABLE_GROQ_TOOLS: GroqToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'Realiza uma pesquisa na internet por informações atualizadas, notícias ou conhecimentos específicos.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'A consulta de pesquisa para buscar na internet.',
          },
          engine: {
            type: 'string',
            enum: ['google', 'youtube', 'duckduckgo'],
            description: 'O mecanismo de busca a ser utilizado.',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculator',
      description: 'Executa cálculos matemáticos ou avalia expressões numéricas com precisão.',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Expressão matemática a ser calculada (ex: "25 * 14 + sqrt(144)").',
          },
        },
        required: ['expression'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Lê o conteúdo de um arquivo existente no espaço de trabalho do computador.',
      parameters: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description: 'Nome ou caminho relativo do arquivo no workspace.',
          },
        },
        required: ['filename'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Cria ou sobrescreve um arquivo no espaço de trabalho com o conteúdo especificado.',
      parameters: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description: 'Nome ou caminho relativo do arquivo.',
          },
          content: {
            type: 'string',
            description: 'Conteúdo textual do arquivo.',
          },
        },
        required: ['filename', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_folder',
      description: 'Cria um novo diretório/pasta no espaço de trabalho.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nome ou caminho relativo do diretório a criar.',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ffmpeg_media',
      description:
        'Processa áudio, vídeo e imagens com o ffmpeg: extrair áudio, converter formato, comprimir, gerar thumbnail, cortar trecho, criar GIF, extrair quadros, normalizar volume ou analisar metadados. Use quando o usuário pedir para transformar uma mídia que já está no OTTO (media/in).',
      parameters: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: [
              'extract_audio',
              'convert',
              'compress',
              'thumbnail',
              'trim',
              'to_gif',
              'extract_frames',
              'normalize_audio',
              'probe',
            ],
            description: 'Operação desejada.',
          },
          input: {
            type: 'string',
            description: 'Nome ou caminho do arquivo de entrada dentro de otto_workspace/media (ex: "video.mp4" ou "in/video.mp4").',
          },
          output: {
            type: 'string',
            description: 'Nome do arquivo de saída, com extensão (ex: "audio.mp3"). Opcional.',
          },
          options: {
            type: 'object',
            description:
              'Ajustes opcionais: start/end/duration (tempo), crf, height, fps, width, quality, preset.',
          },
        },
        required: ['operation', 'input'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'execute_command',
      description: 'Executa um comando no terminal do computador de forma segura.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'O comando do terminal a ser executado.',
          },
        },
        required: ['command'],
      },
    },
  },
];

export class GroqService {
  /** Base da API; pode ser trocada por um proxy compatível via GROQ_BASE_URL. */
  private static get GROQ_BASE(): string {
    return (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, '');
  }

  private static get GROQ_ENDPOINT(): string {
    return `${this.GROQ_BASE}/chat/completions`;
  }

  /** 120b raciocina e usa ferramentas; 20b é o rápido/barato. */
  public static readonly DEEP_MODEL = 'openai/gpt-oss-120b';
  public static readonly FAST_MODEL_ID = 'openai/gpt-oss-20b';

  private static CANDIDATE_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

  private static groqCooldownUntil = 0;

  /**
   * Aceita id completo, apelido curto ("120b", "20b", "oss 120b") ou nome de variável
   * de ambiente. Devolve sempre um id válido da Groq.
   */
  public static resolveModel(modelInput?: string): string {
    const raw = String(modelInput || process.env.AI_MODEL || '').trim();

    // chave colada por engano no campo de modelo (nunca repercutir em DEFAULT_MODEL: recorreria)
    if (!raw || raw.startsWith('gsk_')) return this.DEEP_MODEL;

    const key = raw.toLowerCase().replace(/[\s_]+/g, '-').replace(/^openai\//, '');

    if (key === '20b' || key === 'gpt-oss-20b' || key === 'oss-20b' || key === 'gpt-20b') {
      return this.FAST_MODEL_ID;
    }
    if (key === '120b' || key === 'gpt-oss-120b' || key === 'oss-120b' || key === 'gpt-120b') {
      return this.DEEP_MODEL;
    }

    // qualquer outro modelo servido pela Groq (qwen, kimi, whisper…) passa direto
    return raw;
  }

  /** Modelo do tier, respeitando AI_MODEL / AI_MODEL_FAST do .env. */
  public static modelForTier(tier: GroqTier = 'deep'): string {
    if (tier === 'fast') {
      const raw = String(process.env.AI_MODEL_FAST || '').trim();
      return raw && !raw.startsWith('gsk_') ? this.resolveModel(raw) : this.FAST_MODEL_ID;
    }
    return this.DEFAULT_MODEL;
  }

  public static get FAST_MODEL(): string {
    return this.modelForTier('fast');
  }

  public static get DEFAULT_MODEL(): string {
    const raw = String(process.env.AI_MODEL || '').trim();
    return raw && !raw.startsWith('gsk_') ? this.resolveModel(raw) : this.DEEP_MODEL;
  }

  /** fetch falhou antes de qualquer HTTP: DNS, TLS, proxy, firewall. */
  private static isNetworkError(err: any): boolean {
    if (!err) return false;
    if (err.name === 'TypeError' && /fetch failed/i.test(String(err.message))) return true;
    const code = err?.cause?.code || err?.code;
    return [
      'ENOTFOUND',
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
      'EAI_AGAIN',
      'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
      'CERT_HAS_EXPIRED',
      'DEPTH_ZERO_SELF_SIGNED_CERT',
      'UND_ERR_CONNECT_TIMEOUT',
    ].includes(String(code));
  }

  /**
   * Monta o corpo da requisição. Separado do envio para poder ser testado sem rede.
   */
  public static buildPayload(options: GroqChatOptions, model: string): Record<string, any> {
    const payload: Record<string, any> = {
      model,
      messages: this.manageContext(options.messages),
      temperature: options.temperature ?? 0.3,
    };

    if (options.maxTokens) {
      // O GPT-OSS rejeita `max_tokens`; o campo correto na Groq é max_completion_tokens.
      payload.max_completion_tokens = options.maxTokens;
    }

    if (options.reasoningEffort) {
      payload.reasoning_effort = options.reasoningEffort;
    }

    if (options.responseFormat === 'json') {
      payload.response_format = { type: 'json_object' };
    }

    if (options.tools && options.tools.length > 0) {
      payload.tools = options.tools;
      payload.tool_choice = options.tool_choice || 'auto';
      // GPT-OSS não suporta chamadas paralelas: uma ferramenta por vez.
      payload.parallel_tool_calls = false;
    }

    return payload;
  }

  public static get API_KEY(): string {
    return process.env.GROQ_API_KEY || '';
  }

  /**
   * Manages conversation context size by trimming history while preserving system instructions.
   */
  public static manageContext(messages: GroqMessage[], maxMessages = 12): GroqMessage[] {
    if (!messages || messages.length === 0) return [];

    const systemMessages = messages.filter((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    if (nonSystemMessages.length <= maxMessages) {
      return messages;
    }

    // Keep the last maxMessages non-system messages
    const trimmed = nonSystemMessages.slice(-maxMessages);
    return [...systemMessages, ...trimmed];
  }

  /**
   * Sends a structured chat completion request to Groq API with candidate model fallbacks.
   */
  public static async sendMessage(options: GroqChatOptions): Promise<GroqChatResponse> {
    const apiKey = this.API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY_MISSING: Chave de API do Groq não configurada no servidor.');
    }

    if (Date.now() < this.groqCooldownUntil) {
      throw new Error('GROQ_COOLDOWN: Groq temporariamente indisponível.');
    }

    const requestedModel = options.model
      ? this.resolveModel(options.model)
      : this.modelForTier(options.tier);
    const modelsToTry = Array.from(new Set([requestedModel, ...this.CANDIDATE_MODELS]));
    const managedMessages = this.manageContext(options.messages);

    for (const model of modelsToTry) {
      const payload = this.buildPayload({ ...options, messages: managedMessages }, model);

      try {
        const response = await fetch(this.GROQ_ENDPOINT, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');

          if (response.status === 404 || errorText.includes('model_not_found')) {
            // Model not found on this account/key, try next candidate model
            continue;
          }

          if (response.status === 401) {
            this.groqCooldownUntil = Date.now() + 10 * 60 * 1000;
            throw new Error('GROQ_API_KEY_INVALID: A API Key do Groq é inválida ou expirou.');
          } else if (response.status === 429) {
            this.groqCooldownUntil = Date.now() + 2 * 60 * 1000;
            throw new Error('GROQ_RATE_LIMIT: Limite de requisições da API Groq excedido.');
          } else if (response.status === 400 && errorText.includes('context_length_exceeded')) {
            if (managedMessages.length > 3) {
              return this.sendMessage({
                ...options,
                messages: this.manageContext(managedMessages, 6),
              });
            }
            throw new Error('GROQ_CONTEXT_TOO_LARGE: O contexto da conversa é muito grande.');
          } else {
            throw new Error(`GROQ_API_ERROR: Erro na API do Groq (${response.status}). ${errorText.slice(0, 100)}`);
          }
        }

        const data: any = await response.json();
        const choice = data.choices?.[0];

        if (!choice) {
          throw new Error('GROQ_EMPTY_RESPONSE: O modelo Groq retornou uma resposta vazia.');
        }

        const message = choice.message || {};
        const content = message.content || '';
        const toolCalls = message.tool_calls || undefined;

        return {
          content,
          toolCalls,
          model: data.model || model,
          finishReason: choice.finish_reason,
          usage: data.usage,
        };
      } catch (err: any) {
        // Erro de rede não se resolve trocando de modelo: para aqui e explica o que houve.
        if (this.isNetworkError(err)) {
          throw new Error(
            `GROQ_NETWORK_ERROR: Não consegui falar com a Groq (${err?.cause?.code || err?.message || 'sem conexão'}). ` +
              'Verifique a internet, proxy/firewall ou GROQ_BASE_URL.'
          );
        }

        if (err?.message?.startsWith('GROQ_') && !err?.message?.includes('404')) {
          throw err;
        }
      }
    }

    // Só chega aqui quando TODOS os modelos responderam 404/model_not_found.
    this.groqCooldownUntil = Date.now() + 5 * 60 * 1000;
    throw new Error(
      'GROQ_MODELS_UNAVAILABLE: a chave não tem acesso aos modelos openai/gpt-oss-120b e openai/gpt-oss-20b.'
    );
  }

  /**
   * Streams chat completion tokens from Groq API via SSE callback.
   */
  public static async streamMessage(
    options: GroqChatOptions,
    callbacks: {
      onToken: (token: string) => void;
      onToolCall?: (toolCalls: GroqToolCall[]) => void;
      onError: (err: Error) => void;
      onComplete: (fullContent: string) => void;
    }
  ): Promise<void> {
    const apiKey = this.API_KEY;
    if (!apiKey) {
      callbacks.onError(new Error('GROQ_API_KEY_MISSING: Chave de API do Groq não configurada.'));
      return;
    }

    const model = options.model ? this.resolveModel(options.model) : this.modelForTier(options.tier);
    const payload = {
      ...this.buildPayload(options, model),
      stream: true,
    };

    try {
      const response = await fetch(this.GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        if (response.status === 401) {
          throw new Error('GROQ_API_KEY_INVALID: A API Key do Groq é inválida.');
        } else if (response.status === 429) {
          throw new Error('GROQ_RATE_LIMIT: Limite de requisições excedido no Groq.');
        }
        throw new Error(`GROQ_STREAM_ERROR: Erro no streaming (${response.status}) ${errorText.slice(0, 100)}`);
      }

      if (!response.body) {
        throw new Error('GROQ_NO_STREAM_BODY: Corpo da resposta de streaming indisponível.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullContent = '';
      let buffer = '';
      let accumulatedToolCalls: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed === 'data: [DONE]') break;

          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const delta = json.choices?.[0]?.delta;

              if (delta?.content) {
                fullContent += delta.content;
                callbacks.onToken(delta.content);
              }

              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index ?? 0;
                  if (!accumulatedToolCalls[idx]) {
                    accumulatedToolCalls[idx] = {
                      id: tc.id || `call_${Date.now()}`,
                      type: 'function',
                      function: { name: tc.function?.name || '', arguments: '' },
                    };
                  }
                  if (tc.function?.name) {
                    accumulatedToolCalls[idx].function.name = tc.function.name;
                  }
                  if (tc.function?.arguments) {
                    accumulatedToolCalls[idx].function.arguments += tc.function.arguments;
                  }
                }
              }
            } catch {}
          }
        }
      }

      if (accumulatedToolCalls.length > 0 && callbacks.onToolCall) {
        callbacks.onToolCall(accumulatedToolCalls);
      }

      callbacks.onComplete(fullContent);
    } catch (err: any) {
      callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    }
  }
}

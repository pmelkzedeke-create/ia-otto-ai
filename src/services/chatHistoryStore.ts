/**
 * Persistência local do histórico de conversa do OTTO.
 *
 * Antes: qualquer F5, recarga do bridge de build ou queda do ErrorBoundary
 * apagava a conversa inteira. Agora o histórico sobrevive ao recarregamento.
 *
 * Regras:
 * - formato versionado (trocar de versão descarta o histórico antigo em vez de
 *   quebrar o app);
 * - teto de mensagens e de bytes, para não estourar a cota do localStorage;
 * - mensagens "pesadas" (imagens coladas em base64, artefatos grandes) são
 *   enxugadas antes de salvar — o texto e o essencial ficam;
 * - nunca lança: qualquer falha de storage vira `false`/`[]`.
 */

import type { ChatMessage } from '../types/otto';

export const CHAT_HISTORY_KEY = 'otto.chat.history';
export const CHAT_HISTORY_VERSION = 1;
export const MAX_MESSAGES = 80;
export const MAX_BYTES = 200_000;
/** Acima disso, uma data URL é considerada pesada demais para persistir. */
const MAX_INLINE_DATA_URL = 8_000;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface PersistedHistory {
  version: number;
  savedAt: number;
  messages: ChatMessage[];
}

function defaultStorage(): StorageLike | null {
  try {
    if (typeof globalThis === 'undefined') return null;
    const storage = (globalThis as { localStorage?: StorageLike }).localStorage;
    return storage ?? null;
  } catch {
    // Safari em modo privado pode lançar no acesso.
    return null;
  }
}

function shrinkDataUrl(value: string): string {
  return value.length > MAX_INLINE_DATA_URL ? '' : value;
}

/** Remove o que não vale a pena guardar e garante o formato mínimo. */
export function slimMessage(message: ChatMessage): ChatMessage | null {
  if (!message || typeof message !== 'object') return null;
  if (message.sender !== 'user' && message.sender !== 'otto') return null;
  if (typeof message.text !== 'string' || typeof message.id !== 'string') return null;

  const slim: ChatMessage = {
    id: message.id,
    sender: message.sender,
    text: message.text.slice(0, 20_000),
    timestamp: typeof message.timestamp === 'string' ? message.timestamp : '',
  };

  if (message.route) slim.route = message.route;
  if (message.actions?.length) slim.actions = message.actions;
  if (message.options?.length) slim.options = message.options;
  if (message.images?.length) {
    slim.images = message.images.slice(0, 12).map((image) => ({
      ...image,
      url: shrinkDataUrl(String(image.url ?? '')),
    }));
  }
  if (message.holograms?.length) slim.holograms = message.holograms.slice(0, 6);
  if (message.knowledgeCard) slim.knowledgeCard = message.knowledgeCard;
  if (message.dataHubFiles?.length) {
    slim.dataHubFiles = message.dataHubFiles.slice(0, 8).map((file) => ({
      ...file,
      content: undefined,
    })) as ChatMessage['dataHubFiles'];
  }
  if (message.attachedImage) {
    slim.attachedImage = {
      ...message.attachedImage,
      dataUrl: shrinkDataUrl(String(message.attachedImage.dataUrl ?? '')),
    };
  }
  if (message.attachedFile) {
    slim.attachedFile = {
      name: message.attachedFile.name,
      size: message.attachedFile.size,
      type: message.attachedFile.type,
    };
  }
  // taskState e artifact ficam de fora de propósito: são grandes e o modal
  // recria o estado a partir do plano em execução.

  return slim;
}

export function serializeHistory(
  messages: ChatMessage[],
  options: { now?: number; maxMessages?: number; maxBytes?: number } = {}
): string | null {
  const { now = Date.now(), maxMessages = MAX_MESSAGES, maxBytes = MAX_BYTES } = options;

  const slim = (messages || [])
    .map(slimMessage)
    .filter((message): message is ChatMessage => message !== null)
    .slice(-maxMessages);

  if (!slim.length) return null;

  const build = (list: ChatMessage[]): string =>
    JSON.stringify({ version: CHAT_HISTORY_VERSION, savedAt: now, messages: list } satisfies PersistedHistory);

  let candidate = build(slim);
  if (candidate.length <= maxBytes) return candidate;

  // Ainda grande: vai cortando as mensagens mais antigas até caber.
  for (let keep = slim.length - 1; keep >= 1; keep -= 1) {
    candidate = build(slim.slice(-keep));
    if (candidate.length <= maxBytes) return candidate;
  }
  return null;
}

export function parseHistory(raw: string | null | undefined): ChatMessage[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedHistory>;
    if (!parsed || parsed.version !== CHAT_HISTORY_VERSION) return [];
    if (!Array.isArray(parsed.messages)) return [];
    return parsed.messages
      .map((message) => slimMessage(message as ChatMessage))
      .filter((message): message is ChatMessage => message !== null)
      .slice(-MAX_MESSAGES);
  } catch {
    return [];
  }
}

export function saveHistory(
  messages: ChatMessage[],
  storage: StorageLike | null = defaultStorage()
): boolean {
  if (!storage) return false;
  const payload = serializeHistory(messages);
  try {
    if (!payload) {
      storage.removeItem(CHAT_HISTORY_KEY);
      return true;
    }
    storage.setItem(CHAT_HISTORY_KEY, payload);
    return true;
  } catch {
    // Cota cheia: descarta o histórico antigo em vez de falhar em silêncio.
    try {
      storage.removeItem(CHAT_HISTORY_KEY);
    } catch {
      /* noop */
    }
    return false;
  }
}

export function loadHistory(storage: StorageLike | null = defaultStorage()): ChatMessage[] {
  if (!storage) return [];
  try {
    return parseHistory(storage.getItem(CHAT_HISTORY_KEY));
  } catch {
    return [];
  }
}

export function clearHistory(storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(CHAT_HISTORY_KEY);
  } catch {
    /* noop */
  }
}

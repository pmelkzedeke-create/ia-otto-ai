/**
 * Cérebro local do OTTO — modo degradado.
 *
 * Quando nenhum provedor de nuvem responde (sem internet, chave inválida, limite de
 * requisições), o OTTO não pode simplesmente calar. Ele responde o que sabe de verdade,
 * sem fingir raciocínio de LLM: identifica comandos de mídia (o ffmpeg roda local), dá
 * hora, lista arquivos, e explica exatamente por que a nuvem está fora.
 *
 * Regra de ouro: nada de resposta inventada. Se não sabe, diz que não sabe.
 */

import { detectMediaEngine, listMediaFiles, type MediaEngineStatus } from './mediaTools.js';

export type LocalAction = {
  action: string;
  target: string;
  parameters: Record<string, any>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reasoning?: string;
};

export interface LocalReplyInput {
  prompt: string;
  reason?: string;
  dataHubContext?: { totalFiles?: number; files?: { id: string; name: string; category?: string }[] };
  memoriesCount?: number;
}

export interface LocalReply {
  speechResponse: string;
  actions: LocalAction[];
  requiresConfirmation: boolean;
  provider: 'local';
  degraded: true;
  notice: string;
}

const MEDIA_EXTENSIONS = 'mp4|mov|mkv|webm|avi|m4v|mp3|wav|m4a|ogg|flac|aac|jpg|jpeg|png|webp';

const none = (): LocalAction[] => [
  {
    action: 'none',
    target: 'local',
    parameters: {},
    riskLevel: 'LOW',
    reasoning: 'Resposta do modo local, sem provedor de nuvem',
  },
];

/** minúsculas e sem acento: o usuário digita "audio", "voce", "nao"… */
export function stripAccents(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Nome de arquivo de mídia citado na frase, se houver.
 * Prioridade: arquivo que existe de fato na pasta de mídia; depois um token `nome.ext`.
 */
export function findMediaFileInPrompt(prompt: string, available: { name: string }[]): string | null {
  const normalized = stripAccents(prompt);

  // 1. Um arquivo que realmente existe, citado em qualquer parte da frase
  const existing = available.find((file) => normalized.includes(stripAccents(file.name)));
  if (existing) return existing.name;

  // 2. Nome entre aspas: preserva espaços ("clipe final.mov")
  const quoted = new RegExp(`["'“”]([^"'“”]{1,120}\\.(?:${MEDIA_EXTENSIONS}))["'“”]`, 'i').exec(prompt);
  if (quoted) return quoted[1].trim();

  // 3. Token com extensão de mídia (sem espaços: não engole a palavra anterior)
  const explicit = new RegExp(`([\\w\\-]{1,80}\\.(?:${MEDIA_EXTENSIONS}))\\b`, 'i').exec(normalized);
  return explicit ? explicit[1] : null;
}

type MediaIntent = {
  operation: string;
  label: string;
  pattern: RegExp;
};

const ACCEPTED_KINDS: Record<string, string[]> = {
  extract_audio: ['video', 'audio'],
  convert: ['video', 'audio', 'image'],
  compress: ['video'],
  thumbnail: ['video'],
  trim: ['video', 'audio'],
  to_gif: ['video'],
  extract_frames: ['video'],
  normalize_audio: ['video', 'audio'],
  probe: ['video', 'audio', 'image'],
};

function kindOf(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'].includes(ext)) return 'audio';
  return 'image';
}

const MEDIA_INTENTS: MediaIntent[] = [
  {
    operation: 'extract_audio',
    label: 'extrair o áudio',
    pattern: /(extrai|extraia|extrair|separa|separes|separar|tira|tirar|pega|pegar)\s+(o\s+|a\s+)?(audio|som|faixa)/i,
  },
  {
    operation: 'to_gif',
    label: 'criar um GIF',
    pattern: /\b(gif|gifs)\b/i,
  },
  {
    operation: 'thumbnail',
    label: 'gerar a capa',
    pattern: /(capa|thumbnail|miniatura|thumb)\b/i,
  },
  {
    operation: 'compress',
    label: 'comprimir',
    pattern: /(comprimi|comprimir|comprime|reduz|reduzir|diminui|diminuir|deixa\s+leve|mais\s+leve|encolhe|encolher)/i,
  },
  {
    operation: 'trim',
    label: 'cortar um trecho',
    pattern: /(corta|cortar|corte|recorta|recortar|aparar|cortar\s+o\s+trecho)\b/i,
  },
  {
    operation: 'normalize_audio',
    label: 'normalizar o volume',
    pattern: /(normaliza|normalizar|nivelar\s+(o\s+)?volume|volume\s+igual)/i,
  },
  {
    operation: 'extract_frames',
    label: 'montar a folha de quadros',
    pattern: /(quadros|frames|fotogramas)/i,
  },
  {
    operation: 'probe',
    label: 'analisar os metadados',
    pattern: /(duracao|resolucao|quantos?\s+(mb|segundos)|metadados|codec|bitrate|analisa(r)?\s+(o\s+)?(video|audio))/i,
  },
  {
    operation: 'convert',
    label: 'converter',
    pattern: /(converte|converter|conversao|transforma|transformar)\b/i,
  },
];

/** "corta os primeiros 10 segundos" → { duration: 10 }; "do 5s ao 20s" → { start, end }. */
export function trimOptionsFromPrompt(prompt: string): Record<string, string> | null {
  const text = stripAccents(prompt);
  const unit = (value: string, kind: string) => (kind.startsWith('min') ? String(Number(value) * 60) : value);

  const range = /(?:do|de)\s+(\d+(?:[.,]\d+)?)\s*(segundos?|seg|s|minutos?|min)\s*(?:ao|ate|até)\s*(\d+(?:[.,]\d+)?)\s*(segundos?|seg|s|minutos?|min)/.exec(text);
  if (range) {
    const start = unit(range[1].replace(',', '.'), range[2]);
    const end = unit(range[3].replace(',', '.'), range[4]);
    return { start: `${start}`, end: `${end}` };
  }

  const duration = /(?:primeiros|primeiras|inicio|comeco)?\s*(\d+(?:[.,]\d+)?)\s*(segundos?|seg|s|minutos?|min)/.exec(text);
  if (duration) {
    return { duration: unit(duration[1].replace(',', '.'), duration[2]) };
  }

  return null;
}

/** Extrai "para mp3", "em webm"… para escolher a extensão de saída. */
export function outputExtensionFromPrompt(prompt: string): string | null {
  const match = /(?:para|em|pra|no formato)\s+\.?(mp3|mp4|webm|wav|m4a|ogg|flac|gif|jpg|jpeg|png|avi|mkv)\b/i.exec(
    stripAccents(prompt)
  );
  return match ? match[1].toLowerCase() : null;
}

const extensionByOperation: Record<string, string> = {
  extract_audio: 'mp3',
  convert: 'mp4',
  compress: 'mp4',
  thumbnail: 'jpg',
  trim: 'mp4',
  to_gif: 'gif',
  extract_frames: 'jpg',
  normalize_audio: 'mp3',
  probe: 'json',
};

function baseName(file: string): string {
  return file.replace(/\.[^.]+$/, '');
}

async function mediaReply(input: LocalReplyInput, engine: MediaEngineStatus): Promise<LocalReply | null> {
  const lower = stripAccents(input.prompt);
  const intent = MEDIA_INTENTS.find((candidate) => candidate.pattern.test(lower));
  if (!intent) return null;

  const allFiles = listMediaFiles();
  const acceptedKinds = ACCEPTED_KINDS[intent.operation] || ['video', 'audio', 'image'];
  const ofKind = allFiles.filter((item) => acceptedKinds.includes(kindOf(item.name)));

  // Fonte antes de resultado: "converte para mp3" quer o arquivo do usuário, não um
  // resultado anterior em media/out.
  const sources = ofKind.filter((item) => /(^|\/)in\//.test(item.relativePath));
  const candidates = sources.length > 0 ? sources : ofKind;

  // Preferência: arquivo citado pelo nome; senão, o único candidato do tipo certo
  // (é o caso de "faz um gif desse vídeo" com um único vídeo na pasta).
  let file = findMediaFileInPrompt(input.prompt, allFiles);
  if (file && !candidates.some((item) => item.name === file)) file = null;
  if (!file && candidates.length === 1) file = candidates[0].name;
  const available = candidates;

  if (!engine.available) {
    return {
      speechResponse:
        `Entendi: quer ${intent.label}${file ? ` do "${file}"` : ''}. ` +
        'Só que o ffmpeg não está instalado nesta máquina, então não consigo rodar agora. ' +
        (engine.hint || 'Instale o ffmpeg e recarregue.'),
      actions: none(),
      requiresConfirmation: false,
      provider: 'local',
      degraded: true,
      notice: 'ffmpeg ausente',
    };
  }

  if (!file) {
    const list = available
      .slice(0, 8)
      .map((item) => `"${item.name}"`)
      .join(', ');

    return {
      speechResponse: list
        ? `Consigo ${intent.label}, mas não sei de qual arquivo. Aqui na pasta de mídia estão: ${list}. Qual deles?`
        : `Consigo ${intent.label}, mas não há nenhum áudio ou vídeo aqui ainda. Anexe um arquivo no chat ou no Data Hub e eu processo.`,
      actions: available.length ? [{ action: 'open_datahub', target: 'datahub', parameters: {}, riskLevel: 'LOW' }] : none(),
      requiresConfirmation: false,
      provider: 'local',
      degraded: true,
      notice: 'aguardando arquivo',
    };
  }

  const askedExtension = outputExtensionFromPrompt(input.prompt);
  const extension = askedExtension || extensionByOperation[intent.operation] || 'mp4';
  const producesOutput = intent.operation !== 'probe';
  const output = producesOutput ? `${baseName(file)}-${intent.operation}.${extension}` : undefined;
  const options = intent.operation === 'trim' ? trimOptionsFromPrompt(input.prompt) : undefined;

  return {
    speechResponse:
      `Peguei: ${intent.label} de "${file}"${output ? ` → "${output}"` : ''}. ` +
      'Estou em modo local (sem nuvem), mas o ffmpeg roda aqui, então isso funciona de verdade.',
    actions: [
      {
        action: 'media_ffmpeg',
        target: file,
        parameters: {
          operation: intent.operation,
          file,
          ...(output ? { output } : {}),
          ...(options ? { options } : {}),
        },
        riskLevel: 'MEDIUM',
        reasoning: 'Comando de mídia reconhecido localmente',
      },
    ],
    requiresConfirmation: false,
    provider: 'local',
    degraded: true,
    notice: 'executando com ffmpeg local',
  };
}

function timeReply(): string {
  const now = new Date();
  const time = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);
  const date = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(now);
  return `Agora são ${time} (horário de Brasília), ${date}.`;
}

/**
 * Responde localmente. Assíncrono porque a detecção do ffmpeg é assíncrona.
 */
export async function buildLocalReply(input: LocalReplyInput): Promise<LocalReply> {
  const prompt = String(input.prompt || '').trim();
  const lower = stripAccents(prompt);
  const engine = await detectMediaEngine();
  const files = input.dataHubContext?.files || [];
  const totalFiles = input.dataHubContext?.totalFiles ?? files.length;
  const mediaCount = listMediaFiles().length;

  // 1. Comandos de mídia têm prioridade: são os únicos que funcionam 100% offline.
  const media = await mediaReply(input, engine);
  if (media) return media;

  // 2. Hora e data
  if (/(que horas|hora agora|horas sao|horario agora|hoje e que dia|que dia (e|e) hoje|data de hoje)/i.test(lower)) {
    return {
      speechResponse: timeReply(),
      actions: none(),
      requiresConfirmation: false,
      provider: 'local',
      degraded: true,
      notice: 'relógio local',
    };
  }

  // 3. Saudação
  if (/^(oi|ola|e ai|opa|bom dia|boa tarde|boa noite|hey|hi|tudo bem|tudo bom)[!.\s]*$/i.test(lower)) {
    return {
      speechResponse:
        'Oi! Estou aqui, mas em modo local: a nuvem (Groq) não respondeu, então não estou raciocinando com o modelo grande agora. ' +
        'Mesmo assim consigo mexer em mídia com ffmpeg, mostrar seus arquivos e o mapa de memórias. Se quiser a conversa completa, ' +
        'confira a chave da Groq e a internet do servidor.',
      actions: none(),
      requiresConfirmation: false,
      provider: 'local',
      degraded: true,
      notice: 'modo local',
    };
  }

  // 4. Identidade e capacidades
  if (/(quem (e|e) voce|qual (e|e) seu nome|seu nome|o que voce faz|o que voce pode fazer|suas funcoes|ajuda|help)/i.test(lower)) {
    const capabilities = [
      'converter, cortar, comprimir e extrair áudio de vídeos com ffmpeg',
      'gerar GIF, capa e folha de quadros',
      'analisar metadados (duração, codecs, resolução)',
      `${totalFiles} arquivo(s) indexados no Data Hub`,
      `${input.memoriesCount ?? 0} memória(s) de longo prazo`,
    ];

    return {
      speechResponse:
        'Sou o OTTO. Agora estou em modo local, sem o modelo de nuvem, então respondo por regras em vez de raciocínio livre. ' +
        `O que continua funcionando de verdade: ${capabilities.join('; ')}. ` +
        (engine.available ? 'O motor ffmpeg está pronto. ' : 'O ffmpeg está ausente nesta máquina. ') +
        'Para a conversa completa voltar, verifique a conexão com a Groq.',
      actions: none(),
      requiresConfirmation: false,
      provider: 'local',
      degraded: true,
      notice: 'modo local',
    };
  }

  // 5. Arquivos e Data Hub
  if (/(meus arquivos|data ?hub|meus documentos|o que tem (no|na) (data|pasta)|listar arquivos)/i.test(lower)) {
    const names = files.slice(0, 8).map((file) => `"${file.name}"`).join(', ');
    return {
      speechResponse: totalFiles
        ? `Você tem ${totalFiles} arquivo(s) no Data Hub${names ? `: ${names}${totalFiles > 8 ? ' e mais alguns' : ''}` : ''}. Vou abrir o painel.`
        : 'O Data Hub está vazio. Arraste arquivos para lá ou anexe no chat.',
      actions: totalFiles
        ? [{ action: 'open_datahub', target: 'datahub', parameters: {}, riskLevel: 'LOW' }]
        : none(),
      requiresConfirmation: false,
      provider: 'local',
      degraded: true,
      notice: 'modo local',
    };
  }

  // 6. Memória
  if (/(memoria|memorias|lembrar|o que voce sabe sobre mim)/i.test(lower)) {
    return {
      speechResponse: `Tenho ${input.memoriesCount ?? 0} memória(s) guardadas. Posso abrir o mapa planetário para você revisar.`,
      actions: [{ action: 'open_memory_map', target: 'memory_map', parameters: {}, riskLevel: 'LOW' }],
      requiresConfirmation: false,
      provider: 'local',
      degraded: true,
      notice: 'modo local',
    };
  }

  // 7. Não entendi — e não vou inventar
  return {
    speechResponse:
      'Não vou fingir que entendi: o modelo de nuvem está fora e essa pergunta precisa dele. ' +
      (input.reason ? `Motivo técnico: ${input.reason.replace(/\.+$/, '')}. ` : '') +
      'O que eu ainda faço daqui: processar áudio e vídeo com ffmpeg (diga "extrai o áudio de vídeo.mp4"), ' +
      'mostrar seus arquivos e as memórias. Assim que a conexão com a Groq voltar, eu respondo normalmente.',
    actions: none(),
    requiresConfirmation: false,
    provider: 'local',
    degraded: true,
    notice: 'modo local',
  };
}

/** Detecta se o erro é de infraestrutura de IA (não de conteúdo). */
export function isAiInfrastructureError(error: unknown): boolean {
  const message = String((error as Error)?.message || error || '');
  return /GROQ_|GEMINI|API_KEY|fetch failed|ECONN|ETIMEDOUT|ENOTFOUND|rate.?limit|indispon|quota/i.test(message);
}

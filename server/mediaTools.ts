/**
 * Motor de mídia do OTTO — ffmpeg como ferramenta de agente.
 *
 * Regras de segurança (o binário recebe caminhos vindos do modelo):
 * - nunca usa shell: `spawn(bin, args[])`, então `;`, `|`, `$()` e aspas não
 *   têm significado especial — viram texto literal de argumento;
 * - entrada e saída precisam ficar dentro de `otto_workspace/media/`;
 * - a operação vem de uma allowlist (`MEDIA_OPERATIONS`), não do modelo;
 * - parâmetros numéricos são validados e limitados; enums são fechados;
 * - a saída nunca sobrescreve um arquivo existente sem `overwrite: true`;
 * - timeout por execução e teto de tamanho no resultado.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { WORKSPACE_DIR } from './memoryStore.js';
import { isInside, resolveInside } from './paths.js';

export const MEDIA_DIR = path.join(WORKSPACE_DIR, 'media');
export const MEDIA_IN_DIR = path.join(MEDIA_DIR, 'in');
export const MEDIA_OUT_DIR = path.join(MEDIA_DIR, 'out');

export const MAX_INPUT_BYTES = 120 * 1024 * 1024; // 120 MB por arquivo
export const MAX_OUTPUT_BYTES = 400 * 1024 * 1024;
export const DEFAULT_TIMEOUT_MS = 120_000;
export const MAX_TIMEOUT_MS = 300_000;

export class MediaError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'ENGINE_MISSING'
      | 'BAD_OPERATION'
      | 'BAD_PATH'
      | 'BAD_OPTIONS'
      | 'OUTPUT_EXISTS'
      | 'TIMEOUT'
      | 'FAILED'
      | 'TOO_LARGE'
  ) {
    super(message);
    this.name = 'MediaError';
  }
}

export type MediaKind = 'audio' | 'video' | 'image';

export type MediaOperation =
  | 'extract_audio'
  | 'convert'
  | 'compress'
  | 'thumbnail'
  | 'trim'
  | 'to_gif'
  | 'extract_frames'
  | 'normalize_audio'
  | 'probe';

const AUDIO_EXT = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'wma']);
const VIDEO_EXT = new Set(['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v', 'flv', 'wmv', 'ts']);
const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tiff']);

export function mediaKindOf(filePath: string): MediaKind | null {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  if (AUDIO_EXT.has(ext)) return 'audio';
  if (VIDEO_EXT.has(ext)) return 'video';
  if (IMAGE_EXT.has(ext)) return 'image';
  return null;
}

export interface MediaOperationSpec {
  id: MediaOperation;
  label: string;
  description: string;
  accepts: MediaKind[];
  defaultExtension: string;
  /** `probe` só lê metadados: não gera arquivo. */
  producesOutput?: boolean;
  /** Monta os argumentos do ffmpeg (sem o binário, sem `-i`). */
  build(args: {
    input: string;
    output: string;
    options: Record<string, unknown>;
  }): string[];
}

// ---------------------------------------------------------------------------
// Helpers de validação de opções
// ---------------------------------------------------------------------------

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const candidate = String(value ?? '').toLowerCase();
  return (allowed as readonly string[]).includes(candidate) ? (candidate as T) : fallback;
}

/** Só aceita 'HH:MM:SS(.ms)' ou segundos numéricos — nada de texto livre. */
function timeValue(value: unknown, fallback: string): string {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  if (/^\d{1,2}(:\d{1,2}){1,2}(\.\d{1,3})?$/.test(raw)) return raw;
  const seconds = Number.parseFloat(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return String(Math.min(seconds, 86_400));
  return fallback;
}

// ---------------------------------------------------------------------------
// Allowlist de operações
// ---------------------------------------------------------------------------

const BASE_FLAGS = ['-hide_banner', '-nostdin', '-loglevel', 'error'];

export const MEDIA_OPERATIONS: Record<MediaOperation, MediaOperationSpec> = {
  extract_audio: {
    id: 'extract_audio',
    label: 'Extrair áudio',
    description: 'Separa a faixa de áudio de um vídeo em MP3.',
    accepts: ['video', 'audio'],
    defaultExtension: 'mp3',
    build: ({ input, output, options }) => [
      ...BASE_FLAGS,
      '-i', input,
      '-vn',
      '-c:a', 'libmp3lame',
      '-q:a', String(clampNumber(options.quality, 2, 0, 9)),
      output,
    ],
  },

  convert: {
    id: 'convert',
    label: 'Converter',
    description: 'Converte vídeo entre MP4, WEBM e MKV, ou áudio entre MP3, WAV e OGG.',
    accepts: ['video', 'audio'],
    defaultExtension: 'mp4',
    build: ({ input, output, options }) => {
      const ext = path.extname(output).slice(1).toLowerCase();
      if (ext === 'webm') {
        return [
          ...BASE_FLAGS, '-i', input,
          '-c:v', 'libvpx-vp9', '-crf', String(clampNumber(options.crf, 32, 0, 63)), '-b:v', '0',
          '-c:a', 'libopus', output,
        ];
      }
      if (AUDIO_EXT.has(ext)) {
        return [...BASE_FLAGS, '-i', input, '-vn', '-c:a', ext === 'wav' ? 'pcm_s16le' : 'aac', output];
      }
      return [
        ...BASE_FLAGS, '-i', input,
        '-c:v', 'libx264',
        '-preset', pickEnum(options.preset, ['ultrafast', 'fast', 'medium', 'slow'] as const, 'fast'),
        '-crf', String(clampNumber(options.crf, 23, 0, 51)),
        '-c:a', 'aac', '-b:a', '160k',
        '-movflags', '+faststart',
        output,
      ];
    },
  },

  compress: {
    id: 'compress',
    label: 'Comprimir',
    description: 'Reduz o tamanho do vídeo (720p por padrão) mantendo boa qualidade.',
    accepts: ['video'],
    defaultExtension: 'mp4',
    build: ({ input, output, options }) => {
      const height = Math.round(clampNumber(options.height, 720, 144, 2160));
      return [
        ...BASE_FLAGS, '-i', input,
        '-vf', `scale=-2:${height}`,
        '-c:v', 'libx264',
        '-preset', pickEnum(options.preset, ['ultrafast', 'fast', 'medium', 'slow'] as const, 'medium'),
        '-crf', String(clampNumber(options.crf, 28, 18, 40)),
        '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart',
        output,
      ];
    },
  },

  thumbnail: {
    id: 'thumbnail',
    label: 'Capa (thumbnail)',
    description: 'Extrai um quadro do vídeo como imagem.',
    accepts: ['video'],
    defaultExtension: 'jpg',
    build: ({ input, output, options }) => [
      ...BASE_FLAGS,
      '-ss', timeValue(options.at, '00:00:01'),
      '-i', input,
      '-frames:v', '1',
      '-vf', `scale=-2:${Math.round(clampNumber(options.height, 720, 120, 2160))}`,
      '-q:v', String(clampNumber(options.quality, 3, 1, 10)),
      output,
    ],
  },

  trim: {
    id: 'trim',
    label: 'Cortar trecho',
    description: 'Recorta um intervalo do vídeo ou áudio.',
    accepts: ['video', 'audio'],
    defaultExtension: 'mp4',
    build: ({ input, output, options }) => {
      const start = timeValue(options.start, '00:00:00');
      const end = timeValue(options.end, '');
      const duration = timeValue(options.duration, '');
      const args = [...BASE_FLAGS, '-ss', start, '-i', input];
      if (end) args.push('-to', end);
      else if (duration) args.push('-t', duration);
      if (mediaKindOf(output) === 'audio') args.push('-vn', '-c:a', 'libmp3lame', '-q:a', '2');
      else args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac', '-movflags', '+faststart');
      args.push(output);
      return args;
    },
  },

  to_gif: {
    id: 'to_gif',
    label: 'Gerar GIF',
    description: 'Transforma um trecho do vídeo em GIF animado.',
    accepts: ['video'],
    defaultExtension: 'gif',
    build: ({ input, output, options }) => {
      const fps = Math.round(clampNumber(options.fps, 12, 5, 30));
      const width = Math.round(clampNumber(options.width, 480, 120, 960));
      return [
        ...BASE_FLAGS,
        '-ss', timeValue(options.start, '00:00:00'),
        '-t', timeValue(options.duration, '5'),
        '-i', input,
        '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos`,
        '-loop', '0',
        output,
      ];
    },
  },

  extract_frames: {
    id: 'extract_frames',
    label: 'Extrair quadros',
    description: 'Monta uma folha de contato com os quadros do vídeo em grade.',
    accepts: ['video'],
    defaultExtension: 'jpg',
    build: ({ input, output, options }) => {
      const fps = clampNumber(options.fps, 1, 0.1, 30).toFixed(2).replace(/\.?0+$/, '');
      const columns = Math.round(clampNumber(options.columns, 3, 1, 6));
      const rows = Math.round(clampNumber(options.rows, 3, 1, 6));
      const width = Math.round(clampNumber(options.width, 480, 120, 960));

      return [
        ...BASE_FLAGS,
        '-i', input,
        '-vf', `fps=${fps},scale=${width}:-1,tile=${columns}x${rows}`,
        '-frames:v', '1',
        '-q:v', '3',
        output,
      ];
    },
  },

  normalize_audio: {
    id: 'normalize_audio',
    label: 'Normalizar áudio',
    description: 'Nivela o volume para padrão de podcast (-16 LUFS).',
    accepts: ['audio', 'video'],
    defaultExtension: 'mp3',
    build: ({ input, output }) => [
      ...BASE_FLAGS, '-i', input,
      '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
      '-c:a', 'libmp3lame', '-q:a', '2',
      output,
    ],
  },

  probe: {
    id: 'probe',
    label: 'Analisar mídia',
    description: 'Lê metadados: duração, codecs, resolução e bitrate.',
    accepts: ['audio', 'video', 'image'],
    defaultExtension: 'json',
    producesOutput: false,
    // `-loglevel info` é essencial: os metadados vêm no stderr do ffmpeg.
    build: ({ input }) => [
      '-hide_banner', '-nostdin', '-loglevel', 'info',
      '-i', input,
      '-f', 'null', '-',
    ],
  },
};

export function isMediaOperation(value: string): value is MediaOperation {
  return Object.prototype.hasOwnProperty.call(MEDIA_OPERATIONS, value);
}

export function listMediaOperations(): MediaOperationSpec[] {
  return Object.values(MEDIA_OPERATIONS);
}

// ---------------------------------------------------------------------------
// Detecção do binário
// ---------------------------------------------------------------------------

export interface MediaEngineStatus {
  available: boolean;
  binaryPath: string | null;
  version: string | null;
  source: 'env' | 'bundled' | 'path' | null;
  checkedAt: number;
  hint?: string;
}

let engineCache: MediaEngineStatus | null = null;

function candidates(): { bin: string; source: MediaEngineStatus['source'] }[] {
  const list: { bin: string; source: MediaEngineStatus['source'] }[] = [];
  if (process.env.FFMPEG_PATH) list.push({ bin: process.env.FFMPEG_PATH, source: 'env' });

  // ffmpeg-static (opcional): binário versionado junto do projeto
  for (const relative of ['ffmpeg-static/ffmpeg', 'ffmpeg-static/ffmpeg.exe']) {
    const bundled = path.resolve(process.cwd(), 'node_modules', relative);
    if (fs.existsSync(bundled)) list.push({ bin: bundled, source: 'bundled' });
  }

  list.push({ bin: 'ffmpeg', source: 'path' });
  return list;
}

function runVersion(bin: string, timeoutMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value: string | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    let child;
    try {
      child = spawn(bin, ['-version'], { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch {
      return done(null);
    }

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      done(null);
    }, timeoutMs);

    let out = '';
    child.stdout?.on('data', (chunk) => {
      out += String(chunk).slice(0, 300);
    });
    child.on('error', () => {
      clearTimeout(timer);
      done(null);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      done(code === 0 && out ? out.split('\n')[0] : null);
    });
  });
}

/** Descobre se há ffmpeg utilizável. Resultado fica em cache. */
export async function detectMediaEngine(force = false): Promise<MediaEngineStatus> {
  if (engineCache && !force) return engineCache;

  for (const { bin, source } of candidates()) {
    const version = await runVersion(bin, 4000);
    if (version) {
      engineCache = {
        available: true,
        binaryPath: bin,
        version: version.replace(/^ffmpeg version\s*/i, '').trim().slice(0, 60),
        source,
        checkedAt: Date.now(),
      };
      return engineCache;
    }
  }

  engineCache = {
    available: false,
    binaryPath: null,
    version: null,
    source: null,
    checkedAt: Date.now(),
    hint:
      'ffmpeg não encontrado. Instale com "brew install ffmpeg" (macOS), "sudo apt install ffmpeg" (Linux) ou ' +
      '"winget install Gyan.FFmpeg" (Windows), ou defina FFMPEG_PATH no .env apontando para o executável.',
  };
  return engineCache;
}

export function resetMediaEngineCache(): void {
  engineCache = null;
}

// ---------------------------------------------------------------------------
// Caminhos e execução
// ---------------------------------------------------------------------------

export function ensureMediaDirs(): void {
  for (const dir of [MEDIA_DIR, MEDIA_IN_DIR, MEDIA_OUT_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function sanitizeMediaName(raw: string, fallbackExtension = 'bin'): string {
  const base = path
    .basename(String(raw || '').replace(/\\/g, '/'))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/-+\./g, '.')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 90);

  const named = /\.[a-z0-9]{1,6}$/i.test(base) ? base : `${base || 'media'}.${fallbackExtension}`;
  // minúsculas evitam colisão em sistemas de arquivos case-sensitive
  return named.toLowerCase();
}

/** Resolve um nome/caminho de entrada garantidamente dentro de media/in. */
export function resolveInputPath(raw: string): string {
  const candidate = String(raw || '').trim();
  if (!candidate) throw new MediaError('Arquivo de entrada não informado.', 'BAD_PATH');

  let asAbsolute: string;
  try {
    if (path.isAbsolute(candidate)) {
      asAbsolute = path.resolve(candidate);
    } else {
      asAbsolute = resolveInside(MEDIA_IN_DIR, candidate);
      // Encadear operações é comum (extrair áudio → normalizar): aceita out/ também.
      if (!fs.existsSync(asAbsolute)) {
        const inOutput = resolveInside(MEDIA_OUT_DIR, candidate);
        if (fs.existsSync(inOutput)) asAbsolute = inOutput;
      }
    }
  } catch {
    throw new MediaError('A entrada precisa estar dentro de otto_workspace/media.', 'BAD_PATH');
  }

  if (!isInside(MEDIA_DIR, asAbsolute)) {
    throw new MediaError('A entrada precisa estar dentro de otto_workspace/media.', 'BAD_PATH');
  }
  if (!fs.existsSync(asAbsolute) || !fs.statSync(asAbsolute).isFile()) {
    throw new MediaError(`Arquivo não encontrado: ${path.basename(asAbsolute)}`, 'BAD_PATH');
  }
  return asAbsolute;
}

export interface RunMediaOptions {
  operation: MediaOperation;
  input: string;
  output?: string;
  options?: Record<string, unknown>;
  overwrite?: boolean;
  timeoutMs?: number;
}

export interface RunMediaResult {
  ok: boolean;
  operation: MediaOperation;
  inputPath: string;
  outputPath: string | null;
  outputName: string | null;
  sizeBytes: number;
  durationMs: number;
  engine: string;
  details?: string;
}

function runProcess(
  bin: string,
  args: string[],
  timeoutMs: number
): Promise<{ code: number | null; stderr: string; stdout: string }> {
  return new Promise((resolve) => {
    let stderr = '';
    let stdout = '';

    let child;
    try {
      child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      resolve({ code: -1, stderr: String(error), stdout: '' });
      return;
    }

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout?.on('data', (chunk) => {
      stdout = (stdout + String(chunk)).slice(-16_000);
    });
    child.stderr?.on('data', (chunk) => {
      stderr = (stderr + String(chunk)).slice(-8_000);
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ code: -1, stderr: String(error), stdout });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stderr, stdout });
    });
  });
}

/**
 * Executa uma operação de mídia. Toda a validação acontece antes de tocar no binário.
 */
export async function runMediaOperation(request: RunMediaOptions): Promise<RunMediaResult> {
  if (!isMediaOperation(request.operation)) {
    throw new MediaError(`Operação não suportada: ${request.operation}`, 'BAD_OPERATION');
  }

  const engine = await detectMediaEngine();
  if (!engine.available || !engine.binaryPath) {
    throw new MediaError(engine.hint || 'ffmpeg indisponível.', 'ENGINE_MISSING');
  }

  const spec = MEDIA_OPERATIONS[request.operation];
  ensureMediaDirs();

  const inputPath = resolveInputPath(request.input);
  const kind = mediaKindOf(inputPath);
  if (kind && !spec.accepts.includes(kind)) {
    throw new MediaError(
      `A operação "${spec.label}" não aceita ${kind}. Aceita: ${spec.accepts.join(', ')}.`,
      'BAD_OPTIONS'
    );
  }

  const inputStat = fs.statSync(inputPath);
  if (inputStat.size > MAX_INPUT_BYTES) {
    throw new MediaError(`Arquivo maior que ${Math.round(MAX_INPUT_BYTES / 1024 / 1024)} MB.`, 'TOO_LARGE');
  }

  const producesOutput = spec.producesOutput !== false;
  const outputName = producesOutput
    ? sanitizeMediaName(
        request.output || `${path.parse(inputPath).name}-${request.operation}.${spec.defaultExtension}`,
        spec.defaultExtension
      )
    : null;
  const outputPath = outputName ? resolveInside(MEDIA_OUT_DIR, outputName) : null;

  if (outputPath && fs.existsSync(outputPath) && !request.overwrite) {
    throw new MediaError(
      `Já existe um arquivo "${outputName}" na saída. Escolha outro nome ou autorize sobrescrever.`,
      'OUTPUT_EXISTS'
    );
  }

  const timeoutMs = Math.round(clampNumber(request.timeoutMs, DEFAULT_TIMEOUT_MS, 5_000, MAX_TIMEOUT_MS));
  const options = request.options && typeof request.options === 'object' ? request.options : {};
  const args = spec.build({ input: inputPath, output: outputPath || '', options });

  const startedAt = Date.now();
  const { code, stderr, stdout } = await runProcess(engine.binaryPath, args, timeoutMs);
  const durationMs = Date.now() - startedAt;

  if (code !== 0) {
    const timedOut = durationMs >= timeoutMs - 500;
    throw new MediaError(
      timedOut
        ? `A conversão passou de ${Math.round(timeoutMs / 1000)}s e foi interrompida.`
        : `ffmpeg falhou: ${stderr.split('\n').filter(Boolean).slice(-3).join(' ') || 'erro desconhecido'}`,
      timedOut ? 'TIMEOUT' : 'FAILED'
    );
  }

  if (!outputPath) {
    // probe: não há arquivo, o valor está na análise do ffmpeg
    const analysis = (stderr || stdout).split('\n').filter(Boolean);
    const duration = /Duration:\s*([0-9:.]+)/.exec(stderr)?.[1] || null;
    const video = /Stream #\d+:\d+.*?: Video: ([^,]+), ([^,]+), ([0-9]+x[0-9]+)/.exec(stderr);
    const audio = /Stream #\d+:\d+.*?: Audio: ([^,]+), ([^,]+?)(?:,|$)/.exec(stderr);

    return {
      ok: true,
      operation: request.operation,
      inputPath: path.relative(WORKSPACE_DIR, inputPath),
      outputPath: null,
      outputName: null,
      sizeBytes: 0,
      durationMs,
      engine: engine.version || 'ffmpeg',
      details: [
        duration ? `Duração: ${duration}` : null,
        video ? `Vídeo: ${video[1].trim()} ${video[3]}` : null,
        audio ? `Áudio: ${audio[1].trim()}` : null,
        ...analysis.slice(-40),
      ]
        .filter(Boolean)
        .join('\n'),
    };
  }

  if (!fs.existsSync(outputPath)) {
    throw new MediaError('ffmpeg terminou sem gerar o arquivo de saída.', 'FAILED');
  }

  const sizeBytes = fs.statSync(outputPath).size;
  if (sizeBytes > MAX_OUTPUT_BYTES) {
    throw new MediaError('A saída ficou maior que o limite de 400 MB.', 'TOO_LARGE');
  }

  return {
    ok: true,
    operation: request.operation,
    inputPath: path.relative(WORKSPACE_DIR, inputPath),
    outputPath: path.relative(WORKSPACE_DIR, outputPath),
    outputName,
    sizeBytes,
    durationMs,
    engine: engine.version || 'ffmpeg',
    details: request.operation === 'probe' ? stdout.slice(-4000) : stderr.slice(-1500) || undefined,
  };
}

/** Salva um arquivo enviado pelo cliente em media/in. */
export function storeUploadedMedia(
  dataUrlOrBase64: string,
  name: string
): { name: string; sizeBytes: number; relativePath: string } {
  ensureMediaDirs();

  const raw = String(dataUrlOrBase64 || '');
  const base64 = raw.includes(',') ? raw.slice(raw.indexOf(',') + 1) : raw;
  if (!base64) throw new MediaError('Conteúdo vazio.', 'BAD_OPTIONS');

  // base64 válido tem só este alfabeto; qualquer outra coisa é recusada.
  if (!/^[A-Za-z0-9+/=\s]+$/.test(base64)) {
    throw new MediaError('Conteúdo não está em base64 válido.', 'BAD_OPTIONS');
  }

  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length > MAX_INPUT_BYTES) {
    throw new MediaError(`Arquivo maior que ${Math.round(MAX_INPUT_BYTES / 1024 / 1024)} MB.`, 'TOO_LARGE');
  }

  const safeName = sanitizeMediaName(name || `upload-${Date.now()}.bin`);
  const target = resolveInside(MEDIA_IN_DIR, safeName);
  fs.writeFileSync(target, buffer);

  return {
    name: safeName,
    sizeBytes: buffer.length,
    relativePath: path.relative(WORKSPACE_DIR, target),
  };
}

/** Lista os arquivos de mídia disponíveis (entrada e saída). */
export function listMediaFiles(): { name: string; relativePath: string; sizeBytes: number; updatedAt: string }[] {
  ensureMediaDirs();
  const files: { name: string; relativePath: string; sizeBytes: number; updatedAt: string }[] = [];

  for (const dir of [MEDIA_IN_DIR, MEDIA_OUT_DIR]) {
    let entries: string[] = [];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry);
      try {
        const stat = fs.statSync(full);
        if (!stat.isFile()) continue;
        files.push({
          name: entry,
          relativePath: path.relative(WORKSPACE_DIR, full),
          sizeBytes: stat.size,
          updatedAt: stat.mtime.toISOString(),
        });
      } catch {
        /* arquivo sumiu no meio da leitura */
      }
    }
  }

  return files.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 200);
}

/**
 * Resolve um arquivo de mídia para download.
 * Aceita "out/audio.mp3", "media/out/audio.mp3" ou só "audio.mp3" (busca em in/ e out/).
 */
export function resolveMediaFile(raw: string): string {
  const cleaned = String(raw || '')
    .replace(/\\/g, '/')
    .replace(/^media\//i, '')
    .replace(/^(\.\.?\/)+/, '')
    .trim();

  if (!cleaned || cleaned.includes('..')) {
    throw new MediaError('Caminho de mídia inválido.', 'BAD_PATH');
  }

  const direct = path.resolve(MEDIA_DIR, cleaned);
  if (!isInside(MEDIA_DIR, direct)) {
    throw new MediaError('Caminho de mídia inválido.', 'BAD_PATH');
  }

  if (isInside(MEDIA_DIR, direct) && fs.existsSync(direct) && fs.statSync(direct).isFile()) {
    return direct;
  }

  for (const dir of [MEDIA_OUT_DIR, MEDIA_IN_DIR]) {
    const candidate = path.join(dir, path.basename(cleaned));
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }

  throw new MediaError('Arquivo não encontrado.', 'BAD_PATH');
}

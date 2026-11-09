import { Router } from 'express';
import express from 'express';
import fs from 'fs';
import path from 'path';
import {
  detectMediaEngine,
  listMediaFiles,
  listMediaOperations,
  MediaError,
  MEDIA_IN_DIR,
  MEDIA_OUT_DIR,
  resolveMediaFile,
  runMediaOperation,
  storeUploadedMedia,
  MAX_INPUT_BYTES,
  type MediaOperation,
} from '../mediaTools.js';

export const mediaRouter = Router();

function sendMediaError(res: any, error: unknown) {
  if (error instanceof MediaError) {
    const status =
      error.code === 'ENGINE_MISSING'
        ? 503
        : error.code === 'BAD_PATH'
        ? 404
        : error.code === 'OUTPUT_EXISTS'
        ? 409
        : error.code === 'TOO_LARGE'
        ? 413
        : error.code === 'TIMEOUT'
        ? 504
        : 400;
    return res.status(status).json({ error: error.message, code: error.code });
  }
  console.error('[media] erro inesperado:', error);
  return res.status(500).json({ error: 'Falha inesperada no motor de mídia.' });
}

/** Estado do motor: se o ffmpeg existe, versão e operações disponíveis. */
mediaRouter.get('/api/media/status', async (req, res) => {
  const engine = await detectMediaEngine(String(req.query.refresh || '') === '1');
  res.json({
    engine,
    maxUploadBytes: MAX_INPUT_BYTES,
    operations: listMediaOperations().map((spec) => ({
      id: spec.id,
      label: spec.label,
      description: spec.description,
      accepts: spec.accepts,
      produces: spec.defaultExtension,
    })),
  });
});

/** Lista arquivos de mídia disponíveis para o agente. */
mediaRouter.get('/api/media/list', (req, res) => {
  res.json({ files: listMediaFiles() });
});

/**
 * Upload de mídia vindo do Data Hub ou do chat.
 * Corpo em base64 (data URL aceito). Parser próprio, com teto maior que o JSON global.
 */
mediaRouter.post(
  '/api/media/upload',
  express.json({ limit: '180mb' }),
  (req, res) => {
    try {
      const { name, data } = req.body || {};
      if (!data || typeof data !== 'string') {
        return res.status(400).json({ error: 'Envie { name, data } com o conteúdo em base64.' });
      }
      if (data.length > MAX_INPUT_BYTES * 1.4) {
        return res.status(413).json({ error: 'Arquivo grande demais para o motor de mídia.' });
      }

      const stored = storeUploadedMedia(data, String(name || `upload-${Date.now()}.bin`));
      return res.json({ success: true, file: stored });
    } catch (error) {
      return sendMediaError(res, error);
    }
  }
);

/** Executa uma operação do ffmpeg. */
mediaRouter.post('/api/media/ffmpeg', async (req, res) => {
  try {
    const { operation, input, output, options, overwrite, timeoutMs } = req.body || {};
    // `file` é o nome que a ação do chat usa; aceita os dois.
    const source = input || (req.body || {}).file || (req.body || {}).filename;

    if (!operation || typeof operation !== 'string') {
      return res.status(400).json({ error: 'Informe a operação (ex: extract_audio).' });
    }

    const result = await runMediaOperation({
      operation: operation as MediaOperation,
      input: String(source || ''),
      output: output ? String(output) : undefined,
      options: options && typeof options === 'object' ? options : {},
      overwrite: Boolean(overwrite),
      timeoutMs: timeoutMs ? Number(timeoutMs) : undefined,
    });

    return res.json({
      success: true,
      ...result,
      downloadUrl: result.outputName
        ? `/api/media/file/out/${encodeURIComponent(result.outputName)}`
        : null,
    });
  } catch (error) {
    return sendMediaError(res, error);
  }
});

/** Download/stream do arquivo resultante. */
mediaRouter.get('/api/media/file/*', (req, res) => {
  try {
    const wildcard = (req.params as Record<string, string>)[0] || '';
    const filePath = resolveMediaFile(decodeURIComponent(wildcard));
    const stat = fs.statSync(filePath);

    res.setHeader('Content-Type', contentTypeOf(filePath));
    res.setHeader('Content-Length', String(stat.size));
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);

    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    return sendMediaError(res, error);
  }
});

function contentTypeOf(filePath: string): string {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const map: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    mkv: 'video/x-matroska',
    mov: 'video/quicktime',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    gif: 'image/gif',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    json: 'application/json',
  };
  return map[ext] || 'application/octet-stream';
}

export const MEDIA_DIRS = { MEDIA_IN_DIR, MEDIA_OUT_DIR };

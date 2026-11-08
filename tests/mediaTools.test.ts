import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  MEDIA_IN_DIR,
  MEDIA_OPERATIONS,
  MEDIA_OUT_DIR,
  MediaError,
  detectMediaEngine,
  isMediaOperation,
  listMediaOperations,
  mediaKindOf,
  resolveInputPath,
  resolveMediaFile,
  runMediaOperation,
  sanitizeMediaName,
  storeUploadedMedia,
} from '../server/mediaTools.js';
import { WORKSPACE_DIR } from '../server/memoryStore.js';

describe('mediaTools: catálogo de operações', () => {
  test('expõe as nove operações com argumentos montáveis', () => {
    const operations = listMediaOperations();
    assert.equal(operations.length, 9);
    for (const spec of operations) {
      assert.ok(spec.label && spec.description);
      assert.ok(spec.accepts.length > 0);
      const args = spec.build({ input: '/tmp/a.mp4', output: `/tmp/out.${spec.defaultExtension}`, options: {} });
      assert.ok(Array.isArray(args) && args.length > 0, `${spec.id} deveria gerar argumentos`);
      assert.ok(!args.some((arg) => arg.includes('&&') || arg.includes('|')), `${spec.id} não pode encadear`);
    }
  });

  test('recusa operação fora da allowlist', () => {
    assert.equal(isMediaOperation('extract_audio'), true);
    for (const bad of ['rm_rf', 'shell', '', 'EXTRACT_AUDIO']) {
      assert.equal(isMediaOperation(bad), false, `não deveria aceitar ${bad}`);
    }
  });
});

describe('mediaTools: montagem de argumentos', () => {
  test('extract_audio gera mp3 sem vídeo', () => {
    const args = MEDIA_OPERATIONS.extract_audio.build({
      input: '/ws/media/in/clipe.mp4',
      output: '/ws/media/out/clipe.mp3',
      options: {},
    });
    assert.ok(args.includes('-vn'));
    assert.ok(args.includes('libmp3lame'));
    assert.equal(args[args.length - 1], '/ws/media/out/clipe.mp3');
  });

  test('metacaracteres de shell ficam presos em um único argumento', () => {
    const evil = '/ws/media/in/$(rm -rf ~).mp4; touch pwned';
    const args = MEDIA_OPERATIONS.thumbnail.build({ input: evil, output: '/ws/media/out/x.jpg', options: {} });
    const inputIndex = args.indexOf('-i');
    assert.equal(args[inputIndex + 1], evil, 'o caminho deve ir intacto como argumento único');
    assert.ok(!args.includes(';'));
  });

  test('valores numéricos são limitados', () => {
    const args = MEDIA_OPERATIONS.compress.build({
      input: '/in.mp4',
      output: '/out.mp4',
      options: { crf: 999, height: 99_999, preset: 'turbo-max' },
    });
    const crf = args[args.indexOf('-crf') + 1];
    assert.equal(crf, '40', 'crf acima do teto vira 40');
    const vf = args[args.indexOf('-vf') + 1];
    assert.equal(vf, 'scale=-2:2160', 'altura limitada a 2160');
    const preset = args[args.indexOf('-preset') + 1];
    assert.equal(preset, 'medium', 'preset inválido cai no padrão');
  });

  test('tempo inválido não vira argumento arbitrário', () => {
    const args = MEDIA_OPERATIONS.thumbnail.build({
      input: '/in.mp4',
      output: '/out.jpg',
      options: { at: '-i /etc/passwd' },
    });
    assert.equal(args[args.indexOf('-ss') + 1], '00:00:01');
  });

  test('convert escolhe o codec pela extensão de saída', () => {
    const webm = MEDIA_OPERATIONS.convert.build({ input: '/in.mp4', output: '/out.webm', options: {} });
    assert.ok(webm.includes('libvpx-vp9'));

    const audio = MEDIA_OPERATIONS.convert.build({ input: '/in.mp4', output: '/out.wav', options: {} });
    assert.ok(audio.includes('pcm_s16le'));

    const mp4 = MEDIA_OPERATIONS.convert.build({ input: '/in.mp4', output: '/out.mp4', options: {} });
    assert.ok(mp4.includes('libx264'));
  });

  test('probe lê metadados com loglevel info e sem arquivo de saída', () => {
    const args = MEDIA_OPERATIONS.probe.build({ input: '/in.mp4', output: '', options: {} });
    assert.ok(args.includes('info'), 'sem info o stderr vem vazio e a análise se perde');
    assert.ok(args.includes('null'), 'a saída é o descarte do ffmpeg');
    assert.equal(MEDIA_OPERATIONS.probe.producesOutput, false);
  });

  test('extract_frames gera uma folha de contato única', () => {
    const args = MEDIA_OPERATIONS.extract_frames.build({
      input: '/in.mp4',
      output: '/out/sheet.jpg',
      options: { fps: 2, columns: 2, rows: 2 },
    });
    assert.match(args[args.indexOf('-vf') + 1], /tile=2x2/);
    assert.equal(args[args.indexOf('-frames:v') + 1], '1');
    assert.equal(args[args.length - 1], '/out/sheet.jpg');
  });

  test('to_gif limita fps e largura', () => {
    const args = MEDIA_OPERATIONS.to_gif.build({
      input: '/in.mp4',
      output: '/out.gif',
      options: { fps: 60, width: 5000 },
    });
    assert.match(args[args.indexOf('-vf') + 1], /fps=30,scale=960/);
  });
});

describe('mediaTools: nomes e caminhos', () => {
  test('sanitiza nome de arquivo hostil', () => {
    assert.equal(sanitizeMediaName('../../etc/passwd'), 'passwd.bin');
    assert.equal(sanitizeMediaName('Vídeo Final.MP4'), 'video-final.mp4');
    assert.equal(sanitizeMediaName('a".mp3'), 'a.mp3');
    assert.equal(sanitizeMediaName(''), 'media.bin');
  });

  test('identifica o tipo pela extensão', () => {
    assert.equal(mediaKindOf('a.mp4'), 'video');
    assert.equal(mediaKindOf('a.MP3'), 'audio');
    assert.equal(mediaKindOf('a.png'), 'image');
    assert.equal(mediaKindOf('a.pdf'), null);
  });

  test('entrada fora de media/ é recusada', () => {
    assert.throws(() => resolveInputPath('../../server.ts'), MediaError);
    assert.throws(() => resolveInputPath('/etc/passwd'), MediaError);
    assert.throws(() => resolveInputPath(''), MediaError);
  });

  test('arquivo inexistente é recusado com mensagem clara', () => {
    assert.throws(
      () => resolveInputPath('nao-existe-123.mp4'),
      (error: unknown) => error instanceof MediaError && /não encontrado/i.test(error.message)
    );
  });

  test('aceita resultado anterior em media/out para encadear operações', () => {
    const previous = path.join(MEDIA_OUT_DIR, 'encadeado.mp3');
    fs.writeFileSync(previous, 'x');
    try {
      assert.equal(resolveInputPath('encadeado.mp3'), previous);
    } finally {
      fs.unlinkSync(previous);
    }
  });

  test('download recusa travessia de caminho', () => {
    assert.throws(() => resolveMediaFile('../../.otto_token'), MediaError);
    assert.throws(() => resolveMediaFile('..%2F..'), MediaError);
  });
});

describe('mediaTools: upload e execução', () => {
  test('recusa base64 inválido', () => {
    assert.throws(
      () => storeUploadedMedia('não é base64 !!!', 'x.mp4'),
      (error: unknown) => error instanceof MediaError && error.code === 'BAD_OPTIONS'
    );
  });

  test('salva upload válido dentro de media/in', () => {
    const payload = Buffer.from('conteudo-de-teste').toString('base64');
    const stored = storeUploadedMedia(`data:video/mp4;base64,${payload}`, 'teste-media.mp4');

    assert.equal(stored.name, 'teste-media.mp4');
    assert.ok(stored.relativePath.startsWith(path.join('media', 'in')));
    const absolute = path.join(WORKSPACE_DIR, stored.relativePath);
    assert.equal(fs.readFileSync(absolute, 'utf-8'), 'conteudo-de-teste');

    // existe de fato e pode ser resolvido para o agente
    assert.equal(resolveInputPath('teste-media.mp4'), absolute);

    fs.unlinkSync(absolute);
  });

  test('sem ffmpeg instalado, o erro ensina como instalar', async () => {
    const engine = await detectMediaEngine();
    if (engine.available) {
      // ambiente com ffmpeg: a validação de caminho continua barrando antes do binário
      await assert.rejects(
        () => runMediaOperation({ operation: 'probe', input: 'nao-existe-abc.mp4' }),
        (error: unknown) => error instanceof MediaError && error.code === 'BAD_PATH'
      );
      return;
    }

    await assert.rejects(
      () => runMediaOperation({ operation: 'extract_audio', input: 'qualquer.mp4' }),
      (error: unknown) =>
        error instanceof MediaError &&
        error.code === 'ENGINE_MISSING' &&
        /instale com|FFMPEG_PATH/i.test(error.message)
    );
  });

  test('operação desconhecida não chega no binário', async () => {
    await assert.rejects(
      () => runMediaOperation({ operation: 'delete_everything' as any, input: 'a.mp4' }),
      (error: unknown) => error instanceof MediaError && error.code === 'BAD_OPERATION'
    );
  });

  test('garante que a pasta de entrada é criada', () => {
    assert.ok(fs.existsSync(MEDIA_IN_DIR));
  });
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLocalReply,
  findMediaFileInPrompt,
  outputExtensionFromPrompt,
  stripAccents,
  trimOptionsFromPrompt,
} from '../server/localBrain.js';

describe('Modo local: normalização e leitura da frase', () => {
  test('tira acento e caixa para casar com o que o usuário digita', () => {
    assert.equal(stripAccents('Olá, você está aí?'), 'ola, voce esta ai?');
    assert.equal(stripAccents('ÁUDIO'), 'audio');
  });

  test('encontra o arquivo citado, sem engolir a palavra anterior', () => {
    assert.equal(findMediaFileInPrompt('extrai o audio do meu-video.mp4', []), 'meu-video.mp4');
    assert.equal(findMediaFileInPrompt('quero o audio de "corta esse.MOV"', []), 'corta esse.MOV');
    assert.equal(findMediaFileInPrompt('faz um gif do clipe final.mov', [{ name: 'clipe final.mov' }]), 'clipe final.mov');
    assert.equal(findMediaFileInPrompt('faz um gif', []), null);
  });

  test('lê a extensão pedida', () => {
    assert.equal(outputExtensionFromPrompt('converte para MP3'), 'mp3');
    assert.equal(outputExtensionFromPrompt('transforma em webm'), 'webm');
    assert.equal(outputExtensionFromPrompt('faz um gif'), null);
  });

  test('interpreta o recorte pedido', () => {
    assert.deepEqual(trimOptionsFromPrompt('corta os primeiros 10 segundos'), { duration: '10' });
    assert.deepEqual(trimOptionsFromPrompt('do 5s ao 20s'), { start: '5', end: '20' });
    assert.deepEqual(trimOptionsFromPrompt('primeiros 2 minutos'), { duration: '120' });
    assert.equal(trimOptionsFromPrompt('corta esse video'), null);
  });
});

describe('Modo local: respostas', () => {
  test('saudação não mente sobre a nuvem', async () => {
    const reply = await buildLocalReply({ prompt: 'oi' });
    assert.equal(reply.degraded, true);
    assert.equal(reply.provider, 'local');
    assert.match(reply.speechResponse, /modo local/i);
    assert.equal(reply.actions[0].action, 'none');
    assert.equal(reply.actions[0].target, 'local');
  });

  test('hora vem do relógio, não inventada', async () => {
    const reply = await buildLocalReply({ prompt: 'que horas são?' });
    assert.match(reply.speechResponse, /Agora são \d{2}:\d{2}/);
  });

  test('identidade explica o que ainda funciona', async () => {
    const reply = await buildLocalReply({ prompt: 'quem é você?', memoriesCount: 3 });
    assert.match(reply.speechResponse, /OTTO/);
    assert.match(reply.speechResponse, /3 memória/);
  });

  test('pergunta que precisa do modelo grande é recusada com honestidade', async () => {
    const reply = await buildLocalReply({ prompt: 'explica a teoria das cordas', reason: 'GROQ_NETWORK_ERROR' });
    assert.match(reply.speechResponse, /Não vou fingir/i);
    assert.match(reply.speechResponse, /GROQ_NETWORK_ERROR/);
  });

  test('comando de mídia vira ação real ou instrução honesta', async () => {
    const reply = await buildLocalReply({ prompt: 'extrai o áudio do amostra.mp4' });
    const media = reply.actions.find((action) => action.action === 'media_ffmpeg');

    if (media) {
      assert.equal(media.parameters.operation, 'extract_audio');
      assert.equal(media.parameters.file, 'amostra.mp4');
      assert.equal(media.parameters.output, 'amostra-extract_audio.mp3');
    } else {
      // sem ffmpeg na máquina o modo local precisa dizer isso, com o comando de instalação
      assert.match(reply.speechResponse, /ffmpeg/i);
      assert.doesNotMatch(reply.speechResponse, /^Peguei/);
    }
  });
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { describeMicEnvironment, describeMicError } from '../src/services/voiceEngine.js';

/**
 * O ambiente do Node não tem window/navigator: os helpers precisam responder sem
 * quebrar (é o mesmo caminho do servidor/SSR) e mapear cada DOMException para uma
 * frase com ação — é isso que o usuário vê quando "o OTTO não ouve".
 */
describe('Microfone: ambiente', () => {
  test('sem window não explode e assume ambiente indisponível', () => {
    const env = describeMicEnvironment();
    assert.equal(env.platform, 'server');
    assert.equal(env.hasMediaDevices, false);
    assert.equal(env.speechApi, false);
  });
});

describe('Microfone: tradução dos erros do navegador', () => {
  test('permissão negada explica onde clicar', () => {
    const text = describeMicError({ name: 'NotAllowedError', message: 'Permission denied' });
    assert.match(text, /bloqueou o microfone/i);
    assert.match(text, /cadeado/i);
  });

  test('sem dispositivo conectado', () => {
    const text = describeMicError({ name: 'NotFoundError' });
    assert.match(text, /Nenhum microfone encontrado/i);
  });

  test('microfone ocupado por outro app', () => {
    const text = describeMicError({ name: 'NotReadableError' });
    assert.match(text, /ocupado/i);
  });

  test('erro de segurança cita página segura', () => {
    const text = describeMicError({ name: 'SecurityError' });
    assert.match(text, /segurança|iframe/i);
  });

  test('erro desconhecido preserva nome e mensagem para diagnóstico', () => {
    const text = describeMicError({ name: 'WeirdError', message: 'something odd' });
    assert.match(text, /WeirdError/);
    assert.match(text, /something odd/);
  });

  test('sem mediaDevices aponta HTTPS quando a página não é segura', () => {
    // no Node o ambiente é sempre "não seguro" e sem mediaDevices
    const text = describeMicError(new Error('sem mediaDevices'));
    assert.match(text, /HTTPS|localhost|navegador/i);
  });
});

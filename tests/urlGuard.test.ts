import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertUrlSyntax,
  isPrivateIp,
  readBodyWithLimit,
  UnsafeUrlError,
  PayloadTooLargeError,
} from '../server/urlGuard.js';

describe('urlGuard: faixas de IP privadas', () => {
  test('reconhece loopback, redes privadas e link-local', () => {
    for (const ip of [
      '127.0.0.1',
      '127.10.20.30',
      '10.0.0.1',
      '172.16.0.1',
      '172.31.255.254',
      '192.168.0.1',
      '169.254.169.254',
      '0.0.0.0',
      '100.64.0.1',
      '198.18.0.1',
      '224.0.0.1',
      '::1',
      '::',
      'fc00::1',
      'fd12:3456::1',
      'fe80::1',
      '::ffff:127.0.0.1',
    ]) {
      assert.equal(isPrivateIp(ip), true, `deveria bloquear ${ip}`);
    }
  });

  test('permite IPs públicos', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '200.147.3.1', '2606:4700:4700::1111']) {
      assert.equal(isPrivateIp(ip), false, `deveria permitir ${ip}`);
    }
  });
});

describe('urlGuard: validação de URL', () => {
  test('aceita http e https públicos', () => {
    assert.equal(assertUrlSyntax('https://upload.wikimedia.org/x.png').hostname, 'upload.wikimedia.org');
    assert.equal(assertUrlSyntax('http://example.com/a.jpg?b=1').protocol, 'http:');
  });

  test('recusa protocolos perigosos', () => {
    for (const url of ['file:///etc/passwd', 'gopher://x', 'data:text/html,<h1>x', 'javascript:alert(1)']) {
      assert.throws(() => assertUrlSyntax(url), UnsafeUrlError, `deveria recusar ${url}`);
    }
  });

  test('recusa host interno e credenciais embutidas', () => {
    for (const url of [
      'http://localhost:3000/api/config',
      'http://127.0.0.1:8080/',
      'http://169.254.169.254/latest/meta-data/',
      'http://metadata.google.internal/computeMetadata/v1/',
      'http://router.local/admin',
      'http://servico.internal/x',
      'http://user:senha@example.com/',
      'http://[::1]:3000/',
    ]) {
      assert.throws(() => assertUrlSyntax(url), UnsafeUrlError, `deveria recusar ${url}`);
    }
  });

  test('não aceita URL malformada', () => {
    assert.throws(() => assertUrlSyntax('nao é url'), UnsafeUrlError);
    assert.throws(() => assertUrlSyntax(''), UnsafeUrlError);
  });
});

describe('urlGuard: leitura com limite', () => {
  test('corta corpos maiores que o teto', async () => {
    const big = new Response('x'.repeat(5000), { headers: { 'content-type': 'text/plain' } });
    await assert.rejects(() => readBodyWithLimit(big, 1000), PayloadTooLargeError);
  });

  test('rejeita cedo pelo content-length', async () => {
    const res = new Response('ok', { headers: { 'content-length': '999999' } });
    await assert.rejects(() => readBodyWithLimit(res, 1000), PayloadTooLargeError);
  });

  test('lê corpos dentro do limite', async () => {
    const res = new Response('conteudo', { headers: { 'content-type': 'text/plain' } });
    const buffer = await readBodyWithLimit(res, 1000);
    assert.equal(buffer.toString(), 'conteudo');
  });
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateExpression } from '../server/mathEval.js';

const val = (expr: string) => evaluateExpression(expr).value;

describe('mathEval: calculadora do agente', () => {
  test('operações básicas', () => {
    assert.equal(val('2 + 2'), 4);
    assert.equal(val('10 - 3.5'), 6.5);
    assert.equal(val('6 * 7'), 42);
    assert.equal(val('9 / 3'), 3);
    assert.equal(val('10 % 3'), 1);
  });

  test('precedência e parênteses', () => {
    assert.equal(val('2 + 3 * 4'), 14);
    assert.equal(val('(2 + 3) * 4'), 20);
    assert.equal(val('-3 + 5'), 2);
  });

  test('^ é exponenciação (não XOR)', () => {
    assert.equal(val('2 ^ 3'), 8);
    assert.equal(val('2 ^ 3 ^ 2'), 512); // associativo à direita
  });

  test('funções e constantes', () => {
    assert.equal(val('sqrt(16)'), 4);
    assert.equal(val('abs(-7)'), 7);
    assert.equal(val('max(3, 9, 1)'), 9);
    assert.equal(Math.round(val('pi') * 100) / 100, 3.14);
  });

  test('rejeita injeção de código', () => {
    for (const evil of [
      'process.exit(1)',
      'require("fs")',
      '1; console.log(1)',
      'constructor.constructor("return 1")()',
      '(()=>{})()',
    ]) {
      const result = evaluateExpression(evil);
      assert.equal(result.value, 0, `deveria recusar: ${evil}`);
      assert.ok(result.error, `deveria reportar erro: ${evil}`);
    }
  });

  test('não quebra com entradas extremas', () => {
    assert.equal(evaluateExpression('').error !== undefined, true);
    assert.equal(evaluateExpression('2 +').error !== undefined, true);
    assert.equal(evaluateExpression('((1+2)').error !== undefined, true);
    assert.equal(evaluateExpression('1e3').value, 1000);
    assert.ok(evaluateExpression('9'.repeat(600)).error);
  });
});

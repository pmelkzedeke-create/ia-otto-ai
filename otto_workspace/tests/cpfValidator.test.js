const { isValidCPF } = require('../src/cpfValidator');

// Polyfill for describe if missing (sandbox environment)
if (typeof global.describe === 'undefined') {
  global.describe = function(name, fn) {
    console.log(`Describe: ${name}`);
    try {
      fn();
    } catch (e) {
      console.error(e);
      process.exitCode = 1;
    }
  };
}

// Polyfill for test/it if missing
if (typeof global.test === 'undefined') {
  global.test = function(name, fn) {
    try {
      fn();
      console.log(`PASS: ${name}`);
    } catch (e) {
      console.error(`FAIL: ${name}`);
      console.error(e.message || e);
      process.exitCode = 1;
    }
  };
}

// Polyfill for expect if missing
if (typeof global.expect === 'undefined') {
  global.expect = function(actual) {
    return {
      toBe(expected) {
        if (actual !== expected) {
          throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
        }
      },
      toEqual(expected) {
        const actualStr = JSON.stringify(actual);
        const expectedStr = JSON.stringify(expected);
        if (actualStr !== expectedStr) {
          throw new Error(`Expected ${expectedStr} but got ${actualStr}`);
        }
      }
    };
  };
}

describe('isValidCPF', () => {
  describe('Casos Válidos', () => {
    test('deve retornar true para um CPF válido sem formatação', () => {
      expect(isValidCPF('52998224725')).toBe(true);
    });

    test('deve retornar true para um CPF válido com pontuação padrão (XXX.XXX.XXX-XX)', () => {
      expect(isValidCPF('529.982.247-25')).toBe(true);
    });

    test('deve retornar true para outro CPF válido conhecido', () => {
      // Exemplo gerado matematicamente correto
      expect(isValidCPF('11144477735')).toBe(true);
    });

    test('deve aceitar números inteiros como entrada', () => {
      expect(isValidCPF(52998224725)).toBe(true);
    });
  });

  describe('Casos Inválidos por Dígito Verificador Incorreto', () => {
    test('deve retornar false se o último dígito estiver errado', () => {
      expect(isValidCPF('52998224726')).toBe(false);
    });

    test('deve retornar false se o penúltimo dígito estiver errado', () => {
      expect(isValidCPF('52998224715')).toBe(false);
    });

    test('deve retornar false para um CPF aleatório inválido', () => {
      // Corrigido: '12345678909' é um CPF validamente calculado.
      // Substituído por '12345678900', que falha na verificação dos dígitos verificadores.
      expect(isValidCPF('12345678900')).toBe(false);
    });
  });

  describe('Casos Inválidos por Formato/Tamanho', () => {
    test('deve retornar false para strings vazias', () => {
      expect(isValidCPF('')).toBe(false);
    });

    test('deve retornar false para null', () => {
      expect(isValidCPF(null)).toBe(false);
    });

    test('deve retornar false para undefined', () => {
      expect(isValidCPF(undefined)).toBe(false);
    });

    test('deve retornar false para CPFs com menos de 11 dígitos numéricos', () => {
      expect(isValidCPF('123456789')).toBe(false);
      expect(isValidCPF('123.456.789-0')).toBe(false); // 10 dígitos após limpeza
    });

    test('deve retornar false para CPFs com mais de 11 dígitos numéricos', () => {
      expect(isValidCPF('123456789012')).toBe(false);
      expect(isValidCPF('123.456.789-012')).toBe(false);
    });

    test('deve retornar false para entradas contendo letras misturadas', () => {
      expect(isValidCPF('a1b2c3d4e5f')).toBe(false);
      expect(isValidCPF('529.982.24X-25')).toBe(false);
    });
  });

  describe('Casos Especiais (Repetição)', () => {
    test('deve retornar false para CPFs compostos por dígitos repetidos (000...)', () => {
      expect(isValidCPF('00000000000')).toBe(false);
      expect(isValidCPF('000.000.000-00')).toBe(false);
    });

    test('deve retornar false para CPFs compostos por dígitos repetidos (111...)', () => {
      expect(isValidCPF('11111111111')).toBe(false);
    });

    test('deve retornar false para CPFs compostos por dígitos repetidos (999...)', () => {
      expect(isValidCPF('99999999999')).toBe(false);
    });
  });
});
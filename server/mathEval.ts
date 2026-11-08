/**
 * Avaliador matemático seguro (sem eval / new Function).
 *
 * Suporta: + - * / % ^ ( ) , números decimais e notação científica,
 * constantes (pi, e) e funções (sqrt, abs, sin, cos, tan, log, ln,
 * round, floor, ceil, min, max).
 *
 * `^` é exponenciação (diferente do XOR do JavaScript).
 */

export class MathEvaluationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MathEvaluationError';
  }
}

type Token =
  | { type: 'number'; value: number }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'comma' };

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  log: Math.log10,
  ln: Math.log,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  min: Math.min,
  max: Math.max,
};

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
};

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (/\s/.test(char)) {
      i += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let literal = '';
      while (i < input.length && /[0-9._]/.test(input[i])) {
        if (input[i] !== '_') literal += input[i];
        i += 1;
      }
      // notação científica: 1e3, 2.5e-4
      if (i < input.length && /[eE]/.test(input[i]) && /[0-9+-]/.test(input[i + 1] || '')) {
        literal += input[i];
        i += 1;
        if (/[+-]/.test(input[i])) {
          literal += input[i];
          i += 1;
        }
        while (i < input.length && /[0-9]/.test(input[i])) {
          literal += input[i];
          i += 1;
        }
      }
      const value = Number(literal);
      if (!Number.isFinite(value)) throw new MathEvaluationError(`Número inválido: "${literal}"`);
      tokens.push({ type: 'number', value });
      continue;
    }

    if (/[a-zA-Z]/.test(char)) {
      let name = '';
      while (i < input.length && /[a-zA-Z]/.test(input[i])) {
        name += input[i];
        i += 1;
      }
      tokens.push({ type: 'ident', value: name.toLowerCase() });
      continue;
    }

    if ('+-*/%^'.includes(char)) {
      tokens.push({ type: 'op', value: char });
      i += 1;
      continue;
    }
    if (char === '(') {
      tokens.push({ type: 'lparen' });
      i += 1;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'rparen' });
      i += 1;
      continue;
    }
    if (char === ',') {
      tokens.push({ type: 'comma' });
      i += 1;
      continue;
    }

    throw new MathEvaluationError(`Caractere não permitido: "${char}"`);
  }

  return tokens;
}

class Parser {
  private position = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): number {
    const value = this.parseExpression();
    if (this.position < this.tokens.length) {
      throw new MathEvaluationError('Sobrou conteúdo não interpretado na expressão.');
    }
    if (!Number.isFinite(value)) throw new MathEvaluationError('Resultado não numérico.');
    return value;
  }

  private peek(): Token | undefined {
    return this.tokens[this.position];
  }

  private consume(): Token {
    const token = this.tokens[this.position];
    if (!token) throw new MathEvaluationError('Expressão incompleta.');
    this.position += 1;
    return token;
  }

  private parseExpression(): number {
    let value = this.parseTerm();
    for (;;) {
      const token = this.peek();
      if (token?.type === 'op' && (token.value === '+' || token.value === '-')) {
        this.consume();
        const rhs = this.parseTerm();
        value = token.value === '+' ? value + rhs : value - rhs;
        continue;
      }
      return value;
    }
  }

  private parseTerm(): number {
    let value = this.parseUnary();
    for (;;) {
      const token = this.peek();
      if (token?.type === 'op' && ['*', '/', '%'].includes(token.value)) {
        this.consume();
        const rhs = this.parseUnary();
        if (token.value === '*') value *= rhs;
        else if (token.value === '/') value /= rhs;
        else value %= rhs;
        continue;
      }
      return value;
    }
  }

  private parseUnary(): number {
    const token = this.peek();
    if (token?.type === 'op' && (token.value === '-' || token.value === '+')) {
      this.consume();
      const value = this.parseUnary();
      return token.value === '-' ? -value : value;
    }
    return this.parsePower();
  }

  private parsePower(): number {
    const base = this.parsePrimary();
    const token = this.peek();
    if (token?.type === 'op' && token.value === '^') {
      this.consume();
      const exponent = this.parseUnary(); // associativo à direita
      return base ** exponent;
    }
    return base;
  }

  private parsePrimary(): number {
    const token = this.consume();

    if (token.type === 'number') return token.value;

    if (token.type === 'lparen') {
      const value = this.parseExpression();
      const closing = this.consume();
      if (closing.type !== 'rparen') throw new MathEvaluationError('Parêntese não fechado.');
      return value;
    }

    if (token.type === 'ident') {
      const next = this.peek();
      if (next?.type === 'lparen') {
        this.consume();
        const args: number[] = [];
        if (this.peek()?.type !== 'rparen') {
          args.push(this.parseExpression());
          while (this.peek()?.type === 'comma') {
            this.consume();
            args.push(this.parseExpression());
          }
        }
        const closing = this.consume();
        if (closing.type !== 'rparen') throw new MathEvaluationError('Parêntese não fechado.');

        const fn = FUNCTIONS[token.value];
        if (!fn) throw new MathEvaluationError(`Função desconhecida: ${token.value}()`);
        return fn(...args);
      }

      if (token.value in CONSTANTS) return CONSTANTS[token.value];
      throw new MathEvaluationError(`Identificador desconhecido: ${token.value}`);
    }

    throw new MathEvaluationError('Expressão matemática inválida.');
  }
}

export interface MathResult {
  value: number;
  error?: string;
}

export function evaluateExpression(expression: string): MathResult {
  if (!expression || typeof expression !== 'string') {
    return { value: 0, error: 'Expressão vazia.' };
  }
  if (expression.length > 500) {
    return { value: 0, error: 'Expressão muito longa.' };
  }

  try {
    const tokens = tokenize(expression);
    if (tokens.length === 0) return { value: 0, error: 'Expressão vazia.' };
    return { value: new Parser(tokens).parse() };
  } catch (err) {
    return { value: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

// Real Tool Executor for Groq Tool Calling Architecture
// Handles search_web, calculator, read_file, write_file, create_folder, execute_command

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CodeSandbox } from './codeSandbox.js';
import { isCommandAllowed } from './security.js';
import { isInside } from './paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_DIR = path.resolve(__dirname, '..', 'otto_workspace');

export interface ToolExecutionResult {
  toolName: string;
  success: boolean;
  result: any;
  error?: string;
}

export interface WebSearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Executa uma busca REAL no DuckDuckGo (JSON API & HTML fallback) sem requisições simuladas.
 * Retorna os primeiros resultados estruturados ou lança erro real se a requisição falhar.
 */
export async function executeRealDuckDuckGoSearch(query: string): Promise<WebSearchResultItem[]> {
  const trimmedQuery = (query || '').trim();
  if (!trimmedQuery) {
    throw new Error('Consulta de pesquisa não fornecida.');
  }

  const results: WebSearchResultItem[] = [];

  // 1. Consulta DuckDuckGo Instant Answer API (JSON estruturado)
  try {
    const jsonUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(trimmedQuery)}&format=json&no_redirect=1&no_html=1`;
    const jsonRes = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (jsonRes.ok) {
      const data = await jsonRes.json();

      if (data.Heading && (data.AbstractText || data.AbstractURL)) {
        results.push({
          title: data.Heading,
          url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(trimmedQuery)}`,
          snippet: data.AbstractText || data.Heading,
        });
      }

      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics) {
          if (topic.Text && topic.FirstURL) {
            const title = topic.Text.split(' - ')[0] || topic.Text;
            results.push({
              title,
              url: topic.FirstURL,
              snippet: topic.Text,
            });
          } else if (Array.isArray(topic.Topics)) {
            for (const sub of topic.Topics) {
              if (sub.Text && sub.FirstURL) {
                results.push({
                  title: sub.Text.split(' - ')[0] || sub.Text,
                  url: sub.FirstURL,
                  snippet: sub.Text,
                });
              }
            }
          }
          if (results.length >= 5) break;
        }
      }

      if (Array.isArray(data.Results)) {
        for (const r of data.Results) {
          if (r.FirstURL && r.Text) {
            results.push({
              title: r.Text.split(' - ')[0] || r.Text,
              url: r.FirstURL,
              snippet: r.Text,
            });
          }
          if (results.length >= 5) break;
        }
      }
    }
  } catch (err: any) {
    console.warn(`[search_web] Aviso ao consultar API JSON DuckDuckGo: ${err?.message || String(err)}`);
  }

  // 2. Se não obtiver 5 resultados, tenta buscar via endpoint HTML
  if (results.length < 5) {
    try {
      const htmlUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(trimmedQuery)}`;
      const htmlRes = await fetch(htmlUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/html',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (htmlRes.ok) {
        const html = await htmlRes.text();
        // Regex para capturar links e snippets na página HTML do DuckDuckGo
        const regex = /<a[^>]+class=[\x27"]result__url[\x27"][^>]*href=[\x27"]([^"\x27]+)[\x27"][\s\S]*?<a[^>]+class=[\x27"]result__snippet[\x27"][^>]*>([\s\S]*?)<\/a>/gi;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(html)) !== null && results.length < 5) {
          const rawUrl = match[1].trim();
          const cleanSnippet = match[2].replace(/<[^>]+>/g, '').trim();
          results.push({
            title: trimmedQuery,
            url: rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl,
            snippet: cleanSnippet,
          });
        }
      }
    } catch (err: any) {
      console.warn(`[search_web] Aviso ao consultar endpoint HTML DuckDuckGo: ${err?.message || String(err)}`);
    }
  }

  if (results.length === 0) {
    throw new Error(`A busca no DuckDuckGo não retornou nenhum resultado para a consulta: "${trimmedQuery}".`);
  }

  return results.slice(0, 5);
}

export async function executeGroqTool(name: string, rawArgs: string | Record<string, any>): Promise<ToolExecutionResult> {
  let args: Record<string, any> = {};
  if (typeof rawArgs === 'string') {
    try {
      args = JSON.parse(rawArgs);
    } catch {
      args = { query: rawArgs };
    }
  } else {
    args = rawArgs || {};
  }

  try {
    switch (name) {
      case 'search_web': {
        const query = args.query || args.q || '';
        if (!query) {
          return {
            toolName: 'search_web',
            success: false,
            result: null,
            error: 'Termo de pesquisa vazio. Forneça uma query válida.',
          };
        }

        try {
          const realResults = await executeRealDuckDuckGoSearch(query);
          return {
            toolName: 'search_web',
            success: true,
            result: {
              query,
              provider: 'DuckDuckGo',
              count: realResults.length,
              results: realResults,
            },
          };
        } catch (searchError: any) {
          return {
            toolName: 'search_web',
            success: false,
            result: null,
            error: `Falha na busca web externa: ${searchError?.message || String(searchError)}`,
          };
        }
      }

      case 'calculator': {
        const expr = args.expression || args.expr || '0';
        // Safe math evaluation
        const sanitized = expr.replace(/[^0-9+\-*/().\s^%sqrt]/g, '');
        let value: number = 0;
        try {
          const fn = new Function(`return (${sanitized.replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)')})`);
          value = fn();
        } catch {
          value = 0;
        }

        return {
          toolName: 'calculator',
          success: true,
          result: {
            expression: expr,
            evaluatedResult: value,
          },
        };
      }

      case 'read_file': {
        const filename = args.filename || args.path || '';
        if (!filename) {
          return { toolName: 'read_file', success: false, result: null, error: 'Nome do arquivo não fornecido.' };
        }

        const normalized = filename.replace(/\\/g, '/').replace(/^\/+/, '');
        const fullPath = path.resolve(WORKSPACE_DIR, normalized);

        if (!isInside(WORKSPACE_DIR, fullPath)) {
          return { toolName: 'read_file', success: false, result: null, error: 'Acesso fora do workspace negado.' };
        }

        if (!fs.existsSync(fullPath)) {
          return { toolName: 'read_file', success: false, result: null, error: `Arquivo '${normalized}' não existe no workspace.` };
        }

        const content = fs.readFileSync(fullPath, 'utf-8');
        return {
          toolName: 'read_file',
          success: true,
          result: {
            filename: normalized,
            sizeBytes: fs.statSync(fullPath).size,
            content,
          },
        };
      }

      case 'write_file': {
        const filename = args.filename || args.path || '';
        const content = args.content || '';

        if (!filename) {
          return { toolName: 'write_file', success: false, result: null, error: 'Nome de arquivo obrigatório.' };
        }

        const normalized = filename.replace(/\\/g, '/').replace(/^\/+/, '');
        const fullPath = path.resolve(WORKSPACE_DIR, normalized);

        if (!isInside(WORKSPACE_DIR, fullPath)) {
          return { toolName: 'write_file', success: false, result: null, error: 'Acesso fora do workspace negado.' };
        }

        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(fullPath, content, 'utf-8');
        return {
          toolName: 'write_file',
          success: true,
          result: {
            filename: normalized,
            savedPath: fullPath,
            sizeBytes: Buffer.byteLength(content, 'utf-8'),
          },
        };
      }

      case 'create_folder': {
        const folderName = args.name || args.folderName || 'nova_pasta';
        const sanitized = folderName.replace(/[<>:"/\\|?*]/g, '').trim();
        const fullPath = path.resolve(WORKSPACE_DIR, sanitized);

        if (!isInside(WORKSPACE_DIR, fullPath)) {
          return { toolName: 'create_folder', success: false, result: null, error: 'Acesso negado fora do workspace.' };
        }

        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
        }

        return {
          toolName: 'create_folder',
          success: true,
          result: {
            folderName: sanitized,
            createdPath: fullPath,
          },
        };
      }

      case 'execute_command': {
        const cmd = (args.command || args.cmd || '').trim();
        if (!cmd) {
          return { toolName: 'execute_command', success: false, result: null, error: 'Comando ausente.' };
        }

        // 1. Verificação por Lista Branca (Whitelist)
        if (!isCommandAllowed(cmd)) {
          return {
            toolName: 'execute_command',
            success: false,
            result: null,
            error: 'Comando bloqueado pela política de segurança (whitelist). Permitidos: ls, cat, pwd, echo, mkdir, node, python3, git status, git log, npm, bun.',
          };
        }

        // 2. Execução isolada em CodeSandbox (/tmp, timeout estrito, ambiente limpo)
        const sbResult = await CodeSandbox.executeCommand(cmd, 10000);
        return {
          toolName: 'execute_command',
          success: sbResult.success,
          result: {
            command: cmd,
            stdout: sbResult.stdout,
            stderr: sbResult.stderr,
            exitCode: sbResult.exitCode,
            runtimeUsed: sbResult.runtimeUsed,
            executionTimeMs: sbResult.executionTimeMs,
          },
          error: !sbResult.success ? (sbResult.error || sbResult.stderr) : undefined,
        };
      }

      default:
        return {
          toolName: name,
          success: false,
          result: null,
          error: `Ferramenta '${name}' não reconhecida.`,
        };
    }
  } catch (err: any) {
    return {
      toolName: name,
      success: false,
      result: null,
      error: `Erro ao executar ferramenta '${name}': ${err?.message || String(err)}`,
    };
  }
}

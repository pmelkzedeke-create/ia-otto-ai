import { Router } from 'express';
import { CodeSandbox } from '../codeSandbox.js';
import { isCommandAllowed } from '../security.js';

export const sandboxRouter = Router();

// 1. Execução de código no CodeSandbox isolado
sandboxRouter.post('/api/sandbox/execute', async (req, res) => {
  try {
    const { code, language, filename, projectFiles, timeoutMs, memoryLimitMb, stdin } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Código não fornecido para execução.',
      });
    }

    if (!language || typeof language !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Linguagem de programação não especificada.',
      });
    }

    const result = await CodeSandbox.execute({
      code,
      language,
      filename,
      projectFiles,
      timeoutMs: typeof timeoutMs === 'number' ? Math.min(timeoutMs, 30000) : 15000,
      memoryLimitMb,
      stdin,
    });

    res.json(result);
  } catch (err: any) {
    console.error('Erro na execução do sandbox:', err);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao processar execução no sandbox isolado.',
      details: err?.message || String(err),
    });
  }
});

// 2. Execução de comandos no Terminal (Lista Branca + CodeSandbox isolado em /tmp)
sandboxRouter.post('/api/terminal/execute', async (req, res) => {
  try {
    const { command } = req.body;
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ error: 'Comando ausente ou inválido.' });
    }

    const trimmed = command.trim();

    // 1. Validação por Lista Branca (Whitelist)
    if (!isCommandAllowed(trimmed)) {
      return res.status(403).json({
        error: 'Comando não permitido pela política de segurança (whitelist). Comandos permitidos: ls, cat, pwd, echo, mkdir, node, python3, git status, git log, npm, bun.',
      });
    }

    // 2. Execução em CodeSandbox isolado em /tmp com timeout e ambiente limpo
    const result = await CodeSandbox.executeCommand(trimmed, 10000);

    res.json({
      command: trimmed,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      exitCode: result.exitCode,
      success: result.success,
      executionTimeMs: result.executionTimeMs,
      error: !result.success ? (result.error || result.stderr || null) : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro de execução no terminal', details: err?.message || String(err) });
  }
});

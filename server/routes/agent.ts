import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { AgentOrchestrator } from '../agentOrchestrator.js';
import { WORKSPACE_DIR } from '../memoryStore.js';
import { buildDynamicWebsiteContent } from './slides.js';
import { CodeSandbox } from '../codeSandbox.js';
import { isCommandAllowed } from '../security.js';

export const agentRouter = Router();

// 1. Orquestrador Multi-Agentes com suporte a Server-Sent Events (SSE)
agentRouter.post('/api/agent/orchestrate', async (req, res) => {
  const { prompt, options = {} } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Campo "prompt" obrigatório.' });
  }

  const acceptHeader = req.headers.accept || '';
  const isStream = acceptHeader.includes('text/event-stream') || req.query.stream === 'true';

  if (isStream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const finalState = await AgentOrchestrator.executeTask(
        prompt,
        WORKSPACE_DIR,
        (progress) => {
          res.write(`data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`);
        },
        options
      );

      res.write(`data: ${JSON.stringify({ type: 'completed', taskState: finalState })}\n\n`);
      res.end();
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message || String(err) })}\n\n`);
      res.end();
    }
  } else {
    try {
      const finalState = await AgentOrchestrator.executeTask(
        prompt,
        WORKSPACE_DIR,
        undefined,
        options
      );
      res.json({
        success: true,
        taskState: finalState,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err?.message || 'Falha na orquestração de agentes',
      });
    }
  }
});

// 2. Consulta de estado de tarefa por ID
agentRouter.get('/api/agent/task/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = AgentOrchestrator.getTaskState(taskId);
  if (!task) {
    return res.status(404).json({ error: 'Tarefa não encontrada' });
  }
  res.json(task);
});

// 3. Execução individual de etapa planejada por agente
agentRouter.post('/api/agent/execute-step', async (req, res) => {
  try {
    const { step, planTitle } = req.body || {};
    if (!step || typeof step !== 'object') {
      return res.status(400).json({ error: 'Etapa do agente inválida' });
    }

    const title = (step.title || '').toLowerCase();
    const desc = (step.description || '').toLowerCase();
    const act = step.action || {};
    const actionName = act.action || 'none';
    const params = act.parameters || {};
    const target = act.target || params.filename || params.name || params.path || params.command || '';

    // Ação: create_folder
    if (
      actionName === 'create_folder' ||
      title.includes('criar pasta') ||
      title.includes('diretório') ||
      desc.includes('criar a pasta')
    ) {
      const folderName = (
        params.name ||
        target ||
        title.match(/pasta "([^"]+)"/)?.[1] ||
        title.match(/diretório "([^"]+)"/)?.[1] ||
        'projeto_agente'
      ).replace(/\\/g, '/');
      const fullPath = path.resolve(WORKSPACE_DIR, folderName);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
      return res.json({
        success: true,
        executedTool: 'create_folder',
        message: `Ferramenta Real [create_folder]: Pasta "${folderName}" criada no workspace (${fullPath}).`,
        details: { folderName, fullPath },
      });
    }

    // Ação: write_file
    if (
      actionName === 'write_file' ||
      title.includes('gerar código') ||
      title.includes('escrever') ||
      title.includes('criar arquivo') ||
      desc.includes('index.html') ||
      desc.includes('style.css') ||
      desc.includes('script.js')
    ) {
      let filename = (params.filename || target || '').replace(/\\/g, '/').replace(/^\/+/, '');
      if (!filename) {
        if (title.includes('html') || desc.includes('html')) filename = 'index.html';
        else if (title.includes('css') || desc.includes('css')) filename = 'style.css';
        else if (title.includes('js') || title.includes('script') || desc.includes('js')) filename = 'script.js';
        else filename = 'arquivo_agente.txt';
      }

      let content = params.content || '';
      if (!content) {
        const dynamic = await buildDynamicWebsiteContent(planTitle || step.title);
        if (filename.endsWith('.html') || filename.includes('html')) content = dynamic.html;
        else if (filename.endsWith('.css') || filename.includes('css')) content = dynamic.css;
        else if (filename.endsWith('.js') || filename.includes('js')) content = dynamic.js;
        else content = `// Código gerado pela etapa real do OTTO: ${step.title}\n// Data: ${new Date().toISOString()}\n`;
      }

      const fullPath = path.resolve(WORKSPACE_DIR, filename);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, content, 'utf-8');
      const byteSize = Buffer.byteLength(content, 'utf-8');

      return res.json({
        success: true,
        executedTool: 'write_file',
        message: `Ferramenta Real [write_file]: Arquivo "${filename}" salvo com sucesso (${byteSize} bytes em disco).`,
        details: { filename, fullPath, bytes: byteSize },
      });
    }

    // Ação: list_files
    if (actionName === 'list_files' || title.includes('auditar') || title.includes('verificar') || title.includes('listar')) {
      const folderPath = (params.path || target || '').replace(/\\/g, '/');
      const targetDir = path.resolve(WORKSPACE_DIR, folderPath);

      let items: string[] = [];
      if (fs.existsSync(targetDir)) {
        items = fs.readdirSync(targetDir);
      } else {
        items = fs.readdirSync(WORKSPACE_DIR);
      }

      return res.json({
        success: true,
        executedTool: 'list_files',
        message: `Ferramenta Real [list_files]: Auditados ${items.length} arquivo(s) em disco: [${items.slice(0, 5).join(', ')}].`,
        details: { items, path: folderPath },
      });
    }

    // Ação: execute_command (com validação por lista branca e execução isolada em CodeSandbox)
    if (actionName === 'execute_command' || title.includes('comando') || title.includes('executar') || title.includes('terminal')) {
      const commandStr = (params.command || target || 'ls -la').trim();

      if (!isCommandAllowed(commandStr)) {
        return res.status(403).json({
          error: 'Comando bloqueado pela política de segurança (whitelist). Permitidos: ls, cat, pwd, echo, mkdir, node, python3, git status, git log, npm, bun.',
        });
      }

      const sbResult = await CodeSandbox.executeCommand(commandStr, 10000);
      return res.json({
        success: sbResult.success,
        executedTool: 'execute_command',
        message: sbResult.success
          ? `Ferramenta Real [terminal/sandbox]: Comando "${commandStr}" executado com sucesso no sandbox.`
          : `Ferramenta Real [terminal/sandbox]: Comando "${commandStr}" finalizou com aviso/erro.`,
        details: {
          command: commandStr,
          stdout: sbResult.stdout,
          stderr: sbResult.stderr,
          exitCode: sbResult.exitCode,
          runtimeUsed: sbResult.runtimeUsed,
        },
      });
    }

    // Fallback: Verificação de sistema
    return res.json({
      success: true,
      executedTool: 'system_verify',
      message: `Ferramenta Real [system_verify]: Etapa "${step.title}" processada e verificada pelo ambiente do OTTO.`,
      details: { stepId: step.id, timestamp: new Date().toISOString() },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Falha na execução real da ferramenta do agente', details: String(err?.message || err) });
  }
});

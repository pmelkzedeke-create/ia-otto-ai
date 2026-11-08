import { Router } from 'express';
import os from 'os';
import { GroqService } from '../groqService.js';
import { TextCodeProvider } from '../textCodeProvider.js';
import { TaskRouter } from '../taskRouter.js';
import { WORKSPACE_DIR } from '../memoryStore.js';

export const configRouter = Router();

// 1. Health check do servidor
configRouter.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    version: '2.5.0-futuristic',
    providers: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      groq: Boolean(process.env.GROQ_API_KEY),
      primaryModel: GroqService.DEFAULT_MODEL,
    },
    systemBridge: 'active',
    workspacePath: WORKSPACE_DIR,
  });
});

// 2. Status do Groq
configRouter.get('/api/groq/status', (req, res) => {
  res.json({
    configured: Boolean(process.env.GROQ_API_KEY),
    provider: process.env.AI_PROVIDER || 'groq',
    model: GroqService.DEFAULT_MODEL,
    endpoint: 'https://api.groq.com/openai/v1',
    status: Boolean(process.env.GROQ_API_KEY) ? 'ready' : 'missing_api_key',
  });
});

// 3. Status do TextCodeProvider (Rota B)
configRouter.get('/api/text-code/status', (req, res) => {
  res.json(TextCodeProvider.getStatus());
});

// 4. Configuração em tempo de execução da Rota B
configRouter.post('/api/text-code/config', (req, res) => {
  const { apiKey, apiUrl, model } = req.body || {};
  TextCodeProvider.setRuntimeConfig({ apiKey, apiUrl, model });
  res.json({
    success: true,
    message: 'Configuração da API de Texto & Código (ROTA B) atualizada com sucesso no servidor.',
    status: TextCodeProvider.getStatus(),
  });
});

// 5. Roteamento de intenção (TaskRouter)
configRouter.post('/api/text-code/route-check', (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Campo "prompt" obrigatório' });
  }
  const decision = TaskRouter.evaluate(prompt);
  res.json(decision);
});

// 6. Informações de Telemetria e Hardware do Sistema Operacional
configRouter.get('/api/system/info', (req, res) => {
  try {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = Math.round((usedMem / totalMem) * 100);

    const loadAvg = os.loadavg();
    const cpuUsagePercent = Math.min(
      100,
      Math.round((loadAvg[0] / Math.max(1, cpus.length)) * 100) || 28
    );

    res.json({
      platform: os.platform(),
      release: os.release(),
      type: os.type(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptimeSeconds: os.uptime(),
      cpuModel: cpus[0]?.model || 'Processor',
      cpuCores: cpus.length,
      cpuUsagePercent,
      totalMemoryBytes: totalMem,
      freeMemoryBytes: freeMem,
      usedMemoryBytes: usedMem,
      memoryUsagePercent: memUsagePercent,
      nodeVersion: process.version,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao obter status do sistema', details: String(err) });
  }
});

import { Router } from 'express';
import os from 'os';
import { GroqService } from '../groqService.js';
import { TextCodeProvider } from '../textCodeProvider.js';
import {
  clearProviderConfig,
  currentProviderKey,
  fetchProviderModels,
  previewKey,
  ProviderError,
  publicProviderStatus,
  saveProviderConfig,
} from '../providerConfig.js';
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
  const configured = Boolean(process.env.GROQ_API_KEY);

  res.json({
    configured,
    provider: process.env.AI_PROVIDER || 'groq',
    model: GroqService.DEFAULT_MODEL,
    fastModel: GroqService.FAST_MODEL,
    endpoint: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
    keyPreview: configured ? `${String(process.env.GROQ_API_KEY).slice(0, 6)}…${String(process.env.GROQ_API_KEY).slice(-4)}` : null,
    status: configured ? 'ready' : 'missing_api_key',
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

// ---------------------------------------------------------------------------
// Provedor de IA configurável pela interface
// ---------------------------------------------------------------------------

// 12. Estado atual do provedor (sem expor a chave)
configRouter.get('/api/provider', (req, res) => {
  res.json(publicProviderStatus());
});

// 13. Testa URL + chave e devolve os modelos disponíveis
configRouter.post('/api/provider/test', async (req, res) => {
  const { baseUrl, apiKey, timeoutMs } = req.body || {};

  try {
    const result = await fetchProviderModels({
      baseUrl: String(baseUrl || ''),
      apiKey: String(apiKey || ''),
      // Campo vazio = "use a chave que já está configurada".
      fallbackKey: currentProviderKey(),
      timeoutMs: timeoutMs ? Number(timeoutMs) : undefined,
    });

    return res.json({
      ok: true,
      baseUrl: result.baseUrl,
      total: result.models.length,
      models: result.models,
      usedKeyPreview: result.usedKeyPreview,
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      const status = error.code === 'TIMEOUT' ? 504 : error.code === 'NETWORK' ? 502 : 400;
      return res.status(status).json({
        ok: false,
        code: error.code,
        error: error.message,
        hint: error.hint,
        triedUrl: error.triedUrl,
        usedKeyPreview: previewKey(String(apiKey || '') || currentProviderKey()),
      });
    }
    console.error('[ProviderTest] erro inesperado:', error);
    return res.status(500).json({ ok: false, error: 'Falha inesperada ao testar o provedor.' });
  }
});

// 14. Salva e passa a usar o provedor/modelo escolhido
configRouter.post('/api/provider/apply', (req, res) => {
  const { baseUrl, apiKey, model } = req.body || {};

  try {
    const config = saveProviderConfig({
      baseUrl: String(baseUrl || ''),
      apiKey: String(apiKey || ''),
      model: String(model || ''),
    });

    // Modelo novo, vida nova: limpa o cooldown de uma falha anterior.
    GroqService.resetCooldown();

    console.log(`[Provider] Configurado pela interface: ${config.model} @ ${config.baseUrl}`);
    return res.json({
      ok: true,
      status: publicProviderStatus(),
      message: `Agora usando ${config.model}.`,
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      return res.status(400).json({ ok: false, code: error.code, error: error.message });
    }
    console.error('[ProviderApply] erro inesperado:', error);
    return res.status(500).json({ ok: false, error: 'Não consegui salvar a configuração.' });
  }
});

// 15. Volta para o .env (descarta a configuração feita pela interface)
configRouter.delete('/api/provider', (req, res) => {
  clearProviderConfig();
  GroqService.resetCooldown();
  res.json({ ok: true, status: publicProviderStatus() });
});

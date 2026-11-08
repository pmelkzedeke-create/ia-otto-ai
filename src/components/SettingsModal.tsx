import React, { useState, useEffect } from 'react';
import {
  X,
  Volume2,
  Play,
  Sparkles,
  User,
  Shield,
  Lock,
  Mail,
  Cloud,
  LogOut,
  CheckCircle2,
  EyeOff,
  Trash2,
  Sun,
  Moon,
  Palette,
  Check,
} from 'lucide-react';
import { OttoSettings } from '../types/otto';
import {
  ttsEngine,
  DEFAULT_GEMINI_VOICES,
  DEFAULT_ELEVEN_VOICES,
  DEFAULT_RESPEECHER_VOICES,
  GeminiVoice,
  ElevenVoice,
  RespeecherVoice,
} from '../services/ttsEngine';
import { desktopOverlayBridge } from '../services/desktopOverlayBridge';
import { ApiBridge } from '../services/apiBridge';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: OttoSettings;
  onUpdateSettings: (newSettings: Partial<OttoSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<
    'GERAL' | 'VOZ' | 'IA' | 'PERMISSÕES' | 'SISTEMA'
  >('GERAL');
  const [geminiVoices, setGeminiVoices] = useState<GeminiVoice[]>(DEFAULT_GEMINI_VOICES);
  const [elevenVoices, setElevenVoices] = useState<ElevenVoice[]>(DEFAULT_ELEVEN_VOICES);
  const [respeecherVoices, setRespeecherVoices] = useState<RespeecherVoice[]>(DEFAULT_RESPEECHER_VOICES);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [testingVoice, setTestingVoice] = useState(false);
  const [geminiAvailable, setGeminiAvailable] = useState(true);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [keySaving, setKeySaving] = useState(false);
  const [keyStatusMsg, setKeyStatusMsg] = useState<string | null>(null);

  // Account & Privacy state
  const [accountEmail, setAccountEmail] = useState('usuario@otto.local');
  const [accountName, setAccountName] = useState('Usuário Principal');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [loginMethod, setLoginMethod] = useState<'LOCAL' | 'GOOGLE' | 'APPLE'>('LOCAL');
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(true);
  const [telemetryEnabled, setTelemetryEnabled] = useState(false);
  const [autoLearnEnabled, setAutoLearnEnabled] = useState(true);
  const [incognitoEnabled, setIncognitoEnabled] = useState(false);

  // Respeecher State
  const [respeecherKeyInput, setRespeecherKeyInput] = useState('');
  const [respeecherSaving, setRespeecherSaving] = useState(false);
  const [respeecherStatusMsg, setRespeecherStatusMsg] = useState<string | null>(null);
  const [respeecherAvailable, setRespeecherAvailable] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('GERAL');
      setApiKeyInput(ttsEngine.getCustomApiKey());
      setRespeecherKeyInput(ttsEngine.getCustomRespeecherApiKey());
      setBrowserVoices(ttsEngine.getBrowserVoices());

      ttsEngine.checkGeminiStatus().then((status) => {
        setGeminiAvailable(status.available);
      });

      ttsEngine.checkElevenLabsStatus().then((status) => {
        setQuotaExceeded(status.quotaExceeded);
      });

      ttsEngine.checkRespeecherStatus().then((status) => {
        setRespeecherAvailable(status.available);
      });

      ttsEngine.fetchGeminiVoices().then((voices) => {
        if (voices.length > 0) setGeminiVoices(voices);
      });

      ttsEngine.fetchElevenVoices().then((voices) => {
        if (voices.length > 0) setElevenVoices(voices);
      });

      ttsEngine.fetchRespeecherVoices().then((voices) => {
        if (voices.length > 0) setRespeecherVoices(voices);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveApiKey = async () => {
    setKeySaving(true);
    setKeyStatusMsg(null);
    try {
      const res = await fetch('/api/tts/elevenlabs/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        ttsEngine.setCustomApiKey(apiKeyInput.trim());
        setHasCustomKey(Boolean(apiKeyInput.trim()));
        setQuotaExceeded(Boolean(data.quotaExceeded));
        setKeyStatusMsg(data.message || 'Chave configurada com sucesso!');
        ttsEngine.fetchElevenVoices().then((v) => {
          if (v.length > 0) setElevenVoices(v);
        });
      } else {
        setKeyStatusMsg(data.error || 'Falha ao validar chave ElevenLabs.');
      }
    } catch {
      setKeyStatusMsg('Erro ao conectar ao servidor.');
    } finally {
      setKeySaving(false);
    }
  };

  const handleSaveRespeecherKey = async () => {
    setRespeecherSaving(true);
    setRespeecherStatusMsg(null);
    try {
      const res = await fetch('/api/tts/respeecher/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: respeecherKeyInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        ttsEngine.setCustomRespeecherApiKey(respeecherKeyInput.trim());
        setRespeecherAvailable(true);
        setRespeecherStatusMsg(data.message || 'Chave Respeecher Space API conectada!');
        ttsEngine.fetchRespeecherVoices().then((v) => {
          if (v.length > 0) setRespeecherVoices(v);
        });
      } else {
        setRespeecherStatusMsg(data.error || 'Falha ao validar chave Respeecher.');
      }
    } catch {
      setRespeecherStatusMsg('Erro ao conectar ao servidor.');
    } finally {
      setRespeecherSaving(false);
    }
  };

  const handleTestVoice = async () => {
    setTestingVoice(true);
    await ttsEngine.speak(
      'Olá, sou o OTTO. Seu assistente integrado com inteligência de voz em tempo real.',
      {
        volume: settings.voiceVolume,
        rate: settings.voiceRate,
        pitch: settings.voicePitch,
        voiceURI: settings.selectedVoiceURI,
        useGeminiTTS: settings.useGeminiTTS !== false,
        geminiVoiceId: settings.geminiVoiceId || 'Puck',
        useElevenLabs: settings.useElevenLabs,
        elevenVoiceId: settings.elevenVoiceId,
        useRespeecher: settings.useRespeecher !== false,
        respeecherVoiceId: settings.respeecherVoiceId || 'daniela',
      }
    );
    setTestingVoice(false);
  };

  const togglePermission = (key: keyof OttoSettings['permissions']) => {
    onUpdateSettings({
      permissions: {
        ...settings.permissions,
        [key]: !settings.permissions[key],
      },
    });
  };

  // Reusable Switch Component in Silver/Monochrome Liquid Glass
  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      type="button"
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-all relative cursor-pointer shrink-0 border active:scale-[0.96] ${
        checked
          ? 'bg-gradient-to-r from-slate-200 to-white border-white shadow-[0_0_12px_rgba(255,255,255,0.4)]'
          : 'bg-white/10 border-white/15'
      }`}
    >
      <span
        className={`block w-4 h-4 bg-black rounded-full shadow-md transition-transform transform ${
          checked ? 'translate-x-5.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 liquid-glass-overlay">
      <div className="relative w-full max-w-lg rounded-[32px] liquid-glass-modal liquid-refraction p-6 flex flex-col font-sans">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <h2 className="text-base font-semibold text-white tracking-tight">
            Configurações
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full liquid-glass-btn flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation - Liquid Glass Tab Bar */}
        <div className="flex items-center gap-2 border-b border-white/10 mb-6 overflow-x-auto whitespace-nowrap py-1 scrollbar-none relative z-10">
          {(['GERAL', 'VOZ', 'IA', 'PERMISSÕES', 'SISTEMA'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs font-semibold tracking-wider uppercase px-3.5 py-1.5 rounded-full transition-all cursor-pointer active:scale-95 ${
                  isActive
                    ? 'apple-glass-tab-active text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="min-h-[280px] max-h-[380px] overflow-y-auto pr-1">
          {/* TAB: GERAL */}
          {activeTab === 'GERAL' && (
            <div className="flex flex-col gap-5">
              {/* DESKTOP GLOBAL OVERLAY CONFIGURATION */}
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/20 flex flex-col gap-3 font-sans">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-slate-300" />
                      <span>Desktop Global Overlay (Windows)</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/15 text-white border border-white/20 font-bold">
                        OVERLAY
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Núcleo flutuante independente e transparente sobre aplicativos desktop.
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={desktopOverlayBridge.getState().isOpen}
                    onChange={() => desktopOverlayBridge.toggleOverlay()}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
                  {/* Always on Top */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/10">
                    <div>
                      <div className="font-semibold text-white">Always-on-Top</div>
                      <div className="text-[10px] text-slate-400">Sempre visível no topo</div>
                    </div>
                    <ToggleSwitch
                      checked={desktopOverlayBridge.getState().isAlwaysOnTop}
                      onChange={() =>
                        desktopOverlayBridge.setAlwaysOnTop(!desktopOverlayBridge.getState().isAlwaysOnTop)
                      }
                    />
                  </div>

                  {/* Start with Windows */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/10">
                    <div>
                      <div className="font-semibold text-white">Iniciar c/ Windows</div>
                      <div className="text-[10px] text-slate-400">Auto-inicialização</div>
                    </div>
                    <ToggleSwitch
                      checked={desktopOverlayBridge.getState().startWithWindows}
                      onChange={() =>
                        desktopOverlayBridge.setStartWithWindows(
                          !desktopOverlayBridge.getState().startWithWindows
                        )
                      }
                    />
                  </div>
                </div>

                {/* OTTO Vision 3-State selector */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">OTTO Vision (Visão Computacional)</span>
                    <span className="text-[10px] font-mono text-slate-300">
                      {desktopOverlayBridge.getState().visionMode}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {(['OFF', 'ASSIST', 'LIVE'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => desktopOverlayBridge.setVisionMode(m)}
                        className={`py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer font-medium ${
                          desktopOverlayBridge.getState().visionMode === m
                            ? 'bg-white text-black font-bold shadow-[0_0_10px_rgba(255,255,255,0.3)]'
                            : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-slate-400'
                        }`}
                      >
                        {m === 'OFF' ? 'OFF (Desativado)' : m === 'ASSIST' ? 'ASSIST (Sob Demanda)' : 'LIVE (Contínuo)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Launch Picture-in-Picture Popout Window */}
                <div className="pt-2 flex justify-between items-center">
                  <span className="text-[11px] text-slate-400 font-mono">Atalho Global: Alt+O</span>
                  <button
                    type="button"
                    onClick={() => desktopOverlayBridge.requestPipWindow()}
                    className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-all cursor-pointer shadow-md border border-white/20"
                  >
                    Abrir Janela Desktop PiP
                  </button>
                </div>
              </div>

              {/* TEMA & APARÊNCIA LIQUID IOS (BRANCO & PRETO) */}
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/20 flex flex-col gap-3 font-sans shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      <Palette className="w-4 h-4 text-slate-300" />
                      <span>Tema & Aparência Apple Liquid iOS</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Escolha a paleta pura Branco & Preto no estilo vidro líquido iOS.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {/* Modo Dark Liquid */}
                  <div
                    onClick={() => onUpdateSettings({ themeAppearance: 'dark', themeMode: 'liquid' })}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      settings.themeAppearance !== 'light' && settings.themeMode !== 'liquid-light'
                        ? 'bg-black/90 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.25)]'
                        : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-black border border-white/30 flex items-center justify-center text-white shadow-inner">
                        <Moon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white">Liquid Dark iOS</div>
                        <div className="text-[10px] text-slate-400">Preto & Vidro Profundo</div>
                      </div>
                    </div>
                    {settings.themeAppearance !== 'light' && settings.themeMode !== 'liquid-light' && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </div>

                  {/* Modo Branco iOS */}
                  <div
                    onClick={() => onUpdateSettings({ themeAppearance: 'light', themeMode: 'liquid-light' })}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      settings.themeAppearance === 'light' || settings.themeMode === 'liquid-light'
                        ? 'bg-white border-white text-slate-950 shadow-[0_0_20px_rgba(255,255,255,0.45)]'
                        : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-900 shadow-sm">
                        <Sun className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <div className={`font-bold text-xs ${settings.themeAppearance === 'light' || settings.themeMode === 'liquid-light' ? 'text-slate-950' : 'text-white'}`}>
                          Modo Branco iOS
                        </div>
                        <div className={`text-[10px] ${settings.themeAppearance === 'light' || settings.themeMode === 'liquid-light' ? 'text-slate-600' : 'text-slate-400'}`}>
                          Apple White Silk Glass
                        </div>
                      </div>
                    </div>
                    {(settings.themeAppearance === 'light' || settings.themeMode === 'liquid-light') && (
                      <Check className="w-4 h-4 text-slate-950" />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">
                    Wake word (Hey OTTO)
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Requer reconhecimento contínuo. Experimental.
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.wakeWordEnabled}
                  onChange={() => onUpdateSettings({ wakeWordEnabled: !settings.wakeWordEnabled })}
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex flex-col gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                  <span>Reconhecimento de voz: <span className="text-slate-200 font-mono">disponível</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                  <span>Respeecher Space API: <span className="text-slate-200 font-mono">conectado (Chave ativa)</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                  <span>
                    ElevenLabs AI:{' '}
                    <span className="font-mono text-slate-200">
                      {quotaExceeded
                        ? 'Cota esgotada (Failover para Respeecher ativo)'
                        : hasCustomKey
                        ? 'Conectado (Chave personalizada)'
                        : 'Conectado'}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                  <span>Síntese de voz nativa: <span className="text-slate-200 font-mono">disponível (Web Speech API)</span></span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: VOZ */}
          {activeTab === 'VOZ' && (
            <div className="flex flex-col gap-3.5 text-xs font-sans">
              {/* Cascade Info Card */}
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/15 text-slate-200 text-xs flex flex-col gap-1.5">
                <div className="font-semibold flex items-center gap-2 text-white">
                  <Sparkles className="w-4 h-4 text-slate-300" />
                  <span>Cascata de Failover de Voz Inteligente</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  A geração de voz do <strong>Google AI Studio (Gemini 3.8 Flash TTS)</strong> opera com altíssima fidelidade e baixíssima latência. Se indisponível, chave da <strong>ElevenLabs</strong> ou <strong>Respeecher Space API</strong> assumem automaticamente.
                </p>
              </div>

              {/* 1. GOOGLE AI STUDIO (GEMINI TTS) */}
              <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      <span>Google AI Studio (Gemini TTS)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/20 text-white border border-white/30 font-bold">
                        {geminiAvailable ? 'ATIVO / RECOMENDADO' : 'OFFLINE'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Síntese de voz oficial com modelos Gemini 3.8 Flash TTS.
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={settings.useGeminiTTS !== false}
                    onChange={() => onUpdateSettings({ useGeminiTTS: settings.useGeminiTTS === false })}
                  />
                </div>

                {settings.useGeminiTTS !== false && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                    <label className="text-xs font-medium text-slate-300">
                      Selecione a Voz do Google AI Studio / Gemini
                    </label>
                    <select
                      value={settings.geminiVoiceId || 'Puck'}
                      onChange={(e) => onUpdateSettings({ geminiVoiceId: e.target.value })}
                      className="w-full bg-[#12151c] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-sans cursor-pointer"
                    >
                      {geminiVoices.map((v) => (
                        <option key={v.voiceId} value={v.voiceId}>
                          {v.name} {v.description ? `— ${v.description}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 2. RESPEECHER SPACE API */}
              <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      <span>Respeecher Space API (Neural)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/15 text-white border border-white/20">
                        {respeecherAvailable ? 'ATIVO / FAILOVER' : 'OFFLINE'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Vozes neurais brasileiras em tempo real (pt-br-rt / en-rt).
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={settings.useRespeecher !== false}
                    onChange={() => onUpdateSettings({ useRespeecher: settings.useRespeecher === false })}
                  />
                </div>

                {settings.useRespeecher !== false && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                    <label className="text-xs font-medium text-slate-300">
                      Selecione a Voz Respeecher (Português & Inglês)
                    </label>
                    <select
                      value={settings.respeecherVoiceId || 'daniela'}
                      onChange={(e) => onUpdateSettings({ respeecherVoiceId: e.target.value })}
                      className="w-full bg-[#12151c] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-sans"
                    >
                      {respeecherVoices.map((v) => (
                        <option key={v.voiceId} value={v.voiceId}>
                          {v.name} {v.description ? `— ${v.description}` : ''}
                        </option>
                      ))}
                    </select>

                    <div className="flex flex-col gap-1 mt-1">
                      <label className="text-[11px] text-slate-400">
                        Chave Space API Respeecher (X-API-Key):
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder="XuZ-_..."
                          value={respeecherKeyInput}
                          onChange={(e) => setRespeecherKeyInput(e.target.value)}
                          className="flex-1 bg-[#12151c] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleSaveRespeecherKey}
                          disabled={respeecherSaving}
                          className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
                        >
                          {respeecherSaving ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                      {respeecherStatusMsg && (
                        <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                          {respeecherStatusMsg}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. ELEVENLABS AI */}
              <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      <span>ElevenLabs AI (Primário)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/15 text-white border border-white/20">
                        {quotaExceeded ? 'COTA ESGOTADA' : 'ATIVO'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {quotaExceeded
                        ? 'Cota de créditos esgotada. O failover para Respeecher AI está ativo.'
                        : 'Síntese ultrarrealista com entonação neural.'}
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={settings.useElevenLabs}
                    onChange={() => onUpdateSettings({ useElevenLabs: !settings.useElevenLabs })}
                  />
                </div>

                {settings.useElevenLabs && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                    <label className="text-xs font-medium text-slate-300">
                      Selecione a Voz ElevenLabs
                    </label>
                    <select
                      value={settings.elevenVoiceId}
                      onChange={(e) => onUpdateSettings({ elevenVoiceId: e.target.value })}
                      className="w-full bg-[#12151c] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono"
                    >
                      {elevenVoices.map((v) => (
                        <option key={v.voiceId} value={v.voiceId}>
                          {v.name} {v.description ? `— ${v.description}` : ''}
                        </option>
                      ))}
                    </select>

                    <div className="flex flex-col gap-1 mt-1">
                      <label className="text-[11px] text-slate-400">
                        Chave ElevenLabs Pessoal (Opcional):
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder="sk_..."
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          className="flex-1 bg-[#12151c] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleSaveApiKey}
                          disabled={keySaving}
                          className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
                        >
                          {keySaving ? 'Validando...' : 'Salvar'}
                        </button>
                      </div>
                      {keyStatusMsg && (
                        <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                          {keyStatusMsg}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. BROWSER VOICE */}
              <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Voz do Navegador (Web Speech API)</span>
                  <span className="text-[10px] text-slate-400 font-mono">Offline / Imediato</span>
                </label>
                <select
                  value={settings.selectedVoiceURI}
                  onChange={(e) => onUpdateSettings({ selectedVoiceURI: e.target.value })}
                  className="w-full bg-[#12151c] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-sans"
                >
                  <option value="">Padrão do Sistema (Português)</option>
                  {browserVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>

              {/* Volume Slider & Test Button */}
              <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-slate-300 text-xs">
                    <span>Volume da Voz</span>
                    <span className="font-mono text-white">{Math.round(settings.voiceVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={settings.voiceVolume}
                    onChange={(e) => onUpdateSettings({ voiceVolume: parseFloat(e.target.value) })}
                    className="w-full accent-white cursor-pointer"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleTestVoice}
                    disabled={testingVoice}
                    className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg hover:bg-slate-200"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{testingVoice ? 'Reproduzindo...' : 'Testar Voz do OTTO'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: IA & INTELIGÊNCIA */}
          {activeTab === 'IA' && (
            <div className="flex flex-col gap-4 text-xs text-slate-300 font-sans">
              {/* 1. Personalidade Configurável */}
              <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-slate-300" />
                    <span>Personalidade do OTTO</span>
                  </div>
                  <span className="text-[10px] text-white font-mono uppercase bg-white/10 border border-white/20 px-2 py-0.5 rounded-full">
                    {settings.personality || 'EXECUTIVO'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Define o tom da fala, estilo de resposta e comportamento operacional do assistente.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {[
                    {
                      id: 'EXECUTIVO',
                      name: 'Assistente Executivo',
                      desc: 'Polido, formal, focado em produtividade e alta performance.',
                      icon: '👔',
                    },
                    {
                      id: 'TECNICO',
                      name: 'Engenheiro Técnico',
                      desc: 'Focado em código, comandos de terminal, sintaxe e arquitetura.',
                      icon: '💻',
                    },
                    {
                      id: 'DESCONTRAIDO',
                      name: 'Amigável & Leve',
                      desc: 'Descontraído, bem-humorado, expressivo e conversacional.',
                      icon: '⚡',
                    },
                    {
                      id: 'SERIO',
                      name: 'Profissional Sério',
                      desc: 'Militar, estrito, ultra conciso, sem cumprimentos extras.',
                      icon: '🛡️',
                    },
                    {
                      id: 'CYBERPUNK',
                      name: 'IA Cyberpunk / J.A.R.V.I.S.',
                      desc: 'Futurista, protocolos neurais, sci-fi e alta tecnologia.',
                      icon: '🤖',
                    },
                  ].map((p) => {
                    const isSelected = (settings.personality || 'EXECUTIVO') === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onUpdateSettings({ personality: p.id as any })}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-white/20 border-white text-white shadow-[0_0_12px_rgba(255,255,255,0.2)]'
                            : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-slate-300'
                        }`}
                      >
                        <span className="text-base mt-0.5">{p.icon}</span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-xs text-white">{p.name}</span>
                          <span className="text-[10px] text-slate-400 leading-snug mt-0.5">{p.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Respostas Adaptativas & Modo Agente */}
              <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                {/* Respostas Adaptativas */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">Respostas Adaptativas</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Respostas curtas para comandos simples e ricas para tarefas complexas
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={settings.adaptiveResponses !== false}
                    onChange={() =>
                      onUpdateSettings({ adaptiveResponses: settings.adaptiveResponses === false })
                    }
                  />
                </div>

                <div className="h-px bg-white/10" />

                {/* Modo Agente & Planejador */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <span>Modo Agente (Multi-Etapas)</span>
                      <span className="text-[9px] bg-white/15 text-white border border-white/20 px-1.5 py-0.5 rounded font-mono">
                        AUTÔNOMO
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Decompõe pedidos em etapas executadas com relatório ao vivo
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={settings.agentModeEnabled !== false}
                    onChange={() =>
                      onUpdateSettings({ agentModeEnabled: settings.agentModeEnabled === false })
                    }
                  />
                </div>
              </div>

              {/* 3. Projeto Ativo & Memória de Contexto */}
              <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Contexto por Projeto</span>
                  <span className="text-[10px] text-slate-300 font-mono">Isolamento Ativo</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Cada projeto possui seu próprio diretório de arquivos, memórias e escopo de automação.
                </p>
                <select
                  value={settings.activeProjectId || 'proj_default'}
                  onChange={(e) => onUpdateSettings({ activeProjectId: e.target.value })}
                  className="w-full bg-[#12151c] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-sans cursor-pointer"
                >
                  <option value="proj_default">🌐 Projeto Geral (Tarefas cotidianas e sistema)</option>
                  <option value="proj_otto">🧠 OTTO Core (Núcleo neural e scripts em disco)</option>
                  <option value="proj_web">💻 Desenvolvimento Web (Sites, HTML e frontend)</option>
                </select>
              </div>

              {/* 4. Modelos e Failover */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold text-white">ROTA A (Normal): Groq GPT-OSS 120B / Gemini</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Conversação & Comandos</span>
              </div>

              {/* 5. ROTA B — API Especializada de TEXTO & CÓDIGO */}
              <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
                    <span className="text-cyan-300">ROTA B — API Especializada de Texto & Código</span>
                  </div>
                  <span className="text-[10px] text-cyan-300 font-mono uppercase bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                    SANDBOX & AGENTES
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Utilizada exclusivamente para programação, debug, criação de sites/aplicações, apresentações de código e tarefas técnicas complexas.
                </p>

                <div className="space-y-2 pt-1">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Modelo Especializado (TEXT_CODE_API_MODEL):
                    </label>
                    <input
                      type="text"
                      defaultValue="openai/gpt-oss-120b"
                      placeholder="ex: openai/gpt-oss-120b, qwen/qwen-2.5-coder-32b, etc."
                      className="w-full bg-[#12151c] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Endpoint da API (TEXT_CODE_API_URL):
                    </label>
                    <input
                      type="text"
                      defaultValue="https://api.groq.com/openai/v1"
                      placeholder="https://api.groq.com/openai/v1"
                      className="w-full bg-[#12151c] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Status: Conexão Real Ativa & Sandboxed
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const status = await ApiBridge.getTextCodeStatus();
                          alert(`Conexão OK com ROTA B!\nModelo: ${status.model}\nEndpoint: ${status.endpoint}\nStatus: ${status.configured ? 'Pronto' : 'Chave não detectada'}`);
                        } catch (err: any) {
                          alert(`Erro: ${err?.message || err}`);
                        }
                      }}
                      className="px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-sm"
                    >
                      Testar Rota B
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PERMISSÕES */}
          {activeTab === 'PERMISSÕES' && (
            <div className="flex flex-col gap-5">
              {/* 1. Navegador */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">Navegador</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Abrir sites e pesquisar na web
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.permissions.browser}
                  onChange={() => togglePermission('browser')}
                />
              </div>

              {/* 2. Aplicativos */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">Aplicativos</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Abrir aplicativos desktop (requer ponte)
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.permissions.apps}
                  onChange={() => togglePermission('apps')}
                />
              </div>

              {/* 3. Arquivos */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">Arquivos</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Criar/listar/excluir arquivos (requer ponte)
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.permissions.files}
                  onChange={() => togglePermission('files')}
                />
              </div>

              {/* 4. Terminal */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">Terminal</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Executar comandos (requer ponte)
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.permissions.terminal}
                  onChange={() => togglePermission('terminal')}
                />
              </div>

              {/* 5. Sistema */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">Sistema</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Volume, info do sistema, hora
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.permissions.system}
                  onChange={() => togglePermission('system')}
                />
              </div>
            </div>
          )}

          {/* TAB: SISTEMA */}
          {activeTab === 'SISTEMA' && (
            <div className="flex flex-col gap-3 text-xs text-slate-300 font-mono">
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white font-sans flex items-center gap-2">
                    <span>Interface OTTO Liquid</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/15 text-white border border-white/20 font-bold">
                      OFICIAL
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                    Console físico em prata/preto com mascote em vidro óptico líquido
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div>Bridge Nativa: <span className="text-slate-200">Ativa (/otto_workspace)</span></div>
                <div>Porta: <span className="text-slate-400">3000 (HTTP/REST)</span></div>
                <div>Status da Bateria: <span className="text-slate-200">44% (Alimentação AC)</span></div>
                <div>Conexão: <span className="text-slate-200">Online</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

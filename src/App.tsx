/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import {
  ActivityItem,
  ChatMessage,
  IntentResult,
  OttoAction,
  OttoSettings,
  OttoState,
  SystemTelemetry,
  AgentTaskPlan,
  TaskStep,
  TaskState,
} from './types/otto';
import type { OttoHologramContent } from './components/hologram';
import { OttoLiquidView } from './components/OttoLiquidView';
import type { YouTubeVideoData } from './components/YouTubeWidget';

// Componentes pesados carregados sob demanda (code splitting real).
const PlanetaryMemoryModal = lazy(() =>
  import('./components/PlanetaryMemoryModal').then((m) => ({ default: m.PlanetaryMemoryModal }))
);
const SettingsModal = lazy(() =>
  import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal }))
);
const ConfirmationDialog = lazy(() =>
  import('./components/ConfirmationDialog').then((m) => ({ default: m.ConfirmationDialog }))
);
const AgentModeModal = lazy(() =>
  import('./components/AgentModeModal').then((m) => ({ default: m.AgentModeModal }))
);
const YouTubeWidget = lazy(() =>
  import('./components/YouTubeWidget').then((m) => ({ default: m.YouTubeWidget }))
);
const DataHubModal = lazy(() =>
  import('./components/datahub/DataHubModal').then((m) => ({ default: m.DataHubModal }))
);
const DataHubPreviewModal = lazy(() =>
  import('./components/datahub/DataHubPreviewModal').then((m) => ({ default: m.DataHubPreviewModal }))
);
import { OttoFile } from './types/dataHub';
import { DataHubStorage } from './services/dataHubStorage';
import { audioAnalyzer } from './services/audioAnalyzer';
import { soundEffects } from './services/audioSynthesizer';
import { voiceEngine } from './services/voiceEngine';
import { ttsEngine } from './services/ttsEngine';
import { ApiBridge } from './services/apiBridge';
import { ToolRouter } from './services/toolRouter';
import { CheckCircle2, AlertTriangle, XCircle, Info, Activity, X } from 'lucide-react';
import { apiFetch } from './services/http';


export default function App() {
  // OTTO Core State
  const [state, setState] = useState<OttoState>('IDLE');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [textInput, setTextInput] = useState<string>('');

  // Modals
  const [showMemoryModal, setShowMemoryModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showAgentModal, setShowAgentModal] = useState<boolean>(false);
  const [showDataHubModal, setShowDataHubModal] = useState<boolean>(false);
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<OttoFile | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [currentPlan, setCurrentPlan] = useState<AgentTaskPlan | null>(null);
  const [currentTaskState, setCurrentTaskState] = useState<TaskState | null>(null);

  // Integrated YouTube Workspace Player
  const [youtubeState, setYoutubeState] = useState<{
    isOpen: boolean;
    query: string;
    topVideo: YouTubeVideoData | null;
    relatedVideos: YouTubeVideoData[];
  }>({
    isOpen: false,
    query: '',
    topVideo: null,
    relatedVideos: [],
  });

  // High-Risk Confirmation
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    prompt: string;
    action: OttoAction;
    speechResponse: string;
  } | null>(null);

  // Time & System Telemetry
  const [currentTime, setCurrentTime] = useState<string>('21:20');
  const [systemInfo, setSystemInfo] = useState<SystemTelemetry | null>(null);

  // Activity Feed (Real actions only)
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Chat Feed (Clean initial state with dynamic welcome)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'otto',
      text: 'Olá! Sou o OTTO Liquid. Como posso ajudar você hoje?',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const latestOttoMessage = useMemo(() => {
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      if (chatMessages[i].sender === 'otto') {
        return chatMessages[i];
      }
    }
    return null;
  }, [chatMessages]);

  // Settings: Wake word enabled by default ("Olá Otto") & Modo Liquid Beta
  const [settings, setSettings] = useState<OttoSettings>(() => {
    const baseSettings: OttoSettings = {
      voiceEnabled: true,
      voiceVolume: 0.95,
      voiceRate: 1.0,
      voicePitch: 1.0,
      selectedVoiceURI: '',
      useGeminiTTS: true,
      geminiVoiceId: 'Puck',
      useElevenLabs: true,
      elevenVoiceId: 'JBFqnCBsd6RMkjVDRZzb', // George
      useRespeecher: true,
      respeecherVoiceId: 'daniela', // High quality Brazilian voice
      wakeWordEnabled: true,
      continuousListening: true,
      autoApproveMediumRisk: true,
      soundEffectsEnabled: true,
      themeMode: 'liquid', // Default to requested OTTO Liquid Beta Mode!
      personality: 'EXECUTIVO',
      adaptiveResponses: true,
      agentModeEnabled: true,
      activeProjectId: 'proj_default',
      permissions: {
        browser: true,
        apps: true,
        files: true,
        terminal: true,
        system: true,
      },
    };
    try {
      const saved = localStorage.getItem('otto_settings_v3');
      if (saved) {
        return { ...baseSettings, ...JSON.parse(saved) };
      }
    } catch {}
    return baseSettings;
  });

  const conversationHistoryRef = useRef<Array<{ role: string; content: string }>>([]);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const isLightMode = settings.themeAppearance === 'light' || settings.themeMode === 'liquid-light';

  // Sync theme mode on document root
  useEffect(() => {
    const root = document.documentElement;
    if (isLightMode) {
      root.classList.remove('dark');
      root.classList.add('light');
      document.body.classList.add('theme-light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      document.body.classList.remove('theme-light');
    }
  }, [isLightMode]);

  // Clock updater
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // System telemetry fetcher
  useEffect(() => {
    const fetchInfo = async () => {
      const info = await ApiBridge.getSystemInfo();
      if (info) setSystemInfo(info);
    };
    fetchInfo();
    const interval = setInterval(fetchInfo, 10000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Sync TTS state with OTTO state
  useEffect(() => {
    ttsEngine.registerSpeakingListener((speaking) => {
      setIsSpeaking(speaking);
      if (speaking) {
        setState('SPEAKING');
      } else {
        setState((curr) => (curr === 'SPEAKING' ? 'IDLE' : curr));
      }
    });
  }, []);

  const lastActivityMessageRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });

  // Add item to activity list (internal record only, no intrusive toasts)
  const addActivity = useCallback((message: string, type: ActivityItem['type'] = 'success') => {
    const now = Date.now();
    // Prevent duplicate error/warning spam within 8 seconds
    if (
      message === lastActivityMessageRef.current.text &&
      now - lastActivityMessageRef.current.time < 8000
    ) {
      return;
    }
    lastActivityMessageRef.current = { text: message, time: now };

    const newItem: ActivityItem = {
      id: `act_${now}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      type,
      message,
    };

    setActivities((prev) => [...prev, newItem]);
  }, []);

  // Trigger YouTube Player inside OTTO
  const openYouTubePlayer = useCallback(async (query: string, preloadedData?: any) => {
    if (preloadedData && preloadedData.topVideo) {
      setYoutubeState({
        isOpen: true,
        query,
        topVideo: preloadedData.topVideo,
        relatedVideos: preloadedData.relatedVideos || [],
      });
      return;
    }

    try {
      addActivity(`Buscando melhor vídeo sobre "${query}"...`, 'info');
      const res = await apiFetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data && data.topVideo) {
        setYoutubeState({
          isOpen: true,
          query,
          topVideo: data.topVideo,
          relatedVideos: data.relatedVideos || [],
        });
        addActivity(`Vídeo aberto: ${data.topVideo.title}`, 'success');
      }
    } catch (err) {
      console.warn('Error fetching YouTube video:', err);
    }
  }, [addActivity]);

  // Process a command (either from speech or typed in the chat input)
  const handleProcessCommand = useCallback(
    async (
      spokenText: string,
      options?: {
        attachedImage?: { dataUrl: string; name?: string; size?: number; mimeType?: string };
        attachedFile?: any;
      }
    ) => {
      const promptText = spokenText.trim() || (options?.attachedImage ? 'Analise esta imagem em detalhes' : '');
      if (!promptText && !options?.attachedImage && !options?.attachedFile) return;

      setTranscript(promptText);
      setInterimTranscript('');
      setState('THINKING');

      // Add to chat feed
      const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg_u_${Date.now()}`,
          sender: 'user',
          text: promptText,
          timestamp: timeStr,
          attachedImage: options?.attachedImage,
          attachedFile: options?.attachedFile,
        },
      ]);

      try {
        const intentResult: IntentResult = await ApiBridge.interpretIntent(
          promptText,
          conversationHistoryRef.current,
          {
            personality: settings.personality,
            activeProjectId: settings.activeProjectId,
            adaptiveResponses: settings.adaptiveResponses,
            agentMode: settings.agentModeEnabled,
            attachedImage: options?.attachedImage,
            attachedFile: options?.attachedFile,
          }
        );

        conversationHistoryRef.current.push({ role: 'user', content: promptText });
        conversationHistoryRef.current.push({ role: 'assistant', content: intentResult.speechResponse });

        // Handle Agent Mode Plan or TaskState if generated by multi-step task planner / ROTA B
        if (intentResult.taskState) {
          setCurrentTaskState(intentResult.taskState);
          if (intentResult.plan) setCurrentPlan(intentResult.plan);
          setShowAgentModal(true);
          addActivity(`ROTA B Concluída: "${intentResult.plan?.title || 'Tarefa técnica'}" (${intentResult.taskState.files?.length || 0} arquivos gerados)`, 'success');
        } else if (intentResult.plan) {
          setCurrentPlan(intentResult.plan);
          setShowAgentModal(true);
          addActivity(`Plano do Modo Agente gerado: "${intentResult.plan.title}" (${intentResult.plan.steps.length} etapas)`, 'info');
        }

        const actions = intentResult.actions || [];
        const firstAction = actions[0];

        // High Risk Confirmation
        if (
          intentResult.requiresConfirmation ||
          (firstAction && firstAction.riskLevel === 'HIGH')
        ) {
          soundEffects.playWarning();
          setState('ERROR');
          setPendingConfirmation({
            prompt:
              intentResult.confirmationPrompt ||
              `Atenção: a ação "${firstAction?.action}" é de alto risco. Confirma a execução?`,
            action: firstAction,
            speechResponse: intentResult.speechResponse,
          });

          if (settings.voiceEnabled) {
            voiceEngine.setMuted(true);
            await ttsEngine.speak(
              intentResult.confirmationPrompt || 'Atenção. Esta ação requer sua confirmação antes de prosseguir.',
              {
                volume: settings.voiceVolume,
                rate: settings.voiceRate,
                pitch: settings.voicePitch,
                voiceURI: settings.selectedVoiceURI,
                useGeminiTTS: settings.useGeminiTTS !== false,
                geminiVoiceId: settings.geminiVoiceId || 'Puck',
                useElevenLabs: settings.useElevenLabs,
                elevenVoiceId: settings.elevenVoiceId,
                useRespeecher: settings.useRespeecher,
                respeecherVoiceId: settings.respeecherVoiceId,
              }
            );
            voiceEngine.onAssistantFinishedSpeaking();
          }
          return;
        }

        // Options for multi-turn interactive suggestions (e.g. YouTube or Search)
        let messageOptions: Array<{ label: string; actionText: string; icon?: 'youtube' | 'search' }> | undefined = undefined;

        // Execute action if allowed
        if (actions.length > 0 && firstAction.action !== 'none') {
          setState('EXECUTING');

          for (const act of actions) {
            // Check permission toggle
            if (act.action === 'open_url' || act.action === 'search_web') {
              if (!settings.permissions.browser) {
                addActivity('Permissão para navegador desativada nas configurações.', 'warning');
                continue;
              }
            }
            if (act.action === 'open_application') {
              if (!settings.permissions.apps) {
                addActivity('Permissão para aplicativos desativada nas configurações.', 'warning');
                continue;
              }
            }

            // Handle Preview File (Videos, Audios, PDFs, Images, Spreadsheets, Code)
            if (act.action === 'preview_file') {
              const fileIdOrName = act.parameters?.fileId || act.target || '';
              let targetFile = DataHubStorage.getFileById(fileIdOrName);
              if (!targetFile && fileIdOrName) {
                const searchResults = DataHubStorage.search(fileIdOrName);
                if (searchResults.length > 0) {
                  targetFile = searchResults[0];
                } else {
                  const allFiles = DataHubStorage.getAllFiles();
                  targetFile = allFiles.find((f) =>
                    f.name.toLowerCase().includes(fileIdOrName.toLowerCase()) ||
                    fileIdOrName.toLowerCase().includes(f.name.toLowerCase())
                  );
                }
              }

              if (targetFile) {
                setSelectedPreviewFile(targetFile);
                setShowPreviewModal(true);
                addActivity(`Abrindo visualizador para: "${targetFile.name}"`, 'success');
              } else {
                setShowDataHubModal(true);
                addActivity(`Abrindo Data Hub para explorar arquivos.`, 'info');
              }
              continue;
            }

            // Handle Open Settings
            if (act.action === 'open_settings') {
              setShowSettingsModal(true);
              addActivity('Painel de configurações aberto.', 'info');
              continue;
            }

            // Handle Open Terminal / Diagnostics
            if (act.action === 'open_terminal') {
              setShowAgentModal(true);
              addActivity('Terminal de diagnósticos e agente ativado.', 'info');
              continue;
            }

            // Handle Embedded YouTube
            if (act.action === 'embedded_youtube') {
              openYouTubePlayer(act.parameters?.query || act.target || spokenText, act.parameters);
              addActivity(`Reproduzindo vídeo no OTTO: ${act.parameters?.topVideo?.title || act.target}`, 'success');
              continue;
            }

            // Handle Planetary Memory Map
            if (act.action === 'open_memory_map') {
              setShowMemoryModal(true);
              addActivity('Mapa mental planetário de memórias acessado.', 'info');
              continue;
            }

            // Handle Data Hub Workspace
            if (act.action === 'open_datahub') {
              setShowDataHubModal(true);
              addActivity('OTTO Data Hub acessado.', 'info');
              continue;
            }

            // Handle Data Hub Organize / Duplicates
            if (act.action === 'organize_datahub' || act.action === 'detect_duplicates') {
              setShowDataHubModal(true);
              addActivity(`Data Hub: ${act.reasoning || 'Executando diagnóstico de arquivos'}`, 'info');
              continue;
            }

            // Handle Reasoning Suggestion (YouTube vs Search)
            if (act.action === 'suggest_youtube_or_search') {
              const q = act.parameters?.query || act.target || spokenText;
              messageOptions = [
                {
                  label: '▶ Abrir melhor vídeo no YouTube',
                  actionText: 'Pode ser o vídeo no YouTube',
                  icon: 'youtube',
                },
                {
                  label: '🔍 Pesquisar na Web',
                  actionText: `Pesquisar sobre ${q}`,
                  icon: 'search',
                },
              ];
              continue;
            }

            const res = await ToolRouter.executeAction(act);
            addActivity(res.message, res.success ? 'success' : 'error');
          }
        }

        // Notify if OTTO assimilated a learned memory from conversation
        if (intentResult.learnedMemory) {
          addActivity(`OTTO assimilou novo conhecimento: "${intentResult.learnedMemory.title}"`, 'success');
        }

        // Construct holographic content if images or knowledge cards are present
        const holograms: OttoHologramContent[] = [];
        if (intentResult.images && intentResult.images.length > 0) {
          if (intentResult.images.length === 1) {
            holograms.push({
              id: `holo_img_${Date.now()}`,
              type: 'image',
              title: intentResult.images[0].title || 'Imagem Encontrada',
              imageUrl: intentResult.images[0].url,
            });
          } else {
            holograms.push({
              id: `holo_gal_${Date.now()}`,
              type: 'gallery',
              title: 'Galeria Holográfica',
              images: intentResult.images.map((img) => ({
                url: img.url,
                title: img.title,
                alt: img.alt,
                source: img.source,
              })),
            });
          }
        }

        // Check for Data Hub files or plan to attach to message
        let msgDataHubFiles: any = undefined;
        if (firstAction.action === 'read_file' && firstAction.parameters?.fileId) {
          const f = DataHubStorage.getFileById(firstAction.parameters.fileId);
          if (f) msgDataHubFiles = [f];
        } else if (firstAction.action === 'detect_duplicates') {
          const dupes = DataHubStorage.detectDuplicates();
          if (dupes.length > 0) {
            msgDataHubFiles = [dupes[0].original, ...dupes[0].duplicates];
          }
        }

        // Add response to chat with Apple typewriter effect
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg_o_${Date.now()}`,
            sender: 'otto',
            text: intentResult.speechResponse,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            route: intentResult.route,
            routeDecision: intentResult.routeDecision,
            taskState: intentResult.taskState,
            actions,
            artifact: intentResult.artifact,
            knowledgeCard: intentResult.knowledgeCard,
            images: intentResult.images,
            holograms: holograms.length > 0 ? holograms : undefined,
            dataHubFiles: msgDataHubFiles,
            options: messageOptions,
          },
        ]);

        // Speak via ElevenLabs or browser synthesis
        if (settings.voiceEnabled) {
          setState('SPEAKING');
          // MUTE mic before speaking so OTTO never hears its own voice!
          voiceEngine.setMuted(true);

          await ttsEngine.speak(intentResult.speechResponse, {
            volume: settings.voiceVolume,
            rate: settings.voiceRate,
            pitch: settings.voicePitch,
            voiceURI: settings.selectedVoiceURI,
            useGeminiTTS: settings.useGeminiTTS !== false,
            geminiVoiceId: settings.geminiVoiceId || 'Puck',
            useElevenLabs: settings.useElevenLabs,
            elevenVoiceId: settings.elevenVoiceId,
            useRespeecher: settings.useRespeecher,
            respeecherVoiceId: settings.respeecherVoiceId,
          });

          // Unmute with debounce grace period after speech completes
          voiceEngine.onAssistantFinishedSpeaking();
        }

        setState('IDLE');
      } catch (err: any) {
        console.error('Error processing command:', err);
        setState('ERROR');
        const fallbackMsg = err?.message || 'Não consegui interpretar o comando.';
        addActivity(fallbackMsg, 'error');

        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg_err_${Date.now()}`,
            sender: 'otto',
            text: fallbackMsg,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);

        if (settings.voiceEnabled) {
          voiceEngine.setMuted(true);
          await ttsEngine.speak(fallbackMsg, {
            volume: settings.voiceVolume,
            rate: settings.voiceRate,
            pitch: settings.voicePitch,
            voiceURI: settings.selectedVoiceURI,
            useElevenLabs: settings.useElevenLabs,
            elevenVoiceId: settings.elevenVoiceId,
            useRespeecher: settings.useRespeecher,
            respeecherVoiceId: settings.respeecherVoiceId,
          });
          voiceEngine.onAssistantFinishedSpeaking();
        }
      }
    },
    [addActivity, settings, openYouTubePlayer]
  );

  const handleProcessCommandRef = useRef(handleProcessCommand);
  handleProcessCommandRef.current = handleProcessCommand;

  const addActivityRef = useRef(addActivity);
  addActivityRef.current = addActivity;

  // Initialize Voice Engine ONCE on mount with Wake Word "Olá Otto" and anti-echo isolation
  useEffect(() => {
    let active = true;

    const setupVoice = async () => {
      try {
        await audioAnalyzer.initMicrophone();
      } catch {}

      if (!active) return;

      voiceEngine.init(
        {
          onInterimResult: (interim) => {
            setInterimTranscript(interim);
          },
          onFinalResult: (final) => {
            setInterimTranscript('');
            handleProcessCommandRef.current(final);
          },
          onWakeWordDetected: (phrase) => {
            soundEffects.playWake();
            setState('LISTENING');
            setIsListening(true);
            addActivityRef.current(`Comando de voz detectado: "${phrase}"`, 'info');
          },
          onInterruption: () => {
            ttsEngine.stop();
            soundEffects.playStop();
            setState('IDLE');
            setIsListening(false);
            setInterimTranscript('');
            addActivityRef.current('Comando interrompido', 'warning');
          },
          onError: (msg) => {
            if (msg) {
              addActivityRef.current(msg, 'warning');
            }
          },
          onStateChange: (listening) => {
            setIsListening(listening);
          },
          onModeChange: (mode) => {
            if (mode === 'LISTENING_COMMAND') {
              setState('LISTENING');
              setIsListening(true);
            } else if (mode === 'STANDBY') {
              setState((curr) => (curr === 'LISTENING' ? 'IDLE' : curr));
              setIsListening(false);
              setInterimTranscript('');
            }
          },
        },
        settings.wakeWordEnabled
      );
    };

    setupVoice();

    return () => {
      active = false;
    };
  }, []);

  // Update wake word config when settings change
  useEffect(() => {
    voiceEngine.setWakeWord(settings.wakeWordEnabled);
    if (settings.wakeWordEnabled) {
      voiceEngine.startListening();
    }
  }, [settings.wakeWordEnabled]);

  // Global Speech Interruption (Barge-in on Escape or Voice)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (state === 'SPEAKING' || ttsEngine.isSpeaking()) {
          e.preventDefault();
          ttsEngine.stop();
          setState('IDLE');
          setIsListening(false);
          soundEffects.playStop();
          addActivity('Fala interrompida pelo usuário.', 'warning');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, addActivity]);

  // Toggle Microphone / Manual command trigger
  const toggleListening = useCallback(async () => {
    if (state === 'LISTENING' || voiceEngine.isAwaitingCommand()) {
      voiceEngine.stopListening();
      setIsListening(false);
      setState('IDLE');
      setInterimTranscript('');
      soundEffects.playStop();
      return;
    }

    if (state === 'SPEAKING') {
      ttsEngine.stop();
      setState('IDLE');
      setIsListening(false);
      return;
    }

    soundEffects.playListening();
    setState('LISTENING');
    setIsListening(true);
    addActivity('Microfone ativado. Pode falar seu comando...', 'info');
    await voiceEngine.activateManualCommand();
  }, [state, addActivity]);

  // Chat input submit
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const cmd = textInput.trim();
    setTextInput('');
    handleProcessCommand(cmd);
  };

  // High-Risk Confirmation Handlers
  const handleConfirmAction = async () => {
    if (!pendingConfirmation) return;
    const { action } = pendingConfirmation;
    setPendingConfirmation(null);

    setState('EXECUTING');
    const result = await ToolRouter.executeAction(action);
    addActivity(result.message, result.success ? 'success' : 'error');

    if (settings.voiceEnabled) {
      voiceEngine.setMuted(true);
      setState('SPEAKING');
      await ttsEngine.speak(result.message, {
        volume: settings.voiceVolume,
        rate: settings.voiceRate,
        pitch: settings.voicePitch,
        voiceURI: settings.selectedVoiceURI,
        useElevenLabs: settings.useElevenLabs,
        elevenVoiceId: settings.elevenVoiceId,
        useRespeecher: settings.useRespeecher,
        respeecherVoiceId: settings.respeecherVoiceId,
      });
      voiceEngine.onAssistantFinishedSpeaking();
    }

    setState('IDLE');
  };

  const handleCancelAction = () => {
    setPendingConfirmation(null);
    setState('IDLE');
    soundEffects.playStop();
    addActivity('Ação cancelada pelo usuário.', 'info');
  };

  const handleUpdateSettings = (newVals: Partial<OttoSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newVals };
      if (newVals.wakeWordEnabled !== undefined) {
        voiceEngine.setWakeWord(newVals.wakeWordEnabled);
      }
      try {
        localStorage.setItem('otto_settings_v3', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  return (
    <div className={`h-[100dvh] w-screen relative overflow-hidden select-none font-sans transition-colors duration-300 ${isLightMode ? 'bg-[#edf1f7] text-slate-900 theme-light' : 'bg-[#090a0d] text-slate-100'}`}>
      <OttoLiquidView
        state={state}
        isListening={isListening}
        isSpeaking={isSpeaking}
        toggleListening={toggleListening}
        activities={activities}
        systemInfo={systemInfo}
        currentTime={currentTime}
        chatMessages={chatMessages}
        setChatMessages={setChatMessages}
        textInput={textInput}
        setTextInput={setTextInput}
        handleChatSubmit={handleChatSubmit}
        handleProcessCommand={handleProcessCommand}
        settings={settings}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenMemory={() => setShowMemoryModal(true)}
        onOpenAgentMode={() => setShowAgentModal(true)}
        onOpenDataHub={() => setShowDataHubModal(true)}
        activePlan={currentPlan}
        interimTranscript={interimTranscript}
      />

      {/* OTTO DATA HUB MODAL */}
            <Suspense fallback={null}>
  <DataHubModal
          isOpen={showDataHubModal}
          onClose={() => setShowDataHubModal(false)}
          onAskOttoAboutFiles={(prompt) => handleProcessCommand(prompt)}
        />
      </Suspense>

      {/* OTTO FILE PREVIEW MODAL (Videos, Audios, PDFs, Spreadsheets, Images, Code) */}
            <Suspense fallback={null}>
  <DataHubPreviewModal
          file={selectedPreviewFile}
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedPreviewFile(null);
          }}
          onAskOttoAboutFile={(file, prompt) => handleProcessCommand(prompt)}
        />
      </Suspense>

      {/* INTEGRATED YOUTUBE WORKSPACE PLAYER */}
            <Suspense fallback={null}>
  <YouTubeWidget
          isOpen={youtubeState.isOpen}
          onClose={() => setYoutubeState((prev) => ({ ...prev, isOpen: false }))}
          query={youtubeState.query}
          topVideo={youtubeState.topVideo}
          relatedVideos={youtubeState.relatedVideos}
          onSelectVideo={(video) =>
            setYoutubeState((prev) => ({ ...prev, topVideo: video }))
          }
        />
      </Suspense>

      {/* MODALS */}
            <Suspense fallback={null}>
  <PlanetaryMemoryModal
          isOpen={showMemoryModal}
          onClose={() => setShowMemoryModal(false)}
          onMemoryChanged={() => addActivity('Memória central do OTTO sincronizada.', 'info')}
          onSelectTopicForChat={(topicText) => handleProcessCommand(topicText)}
          onSearchTopic={(query) => handleProcessCommand(`Pesquise na web sobre ${query}`)}
        />
      </Suspense>

            <Suspense fallback={null}>
  <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
        />
      </Suspense>

            <Suspense fallback={null}>
  <AgentModeModal
          isOpen={showAgentModal}
          onClose={() => setShowAgentModal(false)}
          plan={currentPlan}
          initialTaskState={currentTaskState}
          onUpdatePlan={(updatedPlan) => setCurrentPlan(updatedPlan)}
          onStepCompleted={(step, msg) => addActivity(`Etapa concluída: ${step.title} — ${msg}`, 'success')}
          settings={settings}
          onRunNewTask={(taskPrompt) => handleProcessCommand(taskPrompt)}
        />
      </Suspense>

            <Suspense fallback={null}>
  <ConfirmationDialog
          isOpen={Boolean(pendingConfirmation)}
          prompt={pendingConfirmation?.prompt || ''}
          action={pendingConfirmation?.action || null}
          onConfirm={handleConfirmAction}
          onCancel={handleCancelAction}
        />
      </Suspense>
    </div>
  );
}

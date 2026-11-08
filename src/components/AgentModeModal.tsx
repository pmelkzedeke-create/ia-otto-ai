import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Circle,
  Bot,
  Zap,
  Terminal,
  ShieldCheck,
  AlertCircle,
  Layers,
  Sparkles,
  FileCode,
  Folder,
  FolderOpen,
  Eye,
  Edit3,
  GitCompare,
  Save,
  Trash2,
  Plus,
  RefreshCw,
  Clock,
  Cpu,
  Check,
  Code2,
  FileText,
  Sliders,
  Send,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  ExternalLink,
} from 'lucide-react';
import {
  AgentTaskPlan,
  TaskStep,
  OttoSettings,
  TaskState,
  RouteDecision,
  OrchestratorFile,
  SandboxResult,
} from '../types/otto';
import { ApiBridge } from '../services/apiBridge';
import { soundEffects } from '../services/audioSynthesizer';
import { ttsEngine } from '../services/ttsEngine';
import { TaskRouter } from '../services/taskRouter';

interface AgentModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: AgentTaskPlan | null;
  initialTaskState?: TaskState | null;
  onUpdatePlan?: (updatedPlan: AgentTaskPlan) => void;
  onStepCompleted?: (step: TaskStep, resultMsg: string) => void;
  settings?: OttoSettings;
  onRunNewTask?: (taskPrompt: string) => void;
}

export const AgentModeModal: React.FC<AgentModeModalProps> = ({
  isOpen,
  onClose,
  plan,
  initialTaskState,
  onUpdatePlan,
  onStepCompleted,
  settings,
  onRunNewTask,
}) => {
  const [taskState, setTaskState] = useState<TaskState | null>(initialTaskState || null);
  const [routeDecision, setRouteDecision] = useState<RouteDecision | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'agents' | 'files' | 'sandbox' | 'logs'>('agents');
  const [customPrompt, setCustomPrompt] = useState<string>('');

  // Files management
  const [files, setFiles] = useState<OrchestratorFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<OrchestratorFile | null>(null);
  const [fileEditMode, setFileEditMode] = useState<'view' | 'edit' | 'diff' | 'preview_html'>('view');
  const [htmlPreviewDevice, setHtmlPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [htmlIframeKey, setHtmlIframeKey] = useState<number>(0);
  const [editedContent, setEditedContent] = useState<string>('');
  const [diffOriginal, setDiffOriginal] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Sandbox state
  const [sandboxCode, setSandboxCode] = useState<string>('');
  const [sandboxLang, setSandboxLang] = useState<string>('javascript');
  const [sandboxFilename, setSandboxFilename] = useState<string>('test.js');
  const [sandboxRunning, setSandboxRunning] = useState<boolean>(false);
  const [sandboxResult, setSandboxResult] = useState<SandboxResult | null>(null);

  // Technical Logs
  const [logs, setLogs] = useState<string[]>([]);
  const [apiModelName, setApiModelName] = useState<string>('openai/gpt-oss-120b');
  const logEndRef = useRef<HTMLDivElement | null>(null);

  // Sync initial task state or plan
  useEffect(() => {
    if (isOpen) {
      ApiBridge.getTextCodeStatus().then((status) => {
        if (status?.model) setApiModelName(status.model);
      }).catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialTaskState) {
      setTaskState(initialTaskState);
      setFiles(initialTaskState.files || []);
      if (initialTaskState.files && initialTaskState.files.length > 0) {
        setSelectedFile(initialTaskState.files[0]);
        setEditedContent(initialTaskState.files[0].content);
        setSandboxCode(initialTaskState.files[0].content);
        setSandboxLang(initialTaskState.files[0].language || 'javascript');
        setSandboxFilename(initialTaskState.files[0].name);
      }
      setLogs(initialTaskState.logs || []);
    }
  }, [initialTaskState]);

  useEffect(() => {
    if (plan && !initialTaskState) {
      const decision = TaskRouter.evaluate(plan.title);
      setRouteDecision(decision);
    }
  }, [plan, initialTaskState]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isOpen) return null;

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formatted = `[${time}] ${msg}`;
    setLogs((prev) => [...prev, formatted]);
  };

  const handleSelectFile = (file: OrchestratorFile) => {
    setSelectedFile(file);
    setEditedContent(file.content);
    setDiffOriginal(file.originalContent || file.content);
    setSandboxCode(file.content);
    setSandboxLang(file.language || 'javascript');
    setSandboxFilename(file.name);
    const isHtml =
      file.name.toLowerCase().endsWith('.html') ||
      file.name.toLowerCase().endsWith('.htm') ||
      file.language === 'html';
    setFileEditMode(isHtml ? 'preview_html' : 'view');
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    try {
      addLog(`Salvando arquivo em disco: "${selectedFile.name}"...`);
      await ApiBridge.writeFile(selectedFile.name, editedContent);
      const updatedFiles = files.map((f) =>
        f.name === selectedFile.name
          ? { ...f, content: editedContent, size: new Blob([editedContent]).size, isModified: true }
          : f
      );
      setFiles(updatedFiles);
      setSelectedFile({ ...selectedFile, content: editedContent, isModified: true });
      setSaveSuccessMsg('Arquivo salvo com sucesso em disco!');
      soundEffects.playSuccess();
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      addLog(`Arquivo "${selectedFile.name}" persistido com sucesso no workspace.`);
    } catch (err: any) {
      addLog(`Erro ao salvar arquivo: ${err?.message || err}`);
    }
  };

  const handleRunInSandbox = async () => {
    if (!sandboxCode.trim()) return;
    setSandboxRunning(true);
    setSandboxResult(null);
    addLog(`Iniciando execução isolada no Sandbox (${sandboxLang})...`);

    try {
      const result = await ApiBridge.executeInSandbox(sandboxCode, sandboxLang, sandboxFilename, 15000);
      setSandboxResult(result);
      if (result.success) {
        soundEffects.playSuccess();
        addLog(`Sandbox finalizado com sucesso! (Exit Code: 0 em ${result.executionTimeMs}ms)`);
      } else {
        soundEffects.playWarning();
        addLog(`Sandbox finalizado com aviso/erro (Exit Code: ${result.exitCode}): ${result.stderr || result.error}`);
      }
    } catch (err: any) {
      addLog(`Falha na chamada do Sandbox: ${err?.message || err}`);
    } finally {
      setSandboxRunning(false);
    }
  };

  const handleExecuteNewTask = async (promptToRun?: string) => {
    const text = (promptToRun || customPrompt).trim();
    if (!text || isRunning) return;

    setIsRunning(true);
    setCustomPrompt('');
    setLogs([]);
    setFiles([]);
    setSelectedFile(null);
    setSandboxResult(null);

    // 1. Evaluate Task Router
    const decision = TaskRouter.evaluate(text);
    setRouteDecision(decision);

    addLog(`Task iniciada: "${text}"`);
    addLog(`TaskRouter → ${decision.route} (${decision.routeName})`);
    addLog(`Motivo: ${decision.reason} [Confiança: ${Math.round(decision.confidence * 100)}%]`);

    if (settings?.voiceEnabled) {
      ttsEngine.speak(`Iniciando tarefa técnica na rota especializada: ${text}`).catch(() => {});
    }

    try {
      addLog(`Enviando requisição para orquestrador real de agentes...`);
      const res = await ApiBridge.runAgentOrchestration(text);
      if (res) {
        setTaskState(res);
        setFiles(res.files || []);
        setLogs(res.logs || []);
        if (res.files && res.files.length > 0) {
          setSelectedFile(res.files[0]);
          setEditedContent(res.files[0].content);
          setSandboxCode(res.files[0].content);
          setSandboxLang(res.files[0].language);
          setSandboxFilename(res.files[0].name);
        }
        soundEffects.playSuccess();
        addLog(`🎉 Orquestração concluída com sucesso! ${res.files?.length || 0} arquivos criados.`);
        if (settings?.voiceEnabled) {
          ttsEngine.speak(`Tarefa concluída com sucesso! Todos os arquivos foram criados e testados no sandbox.`).catch(() => {});
        }
      }
    } catch (err: any) {
      addLog(`Erro na execução da orquestração: ${err?.message || err}`);
      soundEffects.playWarning();
    } finally {
      setIsRunning(false);
    }
  };

  // Agent Steps status helper
  const getAgentStepStatus = (agentName: string) => {
    if (!taskState) return 'idle';
    const entry = taskState.agentHistory?.find((h) => h.agent === agentName);
    if (entry) return entry.status;
    if (taskState.currentStep === agentName) return 'started';
    return 'idle';
  };

  const agentWorkflow = [
    { key: 'PLANNER', label: 'Agent Planner', desc: 'Análise de requisitos & arquitetura' },
    { key: 'CODER', label: 'Agent Coder', desc: 'Geração de código de produção' },
    { key: 'REVIEWER', label: 'Agent Reviewer', desc: 'Auditoria estática & segurança' },
    { key: 'TESTER', label: 'Agent Tester', desc: 'Execução no Sandbox isolado' },
    { key: 'FIXER', label: 'Agent Fixer', desc: 'Loop de correção de erros em tempo real' },
    { key: 'FINALIZER', label: 'Finalizer', desc: 'Persistência física no workspace' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-5xl h-[90vh] flex flex-col rounded-3xl bg-[#0a0d14]/95 border border-white/15 shadow-2xl overflow-hidden glass-strong text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950 font-bold">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  OTTO • Sistema de Agentes Especializados
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  {routeDecision?.route === 'ROTA_B' ? 'ROTA B (Texto & Código)' : 'ROTA B ATIVA'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Execução real com agentes sequenciais, sandbox isolado e gravação em disco
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2 border-b border-white/10 flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('agents')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'agents'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Agentes & Pipeline</span>
            </button>

            <button
              onClick={() => setActiveTab('files')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'files'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Arquivos ({files.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('sandbox')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'sandbox'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Sandbox de Execução</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Logs Técnicos ({logs.length})</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400 hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>API: {apiModelName}</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: AGENTS PIPELINE */}
          {activeTab === 'agents' && (
            <div className="space-y-6">
              {/* Task Header info */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                <div>
                  <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
                    {routeDecision?.category ? `CATEGORIA: ${routeDecision.category}` : 'TAREFA TÉCNICA'}
                  </div>
                  <h3 className="text-base font-semibold text-white">
                    {taskState?.plan?.title || plan?.title || 'Aguardando comando técnico...'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {taskState?.plan?.summary || plan?.description || 'Digite um comando abaixo para acionar a rota de desenvolvimento.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {taskState && (
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {taskState.currentStep === 'COMPLETED' ? '✓ Concluído' : taskState.currentStep}
                    </span>
                  )}
                </div>
              </div>

              {/* Agent Workflow Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {agentWorkflow.map((ag, idx) => {
                  const status = getAgentStepStatus(ag.key);
                  const isDone = status === 'completed';
                  const isCurrent = status === 'started' || taskState?.currentStep === ag.key;

                  return (
                    <div
                      key={ag.key}
                      className={`p-4 rounded-2xl border transition-all ${
                        isDone
                          ? 'bg-emerald-500/[0.04] border-emerald-500/30 text-slate-200'
                          : isCurrent
                          ? 'bg-cyan-500/[0.08] border-cyan-500/50 text-white shadow-lg shadow-cyan-500/10'
                          : 'bg-white/[0.02] border-white/5 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                          0{idx + 1}
                        </span>
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : isCurrent ? (
                          <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-white mb-0.5">{ag.label}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">{ag.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* Final Result / Speech summary if done */}
              {taskState?.finalResult && (
                <div className="p-4 rounded-2xl bg-cyan-500/[0.05] border border-cyan-500/20 text-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold">
                    <Sparkles className="w-4 h-4" />
                    <span>Resultado da Entrega</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {taskState.finalResult.speechResponse}
                  </p>
                  <div className="pt-2 flex flex-wrap gap-2">
                    {taskState.finalResult.createdFiles.map((cf) => (
                      <span
                        key={cf.name}
                        onClick={() => {
                          const f = files.find((item) => item.name === cf.name);
                          if (f) {
                            handleSelectFile(f);
                            setActiveTab('files');
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono bg-white/10 hover:bg-white/20 text-cyan-300 border border-white/10 cursor-pointer transition-colors"
                      >
                        📄 {cf.name} ({(cf.size / 1024).toFixed(1)} KB)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FILES & CODE VIEWER / DIFF */}
          {activeTab === 'files' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full min-h-[400px]">
              {/* File list */}
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2 flex flex-col">
                <div className="flex items-center justify-between px-2 pb-2 border-b border-white/10">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                    Workspace ({files.length})
                  </span>
                  <span className="text-[10px] text-slate-500">Disco real</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1">
                  {files.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500">
                      Nenhum arquivo gerado ainda.
                    </div>
                  ) : (
                    files.map((f) => (
                      <button
                        key={f.name}
                        onClick={() => handleSelectFile(f)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          selectedFile?.name === f.name
                            ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 font-medium'
                            : 'text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="truncate">{f.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">
                          {(f.size ? f.size / 1024 : 0).toFixed(1)} KB
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Code viewer / Editor / Diff */}
              <div className="md:col-span-2 p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col space-y-3">
                {selectedFile ? (
                  <>
                    <div className="flex items-center justify-between pb-2 border-b border-white/10 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white">
                          {selectedFile.name}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/10 text-cyan-300 uppercase">
                          {selectedFile.language}
                        </span>
                      </div>

                      {(() => {
                        const isHtmlFile =
                          selectedFile.name.toLowerCase().endsWith('.html') ||
                          selectedFile.name.toLowerCase().endsWith('.htm') ||
                          selectedFile.language === 'html' ||
                          Boolean(
                            selectedFile.content &&
                              (selectedFile.content.includes('<!DOCTYPE html>') ||
                                selectedFile.content.includes('<html'))
                          );

                        return (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isHtmlFile && (
                              <button
                                onClick={() => setFileEditMode('preview_html')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 ${
                                  fileEditMode === 'preview_html'
                                    ? 'bg-cyan-500/30 text-cyan-200 font-bold border border-cyan-400/40'
                                    : 'text-cyan-300 hover:bg-cyan-500/10'
                                }`}
                              >
                                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Preview Web</span>
                              </button>
                            )}
                            <button
                              onClick={() => setFileEditMode('view')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                fileEditMode === 'view' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <Eye className="w-3.5 h-3.5 inline mr-1" />
                              Código
                            </button>
                            <button
                              onClick={() => setFileEditMode('edit')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                fileEditMode === 'edit' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <Edit3 className="w-3.5 h-3.5 inline mr-1" />
                              Editar
                            </button>
                            <button
                              onClick={() => setFileEditMode('diff')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                fileEditMode === 'diff' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <GitCompare className="w-3.5 h-3.5 inline mr-1" />
                              Diff
                            </button>
                            <button
                              onClick={handleSaveFile}
                              className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-transform active:scale-95 cursor-pointer shadow-sm"
                            >
                              <Save className="w-3.5 h-3.5" />
                              Salvar
                            </button>
                          </div>
                        );
                      })()}
                    </div>

                    {saveSuccessMsg && (
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                        <Check className="w-3.5 h-3.5" />
                        <span>{saveSuccessMsg}</span>
                      </div>
                    )}

                    {/* Mode view/edit/diff/preview_html */}
                    <div className="flex-1 min-h-[300px]">
                      {fileEditMode === 'preview_html' ? (
                        <div className="flex flex-col gap-2 h-full">
                          {/* Live Controls */}
                          <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-white/10 text-xs font-mono">
                            <div className="flex items-center gap-1">
                              {(['desktop', 'tablet', 'mobile'] as const).map((mode) => (
                                <button
                                  key={mode}
                                  onClick={() => setHtmlPreviewDevice(mode)}
                                  className={`px-2.5 py-1 rounded-lg text-xs capitalize transition-colors cursor-pointer flex items-center gap-1 ${
                                    htmlPreviewDevice === mode
                                      ? 'bg-cyan-500/30 text-cyan-200 font-bold'
                                      : 'text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {mode === 'desktop' && <Monitor className="w-3.5 h-3.5" />}
                                  {mode === 'tablet' && <Tablet className="w-3.5 h-3.5" />}
                                  {mode === 'mobile' && <Smartphone className="w-3.5 h-3.5" />}
                                  <span>{mode}</span>
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setHtmlIframeKey((k) => k + 1)}
                                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Recarregar Preview"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  const content = editedContent || selectedFile.content;
                                  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
                                  const url = URL.createObjectURL(blob);
                                  window.open(url, '_blank');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Nova Aba</span>
                              </button>
                            </div>
                          </div>

                          {/* Iframe Viewport Container */}
                          <div className="flex-1 rounded-2xl overflow-hidden bg-slate-950 border border-white/10 flex items-center justify-center min-h-[360px] p-2">
                            <div
                              className="h-full w-full transition-all duration-300 flex items-center justify-center bg-white rounded-xl overflow-hidden shadow-2xl"
                              style={{
                                maxWidth:
                                  htmlPreviewDevice === 'mobile'
                                    ? '375px'
                                    : htmlPreviewDevice === 'tablet'
                                    ? '768px'
                                    : '100%',
                                minHeight: '360px',
                                height: '100%',
                              }}
                            >
                              <iframe
                                key={htmlIframeKey}
                                srcDoc={editedContent || selectedFile.content}
                                title={selectedFile.name}
                                sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
                                className="w-full h-full border-none bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      ) : fileEditMode === 'edit' ? (
                        <textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className="w-full h-full min-h-[300px] p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 resize-none"
                        />
                      ) : fileEditMode === 'diff' ? (
                        <div className="grid grid-cols-2 gap-2 h-full font-mono text-xs">
                          <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/20 overflow-auto">
                            <div className="text-[10px] text-red-400 uppercase font-bold mb-1">Original</div>
                            <pre className="text-red-200/80 whitespace-pre-wrap">{diffOriginal}</pre>
                          </div>
                          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 overflow-auto">
                            <div className="text-[10px] text-emerald-400 uppercase font-bold mb-1">Atual / Modificado</div>
                            <pre className="text-emerald-200/80 whitespace-pre-wrap">{editedContent}</pre>
                          </div>
                        </div>
                      ) : (
                        <pre className="w-full h-full min-h-[300px] p-3 rounded-xl bg-black/40 border border-white/5 font-mono text-xs text-slate-200 overflow-auto whitespace-pre-wrap">
                          {editedContent}
                        </pre>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
                    Selecione um arquivo da lista para inspecionar o código real.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CODE SANDBOX */}
          {activeTab === 'sandbox' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center gap-3">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Executor Isolado (Sandbox)</h4>
                    <p className="text-[11px] text-slate-400">
                      Execução real com timeout de 15s e captura de stdout/stderr/exitCode.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={sandboxLang}
                    onChange={(e) => setSandboxLang(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none font-mono"
                  >
                    <option value="javascript">JavaScript (Node.js)</option>
                    <option value="typescript">TypeScript (Bun/Node)</option>
                    <option value="python">Python 3 (/usr/bin/python3)</option>
                    <option value="bash">Bash Shell</option>
                    <option value="html">HTML (Syntax Validator)</option>
                  </select>

                  <button
                    onClick={handleRunInSandbox}
                    disabled={sandboxRunning}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer transition-all active:scale-95"
                  >
                    {sandboxRunning ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                    <span>Executar no Sandbox</span>
                  </button>
                </div>
              </div>

              {/* Sandbox Code Input & Output */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono text-slate-400 uppercase">Código de Entrada:</span>
                  <textarea
                    value={sandboxCode}
                    onChange={(e) => setSandboxCode(e.target.value)}
                    placeholder="// Escreva ou cole seu código para executar aqui..."
                    className="w-full h-72 p-3 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono text-slate-400 uppercase">Resultado Real da Execução:</span>
                  <div className="w-full h-72 p-3 rounded-2xl bg-black/80 border border-white/10 font-mono text-xs overflow-auto flex flex-col justify-between">
                    {sandboxResult ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between pb-1 border-b border-white/10 text-[10px]">
                          <span
                            className={
                              sandboxResult.success ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'
                            }
                          >
                            {sandboxResult.success ? '✓ SUCESSO (Exit Code: 0)' : `✕ ERRO (Exit Code: ${sandboxResult.exitCode})`}
                          </span>
                          <span className="text-slate-400">{sandboxResult.executionTimeMs}ms • {sandboxResult.runtimeUsed}</span>
                        </div>

                        {sandboxResult.stdout && (
                          <div>
                            <div className="text-[10px] text-slate-500 uppercase">stdout:</div>
                            <pre className="text-slate-200 whitespace-pre-wrap">{sandboxResult.stdout}</pre>
                          </div>
                        )}

                        {sandboxResult.stderr && (
                          <div>
                            <div className="text-[10px] text-red-400 uppercase">stderr:</div>
                            <pre className="text-red-300 whitespace-pre-wrap">{sandboxResult.stderr}</pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-600 text-xs">
                        Clique em "Executar no Sandbox" para rodar o código no ambiente isolado.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TECHNICAL LOGS */}
          {activeTab === 'logs' && (
            <div className="p-4 rounded-2xl bg-black/70 border border-white/10 font-mono text-xs text-slate-300 h-96 overflow-y-auto space-y-1">
              {logs.length === 0 ? (
                <div className="text-slate-600">Nenhum log registrado até o momento.</div>
              ) : (
                logs.map((lg, i) => (
                  <div
                    key={i}
                    className={`leading-relaxed ${
                      lg.includes('ROTA B')
                        ? 'text-cyan-300 font-bold'
                        : lg.includes('FALHA') || lg.includes('Erro')
                        ? 'text-red-400'
                        : lg.includes('concluído') || lg.includes('sucesso')
                        ? 'text-emerald-300'
                        : 'text-slate-300'
                    }`}
                  >
                    {lg}
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          )}
        </div>

        {/* Footer Prompt Input (Run custom tasks) */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex items-center gap-3">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleExecuteNewTask()}
            placeholder="Ex: 'Crie um site de login em React', 'Crie 5 slides em HTML', 'Corrija este código python'..."
            className="flex-1 px-4 py-2.5 rounded-2xl bg-white/[0.05] border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60"
          />
          <button
            onClick={() => handleExecuteNewTask()}
            disabled={isRunning || !customPrompt.trim()}
            className="px-5 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-lg shadow-cyan-500/20"
          >
            {isRunning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{isRunning ? 'Executando...' : 'Executar Agentes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

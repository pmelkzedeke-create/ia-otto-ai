import type { OttoHologramContent } from '../components/hologram/hologramTypes';
import type { OttoFile, DataHubPlan } from './dataHub';

export type OttoState = 'IDLE' | 'LISTENING' | 'THINKING' | 'EXECUTING' | 'SPEAKING' | 'ERROR';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type MemoryCategory = 'KNOWLEDGE' | 'LEARNED' | 'RESEARCH' | 'SYSTEM';

export interface OttoAction {
  action:
    | 'open_application'
    | 'open_url'
    | 'search_web'
    | 'embedded_youtube'
    | 'suggest_youtube_or_search'
    | 'open_memory_map'
    | 'create_folder'
    | 'list_files'
    | 'read_file'
    | 'write_file'
    | 'delete_file'
    | 'system_volume'
    | 'system_info'
    | 'execute_command'
    | 'clipboard'
    | 'screen_vision'
    | 'save_memory'
    | 'resize_element'
    | 'open_datahub'
    | 'organize_datahub'
    | 'detect_duplicates'
    | 'datahub_search'
    | 'preview_file'
    | 'open_settings'
    | 'open_terminal'
    | 'media_ffmpeg'
    | 'none';
  target?: string;
  parameters?: Record<string, any>;
  riskLevel: RiskLevel;
  reasoning?: string;
}

export type OttoPersonality = 'EXECUTIVO' | 'TECNICO' | 'DESCONTRAIDO' | 'SERIO' | 'CYBERPUNK';

export interface TaskStep {
  id: string;
  title: string;
  description?: string;
  targetFile?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  action?: OttoAction;
}

export interface AgentTaskPlan {
  id: string;
  title: string;
  description: string;
  steps: TaskStep[];
  currentStepIndex: number;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
}

export type AiRoute = 'ROTA_A' | 'ROTA_B';

export interface RouteDecision {
  route: AiRoute;
  routeName: string;
  providerType: string;
  reason: string;
  confidence: number;
  category:
    | 'casual_chat'
    | 'general_knowledge'
    | 'conceptual_explanation'
    | 'system_command'
    | 'code_generation'
    | 'code_fix'
    | 'code_presentation'
    | 'code_analysis'
    | 'project_scaffold'
    | 'script_creation';
}

export interface OrchestratorFile {
  name: string;
  content: string;
  language: string;
  path?: string;
  size?: number;
  originalContent?: string;
  isModified?: boolean;
}

export interface AgentHistoryEntry {
  agent: 'PLANNER' | 'CODER' | 'REVIEWER' | 'TESTER' | 'FIXER' | 'FINALIZER';
  action: string;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  timestamp: string;
  summary?: string;
  latencyMs?: number;
}

export interface TaskState {
  taskId: string;
  userRequest: string;
  taskType: 'code' | 'presentation' | 'refactor' | 'debug' | 'project' | 'script';
  currentStep: 'PLANNING' | 'CODING' | 'REVIEWING' | 'TESTING' | 'FIXING' | 'FINALIZING' | 'COMPLETED' | 'FAILED';
  plan: {
    title: string;
    summary: string;
    steps: Array<{ id: string; title: string; targetFile?: string; status: 'pending' | 'in_progress' | 'completed' | 'failed' }>;
  };
  files: OrchestratorFile[];
  agentHistory: AgentHistoryEntry[];
  errors: Array<{ file?: string; error: string; step: string; timestamp: string }>;
  testResults: Array<{
    file: string;
    passed: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
    executionTimeMs: number;
  }>;
  retryCount: number;
  logs: string[];
  metrics: {
    startTime: number;
    endTime?: number;
    totalDurationMs?: number;
    totalApiCalls: number;
    totalTokensUsed?: number;
  };
  finalResult?: {
    summary: string;
    speechResponse: string;
    createdFiles: Array<{ name: string; fullPath: string; size: number }>;
    artifact?: any;
  };
}

export interface SandboxResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  timedOut: boolean;
  language: string;
  runtimeUsed: string;
  error?: string;
  outputFiles?: Array<{ name: string; size: number }>;
}

export interface OttoProject {
  id: string;
  name: string;
  description: string;
  color: string;
  folderPath?: string;
  tags?: string[];
  createdAt: string;
}

export interface TemporaryMemoryItem {
  id: string;
  key: string;
  value: string;
  taskScope?: string;
  createdAt: string;
}

export interface OttoImageItem {
  url: string;
  alt?: string;
  title?: string;
  source?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

export interface KnowledgeSource {
  title: string;
  url: string;
  domain: string;
  snippet?: string;
}

export interface KnowledgeImage {
  url: string;
  caption?: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
}

export interface KeyFact {
  label: string;
  value: string;
}

export interface KnowledgeCard {
  id: string;
  title: string;
  subtitle?: string;
  summary: string;
  fullExtract?: string;
  heroImage?: string;
  images?: KnowledgeImage[];
  keyFacts?: KeyFact[];
  sources?: KnowledgeSource[];
  relatedQueries?: string[];
  category?: string;
}

export interface IntentResult {
  speechResponse: string;
  actions: OttoAction[];
  requiresConfirmation?: boolean;
  confirmationPrompt?: string;
  provider?: string;
  route?: AiRoute;
  routeDecision?: RouteDecision;
  taskState?: TaskState;
  learnedMemory?: {
    key: string;
    value: string;
    title: string;
    category: MemoryCategory;
    tags?: string[];
  };
  plan?: AgentTaskPlan;
  artifact?: any;
  knowledgeCard?: KnowledgeCard;
  images?: OttoImageItem[];
  temporaryMemory?: Record<string, string>;
  projectContext?: string;
}

export interface ActivityItem {
  id: string;
  timestamp: string;
  type: 'progress' | 'success' | 'error' | 'warning' | 'info';
  message: string;
  actionName?: string;
}

export interface SystemTelemetry {
  platform: string;
  release: string;
  type: string;
  arch: string;
  hostname: string;
  uptimeSeconds: number;
  cpuModel: string;
  cpuCores: number;
  cpuUsagePercent: number;
  totalMemoryBytes: number;
  freeMemoryBytes: number;
  usedMemoryBytes: number;
  memoryUsagePercent: number;
  nodeVersion: string;
  serverTime: string;
  batteryPercent?: number;
  /** false quando os dados são apenas o placeholder de servidor indisponível. */
  available?: boolean;
}

export interface WorkspaceItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  updatedAt: string;
}

export interface MemoryItem {
  id: string;
  key: string;
  value: string;
  title?: string;
  category?: MemoryCategory;
  summary?: string;
  tags?: string[];
  createdAt: string;
  color?: string;
  orbitDistance?: number;
  size?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'otto';
  text: string;
  timestamp: string;
  route?: AiRoute;
  routeDecision?: RouteDecision;
  taskState?: TaskState;
  actions?: OttoAction[];
  artifact?: any;
  knowledgeCard?: KnowledgeCard;
  images?: OttoImageItem[];
  holograms?: OttoHologramContent[];
  dataHubFiles?: OttoFile[];
  dataHubPlan?: DataHubPlan;
  attachedImage?: { dataUrl: string; name?: string; size?: number; mimeType?: string };
  attachedFile?: { name: string; size?: number; type?: string; dataUrl?: string };
  options?: Array<{ label: string; actionText: string; icon?: 'youtube' | 'search' }>;
}

export interface OttoPermissions {
  browser: boolean;
  apps: boolean;
  files: boolean;
  terminal: boolean;
  system: boolean;
}

export interface OttoSettings {
  voiceEnabled: boolean;
  voiceVolume: number; // 0 to 1
  voiceRate: number; // 0.5 to 2
  voicePitch: number; // 0.5 to 2
  selectedVoiceURI: string;
  useGeminiTTS?: boolean;
  geminiVoiceId?: string;
  useElevenLabs: boolean;
  elevenVoiceId: string;
  useRespeecher: boolean;
  respeecherVoiceId: string;
  wakeWordEnabled: boolean;
  continuousListening: boolean;
  autoApproveMediumRisk: boolean;
  soundEffectsEnabled: boolean;
  themeMode?: 'liquid' | 'liquid-light';
  designSystem?: 'liquid';
  themeAppearance?: 'system' | 'dark' | 'light';
  accentColor?: string;
  enableAnimations?: boolean;
  enableTransparency?: boolean;
  personality: OttoPersonality;
  adaptiveResponses: boolean;
  agentModeEnabled: boolean;
  activeProjectId: string;
  permissions: OttoPermissions;
}

// Desktop Global Overlay & Vision Bridge for Windows and Multi-Window environments
import { OttoState, ChatMessage, OttoAction } from '../types/otto';
import { ApiBridge } from './apiBridge';

export type VisionMode = 'OFF' | 'ASSIST' | 'LIVE';

export interface OverlayPosition {
  x: number;
  y: number;
}

export interface OverlayState {
  isOpen: boolean;
  isAlwaysOnTop: boolean;
  startWithWindows: boolean;
  visionMode: VisionMode;
  position: OverlayPosition;
  isCompact: boolean;
  isPipActive: boolean;
}

const OVERLAY_STORAGE_KEY = 'otto_desktop_overlay_config_v1';
const OVERLAY_POS_KEY = 'otto_desktop_overlay_pos_v1';

export class DesktopOverlayBridge {
  private static instance: DesktopOverlayBridge;
  private channel: BroadcastChannel | null = null;
  private pipWindow: Window | null = null;
  private liveVisionStream: MediaStream | null = null;
  private liveVisionTimer: any = null;
  private isAnalyzingLiveFrame: boolean = false;
  private listeners: Set<(state: OverlayState) => void> = new Set();
  private visionListeners: Set<(mode: VisionMode, lastAnalysis?: string) => void> = new Set();
  private commandListeners: Set<(command: string) => void> = new Set();

  private state: OverlayState = {
    isOpen: true,
    isAlwaysOnTop: true,
    startWithWindows: false,
    visionMode: 'OFF',
    position: { x: typeof window !== 'undefined' ? window.innerWidth - 130 : 800, y: typeof window !== 'undefined' ? window.innerHeight - 140 : 600 },
    isCompact: true,
    isPipActive: false,
  };

  private constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedConfig = localStorage.getItem(OVERLAY_STORAGE_KEY);
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig);
          this.state = { ...this.state, ...parsed };
        }

        const savedPos = localStorage.getItem(OVERLAY_POS_KEY);
        if (savedPos) {
          const parsedPos = JSON.parse(savedPos);
          if (typeof parsedPos.x === 'number' && typeof parsedPos.y === 'number') {
            this.state.position = this.clampPosition(parsedPos.x, parsedPos.y);
          }
        }
      } catch {}

      if ('BroadcastChannel' in window) {
        try {
          this.channel = new BroadcastChannel('otto_overlay_bridge');
          this.channel.onmessage = (event) => {
            this.handleChannelMessage(event.data);
          };
        } catch {}
      }

      this.setupGlobalHotkeys();
    }
  }

  public static getInstance(): DesktopOverlayBridge {
    if (!DesktopOverlayBridge.instance) {
      DesktopOverlayBridge.instance = new DesktopOverlayBridge();
    }
    return DesktopOverlayBridge.instance;
  }

  public getState(): OverlayState {
    return { ...this.state };
  }

  public subscribe(listener: (state: OverlayState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onVisionChange(listener: (mode: VisionMode, lastAnalysis?: string) => void): () => void {
    this.visionListeners.add(listener);
    return () => {
      this.visionListeners.delete(listener);
    };
  }

  public onCommand(listener: (command: string) => void): () => void {
    this.commandListeners.add(listener);
    return () => {
      this.commandListeners.delete(listener);
    };
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((fn) => fn(s));
    this.saveConfig();

    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'STATE_UPDATE', state: s });
      } catch {}
    }
  }

  private saveConfig() {
    try {
      localStorage.setItem(
        OVERLAY_STORAGE_KEY,
        JSON.stringify({
          isOpen: this.state.isOpen,
          isAlwaysOnTop: this.state.isAlwaysOnTop,
          startWithWindows: this.state.startWithWindows,
          visionMode: this.state.visionMode,
          isCompact: this.state.isCompact,
        })
      );
      localStorage.setItem(OVERLAY_POS_KEY, JSON.stringify(this.state.position));
    } catch {}
  }

  public setPosition(x: number, y: number) {
    const clamped = this.clampPosition(x, y);
    this.state.position = clamped;
    this.notify();
  }

  public clampPosition(x: number, y: number): OverlayPosition {
    if (typeof window === 'undefined') return { x, y };
    const maxX = Math.max(10, window.innerWidth - 90);
    const maxY = Math.max(10, window.innerHeight - 90);
    return {
      x: Math.max(10, Math.min(maxX, x)),
      y: Math.max(10, Math.min(maxY, y)),
    };
  }

  public setAlwaysOnTop(val: boolean) {
    this.state.isAlwaysOnTop = val;
    this.notify();
  }

  public setStartWithWindows(val: boolean) {
    this.state.startWithWindows = val;
    this.notify();
  }

  public setCompact(val: boolean) {
    this.state.isCompact = val;
    this.notify();
  }

  public toggleOverlay(forced?: boolean) {
    this.state.isOpen = forced !== undefined ? forced : !this.state.isOpen;
    this.notify();
  }

  // OTTO VISION: Set Vision State (OFF | ASSIST | LIVE)
  public async setVisionMode(
    mode: VisionMode,
    onAnalysisCallback?: (response: string) => void
  ): Promise<boolean> {
    if (this.state.visionMode === mode) return true;

    if (mode === 'OFF') {
      this.stopLiveVisionLoop();
      this.state.visionMode = 'OFF';
      this.notify();
      this.visionListeners.forEach((fn) => fn('OFF'));
      return true;
    }

    if (mode === 'ASSIST') {
      this.stopLiveVisionLoop();
      this.state.visionMode = 'ASSIST';
      this.notify();
      this.visionListeners.forEach((fn) => fn('ASSIST'));
      return true;
    }

    if (mode === 'LIVE') {
      const started = await this.startLiveVisionLoop(onAnalysisCallback);
      if (started) {
        this.state.visionMode = 'LIVE';
        this.notify();
        this.visionListeners.forEach((fn) => fn('LIVE'));
        return true;
      }
      return false;
    }

    return false;
  }

  // Single Frame Vision Capture (ASSIST Mode or explicit user trigger)
  public async captureAndAnalyzeScreen(question?: string): Promise<{ speechResponse: string; analysis: string }> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      throw new Error('Captura de tela não suportada neste ambiente.');
    }

    let stream = this.liveVisionStream;
    let ownStream = false;

    if (!stream || !stream.active) {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: false,
      });
      ownStream = true;
    }

    try {
      const track = stream.getVideoTracks()[0];
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();

      await new Promise((r) => setTimeout(r, 250));

      const canvas = document.createElement('canvas');
      canvas.width = Math.min(1920, video.videoWidth || 1280);
      canvas.height = Math.min(1080, video.videoHeight || 720);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      if (ownStream) {
        track.stop();
        stream.getTracks().forEach((t) => t.stop());
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const res = await ApiBridge.analyzeScreen(dataUrl, question || 'Analise a tela atual, o aplicativo em foco e os elementos chave.');

      this.visionListeners.forEach((fn) => fn(this.state.visionMode, res.analysis));
      return res;
    } catch (err: any) {
      if (ownStream && stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      throw err;
    }
  }

  // Continuous Live Vision Analysis Stream (LIVE Mode)
  private async startLiveVisionLoop(onAnalysisCallback?: (response: string) => void): Promise<boolean> {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) return false;

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: false,
      });

      this.liveVisionStream = stream;

      stream.getVideoTracks()[0].onended = () => {
        this.setVisionMode('OFF');
      };

      // Periodic Live Analysis loop every 12 seconds
      const runCycle = async () => {
        if (!this.liveVisionStream || !this.liveVisionStream.active || this.state.visionMode !== 'LIVE') {
          return;
        }

        if (this.isAnalyzingLiveFrame) return;
        this.isAnalyzingLiveFrame = true;

        try {
          const res = await this.captureAndAnalyzeScreen('Identifique o software ativo e alterações visuais relevantes na tela de forma contínua.');
          if (res && res.speechResponse) {
            onAnalysisCallback?.(res.speechResponse);
          }
        } catch {
        } finally {
          this.isAnalyzingLiveFrame = false;
        }
      };

      // Run initial check and set interval
      runCycle();
      this.liveVisionTimer = setInterval(runCycle, 12000);
      return true;
    } catch (err) {
      return false;
    }
  }

  private stopLiveVisionLoop() {
    if (this.liveVisionTimer) {
      clearInterval(this.liveVisionTimer);
      this.liveVisionTimer = null;
    }
    if (this.liveVisionStream) {
      try {
        this.liveVisionStream.getTracks().forEach((t) => t.stop());
      } catch {}
      this.liveVisionStream = null;
    }
    this.isAnalyzingLiveFrame = false;
  }

  public getPipWindow(): Window | null {
    return this.pipWindow;
  }

  // Request Native Document Picture-in-Picture window (always-on-top over other apps in Chromium)
  public async requestPipWindow(): Promise<Window | null> {
    if (typeof window === 'undefined') return null;

    if ('documentPictureInPicture' in window) {
      try {
        const pip = await (window as any).documentPictureInPicture.requestWindow({
          width: 240,
          height: 280,
        });
        this.pipWindow = pip;
        this.state.isPipActive = true;
        this.notify();

        pip.document.title = 'OTTO Desktop Overlay';
        pip.document.body.style.margin = '0';
        pip.document.body.style.padding = '0';
        pip.document.body.style.background = '#0a0c10';
        pip.document.body.style.overflow = 'hidden';
        pip.document.body.style.display = 'flex';
        pip.document.body.style.alignItems = 'center';
        pip.document.body.style.justifyContent = 'center';
        pip.document.body.style.width = '100vw';
        pip.document.body.style.height = '100vh';

        pip.addEventListener('pagehide', () => {
          this.pipWindow = null;
          this.state.isPipActive = false;
          this.notify();
        });

        // Copy styles to PiP document
        [...document.styleSheets].forEach((styleSheet) => {
          try {
            const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
            const style = pip.document.createElement('style');
            style.textContent = cssRules;
            pip.document.head.appendChild(style);
          } catch {
            const link = pip.document.createElement('link');
            if (styleSheet.href) {
              link.rel = 'stylesheet';
              link.type = styleSheet.type;
              link.media = styleSheet.media.mediaText;
              link.href = styleSheet.href;
              pip.document.head.appendChild(link);
            }
          }
        });

        return pip;
      } catch (err) {
        console.warn('PiP window failed, falling back to desktop popup:', err);
      }
    }

    // Fallback: Open frameless popup window
    try {
      const popup = window.open(
        window.location.href + '#overlay',
        'OTTO_Overlay',
        'width=240,height=280,menubar=no,toolbar=no,location=no,status=no,resizable=yes'
      );
      if (popup) {
        this.pipWindow = popup;
        this.state.isPipActive = true;
        this.notify();
        return popup;
      }
    } catch {}

    return null;
  }

  public closePipWindow() {
    if (this.pipWindow) {
      try {
        this.pipWindow.close();
      } catch {}
      this.pipWindow = null;
      this.state.isPipActive = false;
      this.notify();
    }
  }

  // Global keyboard shortcut: Alt+O or Ctrl+Shift+O to toggle OTTO from any app
  private setupGlobalHotkeys() {
    window.addEventListener('keydown', (e) => {
      if ((e.altKey && e.key.toLowerCase() === 'o') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'o')) {
        e.preventDefault();
        this.toggleOverlay();
      }
    });
  }

  private handleChannelMessage(data: any) {
    if (!data || typeof data !== 'object') return;
    if (data.type === 'STATE_UPDATE' && data.state) {
      this.state = { ...this.state, ...data.state };
      this.listeners.forEach((fn) => fn(this.getState()));
    } else if (data.type === 'EXEC_COMMAND' && data.command) {
      this.commandListeners.forEach((fn) => fn(data.command));
    }
  }

  public dispatchCommand(command: string) {
    this.commandListeners.forEach((fn) => fn(command));
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'EXEC_COMMAND', command });
      } catch {}
    }
  }
}

export const desktopOverlayBridge = DesktopOverlayBridge.getInstance();

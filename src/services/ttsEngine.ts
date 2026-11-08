// High-Quality Speech Synthesis Engine with ElevenLabs AI, Respeecher Space API, and Browser TTS Fallback

export interface TTSOptions {
  volume?: number;
  rate?: number;
  pitch?: number;
  voiceURI?: string;
  useGeminiTTS?: boolean;
  geminiVoiceId?: string;
  elevenVoiceId?: string;
  useElevenLabs?: boolean;
  respeecherVoiceId?: string;
  useRespeecher?: boolean;
}

export interface GeminiVoice {
  voiceId: string;
  name: string;
  lang?: string;
  description?: string;
}

export interface ElevenVoice {
  voiceId: string;
  name: string;
  category?: string;
  description?: string;
  previewUrl?: string;
}

export interface RespeecherVoice {
  voiceId: string;
  name: string;
  lang?: string;
  description?: string;
}

// Built-in curated Google AI Studio / Gemini TTS voices
export const DEFAULT_GEMINI_VOICES: GeminiVoice[] = [
  { voiceId: 'Puck', name: 'Puck (Google AI Studio)', lang: 'pt-BR', description: 'Voz Masculina Natural, Clara e Dinâmica' },
  { voiceId: 'Kore', name: 'Kore (Google AI Studio)', lang: 'pt-BR', description: 'Voz Feminina Clara e Executiva' },
  { voiceId: 'Zephyr', name: 'Zephyr (Google AI Studio)', lang: 'pt-BR', description: 'Voz Suave, Tecnológica e Acolhedora' },
  { voiceId: 'Fenrir', name: 'Fenrir (Google AI Studio)', lang: 'pt-BR', description: 'Voz Profunda, Marcante e Autoritária' },
  { voiceId: 'Charon', name: 'Charon (Google AI Studio)', lang: 'pt-BR', description: 'Voz Calma, Solene e Expressiva' },
];

// Built-in curated ElevenLabs voices
export const DEFAULT_ELEVEN_VOICES: ElevenVoice[] = [
  { voiceId: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', description: 'Voz equilibrada, confiável e executiva' },
  { voiceId: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Voz profunda, calma e natural' },
  { voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Voz feminina clara, profissional e amigável' },
  { voiceId: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'Voz autoritária, estilo assistente inteligente' },
  { voiceId: 'piTKgcLEGmPE4e6mEKli', name: 'Nicole', description: 'Voz suave, tecnológica e agradável' },
  { voiceId: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy', description: 'Voz acolhedora e precisa' },
];

// Built-in curated Respeecher Space API voices
export const DEFAULT_RESPEECHER_VOICES: RespeecherVoice[] = [
  { voiceId: 'daniela', name: 'Daniela (Brasil)', lang: 'pt-BR', description: 'Voz Neural Feminina Clara e Natural' },
  { voiceId: 'barros-conversational', name: 'Barros Conversacional', lang: 'pt-BR', description: 'Voz Neural Masculina Fluida e Expressiva' },
  { voiceId: 'barros-chatbot', name: 'Barros Assistente', lang: 'pt-BR', description: 'Voz Neural de Assistente Otimizada' },
  { voiceId: 'barros-news', name: 'Barros Locutor', lang: 'pt-BR', description: 'Voz Profissional e Articulada' },
  { voiceId: 'samantha', name: 'Samantha (Inglês)', lang: 'en-US', description: 'Voz Neural de Baixa Latência' },
  { voiceId: 'marta', name: 'Marta (Inglês)', lang: 'en-US', description: 'Voz Executiva e Amigável' },
];

class TTSEngine {
  private isSpeakingNow: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private currentAudioUrl: string | null = null;
  private availableVoices: SpeechSynthesisVoice[] = [];
  private geminiVoices: GeminiVoice[] = DEFAULT_GEMINI_VOICES;
  private elevenVoices: ElevenVoice[] = DEFAULT_ELEVEN_VOICES;
  private respeecherVoices: RespeecherVoice[] = DEFAULT_RESPEECHER_VOICES;
  private speakingListeners: Set<(speaking: boolean) => void> = new Set();
  private beforeSpeakListeners: Set<(text: string) => void> = new Set();
  private lastSpokenText: string = '';
  private customApiKey: string = '';
  private customRespeecherApiKey: string = '';
  private geminiAvailable: boolean = true;
  private elevenLabsAvailable: boolean = true;
  private elevenLabsQuotaExceeded: boolean = false;
  private respeecherAvailable: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.customApiKey = localStorage.getItem('otto_elevenlabs_api_key') || '';
        this.customRespeecherApiKey = localStorage.getItem('otto_respeecher_api_key') || '';
      } catch {}

      if ('speechSynthesis' in window) {
        this.loadVoices();
        window.speechSynthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    }
    this.checkGeminiStatus().then(() => {
      this.fetchGeminiVoices();
    });
    this.checkElevenLabsStatus().then(() => {
      this.fetchElevenVoices();
    });
    this.checkRespeecherStatus().then(() => {
      this.fetchRespeecherVoices();
    });
  }

  public isGeminiAvailable(): boolean {
    return this.geminiAvailable;
  }

  public async checkGeminiStatus(): Promise<{ available: boolean }> {
    try {
      const res = await fetch('/api/tts/gemini/status');
      if (res.ok) {
        const data = await res.json();
        this.geminiAvailable = Boolean(data.available);
        return { available: this.geminiAvailable };
      }
    } catch {}
    return { available: this.geminiAvailable };
  }

  public async fetchGeminiVoices(): Promise<GeminiVoice[]> {
    try {
      const res = await fetch('/api/tts/gemini/voices');
      if (res.ok) {
        const data = await res.json();
        if (data.voices && data.voices.length > 0) {
          this.geminiVoices = data.voices;
        }
      }
    } catch {}
    return this.geminiVoices;
  }

  public getGeminiVoices(): GeminiVoice[] {
    return this.geminiVoices;
  }

  public setCustomApiKey(key: string) {
    this.customApiKey = key.trim();
    try {
      if (this.customApiKey) {
        localStorage.setItem('otto_elevenlabs_api_key', this.customApiKey);
      } else {
        localStorage.removeItem('otto_elevenlabs_api_key');
      }
    } catch {}
    this.checkElevenLabsStatus();
  }

  public getCustomApiKey(): string {
    return this.customApiKey;
  }

  public setCustomRespeecherApiKey(key: string) {
    this.customRespeecherApiKey = key.trim();
    try {
      if (this.customRespeecherApiKey) {
        localStorage.setItem('otto_respeecher_api_key', this.customRespeecherApiKey);
      } else {
        localStorage.removeItem('otto_respeecher_api_key');
      }
    } catch {}
    this.checkRespeecherStatus();
  }

  public getCustomRespeecherApiKey(): string {
    return this.customRespeecherApiKey;
  }

  public isElevenLabsAvailable(): boolean {
    return this.elevenLabsAvailable && !this.elevenLabsQuotaExceeded;
  }

  public isQuotaExceeded(): boolean {
    return this.elevenLabsQuotaExceeded;
  }

  public isRespeecherAvailable(): boolean {
    return this.respeecherAvailable;
  }

  public async checkElevenLabsStatus(): Promise<{ available: boolean; quotaExceeded: boolean }> {
    try {
      const headers: Record<string, string> = {};
      if (this.customApiKey) {
        headers['x-elevenlabs-key'] = this.customApiKey;
      }
      const res = await fetch('/api/tts/elevenlabs/status', { headers });
      if (res.ok) {
        const data = await res.json();
        this.elevenLabsAvailable = Boolean(data.available);
        this.elevenLabsQuotaExceeded = Boolean(data.quotaExceeded);
        return { available: this.elevenLabsAvailable, quotaExceeded: this.elevenLabsQuotaExceeded };
      }
    } catch {
      // Offline or network error
    }
    return { available: this.elevenLabsAvailable, quotaExceeded: this.elevenLabsQuotaExceeded };
  }

  public async checkRespeecherStatus(): Promise<{ available: boolean }> {
    try {
      const headers: Record<string, string> = {};
      if (this.customRespeecherApiKey) {
        headers['x-respeecher-key'] = this.customRespeecherApiKey;
      }
      const res = await fetch('/api/tts/respeecher/status', { headers });
      if (res.ok) {
        const data = await res.json();
        this.respeecherAvailable = Boolean(data.available);
        return { available: this.respeecherAvailable };
      }
    } catch {
      // Offline or network error
    }
    return { available: this.respeecherAvailable };
  }

  private loadVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.availableVoices = window.speechSynthesis.getVoices();
  }

  public async fetchElevenVoices(): Promise<ElevenVoice[]> {
    try {
      const headers: Record<string, string> = {};
      if (this.customApiKey) {
        headers['x-elevenlabs-key'] = this.customApiKey;
      }
      const res = await fetch('/api/tts/elevenlabs/voices', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.quotaExceeded || data.available === false) {
          this.elevenLabsAvailable = false;
          this.elevenLabsQuotaExceeded = true;
        }
        if (data.voices && data.voices.length > 0) {
          this.elevenVoices = data.voices;
        }
      }
    } catch {
      // Keep default curated list
    }
    return this.elevenVoices;
  }

  public async fetchRespeecherVoices(): Promise<RespeecherVoice[]> {
    try {
      const headers: Record<string, string> = {};
      if (this.customRespeecherApiKey) {
        headers['x-respeecher-key'] = this.customRespeecherApiKey;
      }
      const res = await fetch('/api/tts/respeecher/voices', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.voices && data.voices.length > 0) {
          this.respeecherVoices = data.voices;
        }
      }
    } catch {
      // Keep default curated list
    }
    return this.respeecherVoices;
  }

  public getElevenVoices(): ElevenVoice[] {
    return this.elevenVoices;
  }

  public getRespeecherVoices(): RespeecherVoice[] {
    return this.respeecherVoices;
  }

  public getBrowserVoices(): SpeechSynthesisVoice[] {
    if (this.availableVoices.length === 0 && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
    }
    return this.availableVoices;
  }

  public registerSpeakingListener(callback: (speaking: boolean) => void): () => void {
    this.speakingListeners.add(callback);
    return () => {
      this.speakingListeners.delete(callback);
    };
  }

  public registerBeforeSpeakListener(callback: (text: string) => void): () => void {
    this.beforeSpeakListeners.add(callback);
    return () => {
      this.beforeSpeakListeners.delete(callback);
    };
  }

  private notifySpeaking(speaking: boolean) {
    this.isSpeakingNow = speaking;
    this.speakingListeners.forEach((cb) => {
      try {
        cb(speaking);
      } catch (err) {
        console.error('[TTSEngine] Speaking listener error:', err);
      }
    });
  }

  private notifyBeforeSpeak(text: string) {
    this.beforeSpeakListeners.forEach((cb) => {
      try {
        cb(text);
      } catch (err) {
        console.error('[TTSEngine] BeforeSpeak listener error:', err);
      }
    });
  }

  public getLastSpokenText(): string {
    return this.lastSpokenText;
  }

  public async speak(
    text: string,
    options: TTSOptions = {},
    onEnd?: () => void,
    onStart?: () => void
  ): Promise<void> {
    this.stop(); // Stop any active speech

    if (!text || text.trim() === '') {
      onEnd?.();
      return;
    }

    this.lastSpokenText = text;

    // CRITICAL: Immediately notify beforeSpeak and speaking listeners
    // BEFORE starting network fetch or speech synthesis so microphone is
    // muted synchronously and cannot capture background audio or its own response
    this.notifyBeforeSpeak(text);
    this.notifySpeaking(true);

    // ==========================================
    // TIER 0: Google AI Studio Gemini TTS (gemini-3.8-flash-lite-tts)
    // ==========================================
    const useGemini = options.useGeminiTTS !== false;
    if (useGemini && this.geminiAvailable) {
      try {
        const voiceName = options.geminiVoiceId || 'Puck';
        const res = await fetch('/api/tts/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voiceName,
          }),
        });

        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const json = await res.json();
            if (json.fallback || json.available === false) {
              this.geminiAvailable = false;
              setTimeout(() => {
                this.checkGeminiStatus();
              }, 60000);
              // Fallthrough to next tier
            }
          } else {
            const blob = await res.blob();
            if (blob.size >= 100) {
              return await this.playAudioBlob(blob, options, onEnd, onStart);
            }
          }
        }
      } catch {
        // Fallthrough to Tier 1
      }
    }

    // ==========================================
    // TIER 1: ElevenLabs AI Voices
    // ==========================================
    const useEleven = options.useElevenLabs !== false;
    if (useEleven && this.elevenLabsAvailable && !this.elevenLabsQuotaExceeded) {
      try {
        const voiceId = options.elevenVoiceId || 'JBFqnCBsd6RMkjVDRZzb';
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (this.customApiKey) {
          headers['x-elevenlabs-key'] = this.customApiKey;
        }

        const res = await fetch('/api/tts/elevenlabs', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            text,
            voiceId,
            modelId: 'eleven_multilingual_v2',
          }),
        });

        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const json = await res.json();
            if (json.fallback || json.available === false || json.reason === 'quota_exceeded') {
              this.elevenLabsQuotaExceeded = true;
              this.elevenLabsAvailable = false;
              // Fallthrough to Respeecher
            }
          } else {
            const blob = await res.blob();
            if (blob.size >= 100) {
              return await this.playAudioBlob(blob, options, onEnd, onStart);
            }
          }
        } else {
          this.elevenLabsAvailable = false;
        }
      } catch {
        // Fallthrough to Tier 2
      }
    }

    // ==========================================
    // TIER 2: Respeecher Space API (Neural AI Voice Fallback & Primary)
    // ==========================================
    const useRespeecher = options.useRespeecher !== false;
    if (useRespeecher && this.respeecherAvailable) {
      try {
        const voiceId = options.respeecherVoiceId || 'daniela';
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (this.customRespeecherApiKey) {
          headers['x-respeecher-key'] = this.customRespeecherApiKey;
        }

        const res = await fetch('/api/tts/respeecher', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            text,
            voiceId,
          }),
        });

        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const json = await res.json();
            if (json.fallback || json.available === false) {
              // Fallthrough to Web Speech API
            }
          } else {
            const blob = await res.blob();
            if (blob.size >= 100) {
              return await this.playAudioBlob(blob, options, onEnd, onStart);
            }
          }
        }
      } catch {
        // Fallthrough to Tier 3
      }
    }

    // ==========================================
    // TIER 3: Web Speech API (Browser Native Speech Synthesis)
    // ==========================================
    return this.speakWithBrowserTTS(text, options, onEnd, onStart);
  }

  private playAudioBlob(
    blob: Blob,
    options: TTSOptions,
    onEnd?: () => void,
    onStart?: () => void
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      const audioUrl = URL.createObjectURL(blob);
      this.currentAudioUrl = audioUrl;
      const audio = new Audio(audioUrl);
      this.currentAudioElement = audio;
      audio.volume = options.volume !== undefined ? options.volume : 1.0;

      audio.onplay = () => {
        this.notifySpeaking(true);
        onStart?.();
      };

      audio.onended = () => {
        this.cleanupAudio();
        this.notifySpeaking(false);
        onEnd?.();
        resolve();
      };

      audio.onerror = () => {
        this.cleanupAudio();
        this.speakWithBrowserTTS(this.lastSpokenText, options, onEnd, onStart).then(resolve);
      };

      audio.play().catch(() => {
        this.cleanupAudio();
        this.speakWithBrowserTTS(this.lastSpokenText, options, onEnd, onStart).then(resolve);
      });
    });
  }

  private speakWithBrowserTTS(
    text: string,
    options: TTSOptions = {},
    onEnd?: () => void,
    onStart?: () => void
  ): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        this.notifySpeaking(false);
        onEnd?.();
        resolve();
        return;
      }

      const cleaned = text
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[#*_~>]/g, '')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleaned);
      const voices = this.getBrowserVoices();

      if (options.voiceURI) {
        const found = voices.find((v) => v.voiceURI === options.voiceURI);
        if (found) utterance.voice = found;
      } else {
        const pt = voices.find((v) => v.lang.startsWith('pt') || v.lang.includes('BR'));
        if (pt) utterance.voice = pt;
      }

      utterance.volume = options.volume !== undefined ? options.volume : 0.95;
      utterance.rate = options.rate !== undefined ? options.rate : 1.05;
      utterance.pitch = options.pitch !== undefined ? options.pitch : 1.0;

      utterance.onstart = () => {
        this.notifySpeaking(true);
        onStart?.();
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        this.notifySpeaking(false);
        onEnd?.();
        resolve();
      };

      utterance.onerror = () => {
        this.currentUtterance = null;
        this.notifySpeaking(false);
        onEnd?.();
        resolve();
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    });
  }

  private cleanupAudio() {
    if (this.currentAudioUrl) {
      URL.revokeObjectURL(this.currentAudioUrl);
      this.currentAudioUrl = null;
    }
    this.currentAudioElement = null;
  }

  public stop() {
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {}
      this.cleanupAudio();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
    this.notifySpeaking(false);
  }

  public isSpeaking(): boolean {
    return this.isSpeakingNow;
  }
}

export const ttsEngine = new TTSEngine();

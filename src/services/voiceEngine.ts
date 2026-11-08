// Bulletproof Hybrid Voice Engine:
// 1. Requests explicit getUserMedia stream (forces browser microphone icon/permission prompt)
// 2. Streams real-time speech recognition via Web Speech API (when supported)
// 3. Simultaneously captures high-fidelity audio via MediaRecorder
// 4. Automatically falls back to Gemini Multimodal Audio Transcription (/api/transcribe-audio) if Web Speech is blocked or unsupported

import { ttsEngine } from './ttsEngine';
import { audioAnalyzer } from './audioAnalyzer';

export interface VoiceEngineCallbacks {
  onInterimResult?: (text: string) => void;
  onFinalResult: (text: string) => void;
  onWakeWordDetected?: (detectedPhrase: string) => void;
  onInterruption?: () => void;
  onError?: (errorMsg: string) => void;
  onStateChange?: (isListening: boolean) => void;
  onModeChange?: (mode: 'STANDBY' | 'LISTENING_COMMAND') => void;
}

class VoiceEngine {
  private recognition: any = null;
  private isListening: boolean = false;
  private userExplicitlyMuted: boolean = false;
  private isTTSActive: boolean = false;
  private wakeWordActive: boolean = true;
  private awaitingCommand: boolean = false;
  private callbacks: VoiceEngineCallbacks | null = null;
  private isSpeechSupported: boolean = false;

  private silenceTimer: any = null;
  private commandTimeoutTimer: any = null;
  private ttsCooldownTimer: any = null;
  private lastAssistantSpeech: string = '';
  private blockEchoUntil: number = 0;
  private readonly POST_TTS_DEBOUNCE_MS = 600;

  // MediaRecorder for guaranteed Gemini Fallback
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private mediaStream: MediaStream | null = null;
  private hasReceivedSpeechResult: boolean = false;
  private isProcessingFallback: boolean = false;
  private micPermissionDenied: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        this.isSpeechSupported = true;
      }
    }

    // Auto-pause listening while OTTO speaks
    ttsEngine.registerBeforeSpeakListener((text: string) => {
      this.handleTTSStarted(text);
    });

    ttsEngine.registerSpeakingListener((speaking: boolean) => {
      if (speaking) {
        this.handleTTSStarted();
      } else {
        this.handleTTSFinished();
      }
    });
  }

  public checkSupport(): boolean {
    return true; // We always support microphone via MediaRecorder + Gemini, even if Web Speech is missing!
  }

  public handleTTSStarted(spokenText?: string) {
    this.isTTSActive = true;
    if (spokenText) {
      this.lastAssistantSpeech = spokenText;
    }

    if (this.ttsCooldownTimer) {
      clearTimeout(this.ttsCooldownTimer);
      this.ttsCooldownTimer = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    this.stopAllAudioCapture();
    this.callbacks?.onInterimResult?.('');
  }

  public handleTTSFinished() {
    if (this.ttsCooldownTimer) {
      clearTimeout(this.ttsCooldownTimer);
      this.ttsCooldownTimer = null;
    }

    this.isTTSActive = false;
    this.blockEchoUntil = Date.now() + this.POST_TTS_DEBOUNCE_MS;

    this.ttsCooldownTimer = setTimeout(() => {
      this.ttsCooldownTimer = null;
      if (this.isTTSActive || this.userExplicitlyMuted || ttsEngine.isSpeaking()) {
        return;
      }

      this.awaitingCommand = !this.wakeWordActive;
      if (this.wakeWordActive || this.awaitingCommand) {
        this.startListening();
      }
    }, this.POST_TTS_DEBOUNCE_MS);
  }

  private isEchoOfAssistant(transcript: string): boolean {
    if (!this.lastAssistantSpeech || !this.lastAssistantSpeech.trim()) {
      return false;
    }

    const clean = (str: string) =>
      str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const cleanTranscript = clean(transcript);
    const cleanAssistant = clean(this.lastAssistantSpeech);

    if (!cleanTranscript || !cleanAssistant) return false;

    const wakePhrases = ['ola otto', 'oi otto', 'otto', 'ei otto'];
    if (wakePhrases.includes(cleanTranscript) && !cleanAssistant.startsWith(cleanTranscript)) {
      return false;
    }

    if (cleanTranscript.length >= 4 && cleanAssistant.includes(cleanTranscript)) {
      return true;
    }

    return false;
  }

  // Ensures microphone hardware permission is acquired and browser recording indicator lights up
  public async ensureMicrophonePermission(): Promise<MediaStream | null> {
    try {
      if (this.mediaStream && this.mediaStream.active) {
        return this.mediaStream;
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        this.mediaStream = stream;
        return stream;
      }
    } catch (err: any) {
      console.warn('[VoiceEngine] Microphone permission error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.callbacks?.onError?.(
          'Microfone bloqueado. Clique no ícone de permissão do navegador para liberar o microfone.'
        );
      }
    }
    return null;
  }

  public init(callbacks: VoiceEngineCallbacks, wakeWord = true) {
    this.callbacks = callbacks;
    this.wakeWordActive = wakeWord;
    this.userExplicitlyMuted = false;

    // Initialize Web Speech API if browser supports it
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      try {
        if (this.recognition) {
          this.recognition.onstart = null;
          this.recognition.onresult = null;
          this.recognition.onerror = null;
          this.recognition.onend = null;
          try {
            this.recognition.abort();
          } catch {}
          this.recognition = null;
        }

        this.recognition = new SpeechRecognitionClass();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'pt-BR';
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
          this.isListening = true;
          this.callbacks?.onStateChange?.(true);
        };

        this.recognition.onresult = (event: any) => {
          const now = Date.now();
          if (this.isTTSActive || now < this.blockEchoUntil || ttsEngine.isSpeaking()) {
            return;
          }

          let interimText = '';
          let finalText = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalText += transcript;
            } else {
              interimText += transcript;
            }
          }

          const currentStream = (finalText || interimText).toLowerCase().trim();
          if (!currentStream) return;

          if (this.isEchoOfAssistant(currentStream)) {
            return;
          }

          this.hasReceivedSpeechResult = true;

          // 1. Interruption command
          if (
            currentStream.includes('otto pare') ||
            currentStream.includes('pare otto') ||
            currentStream.includes('otto cala') ||
            currentStream.includes('otto silêncio') ||
            currentStream.includes('cancelar')
          ) {
            this.callbacks?.onInterruption?.();
            return;
          }

          // 2. Wake Word Detection (Standby mode)
          if (this.wakeWordActive && !this.awaitingCommand) {
            const wakePhrases = [
              'olá otto',
              'ola otto',
              'oi otto',
              'ei otto',
              'hey otto',
              'ok otto',
              'otto',
            ];

            const foundWake = wakePhrases.some((phrase) => {
              return (
                currentStream === phrase ||
                currentStream.startsWith(phrase + ' ') ||
                currentStream.endsWith(' ' + phrase)
              );
            });

            if (foundWake) {
              this.awaitingCommand = true;
              this.resetCommandTimeout();
              this.callbacks?.onWakeWordDetected?.(currentStream);
              this.callbacks?.onModeChange?.('LISTENING_COMMAND');

              let remainder = currentStream;
              for (const p of wakePhrases) {
                remainder = remainder.replace(new RegExp(`^${p}[,\\s]*`, 'i'), '').trim();
              }

              if (remainder.length > 2) {
                this.callbacks?.onInterimResult?.(remainder);
                this.triggerFinalCommand(remainder);
              }
              return;
            }
            return;
          }

          // 3. Command Mode
          if (this.awaitingCommand) {
            this.resetCommandTimeout();

            if (interimText) {
              this.callbacks?.onInterimResult?.(interimText);
              clearTimeout(this.silenceTimer);
              this.silenceTimer = setTimeout(() => {
                if (interimText.trim().length > 1) {
                  this.triggerFinalCommand(interimText.trim());
                }
              }, 1200);
            }

            if (finalText && finalText.trim().length > 0) {
              clearTimeout(this.silenceTimer);
              this.triggerFinalCommand(finalText.trim());
            }
          }
        };

        this.recognition.onerror = (event: any) => {
          if (event.error === 'aborted' || event.error === 'no-speech') return;
          console.warn('[VoiceEngine] WebSpeech error event:', event.error);
          if (event.error === 'not-allowed') {
            const alreadyReported = this.micPermissionDenied;
            this.micPermissionDenied = true;
            this.wakeWordActive = false;
            this.userExplicitlyMuted = true;
            this.isListening = false;
            this.callbacks?.onStateChange?.(false);
            if (!alreadyReported) {
              this.callbacks?.onError?.(
                'Acesso ao microfone negado pelo navegador. Libere a permissão.'
              );
            }
          }
        };

        this.recognition.onend = () => {
          // If microphone permission was denied, do not loop-restart
          if (this.micPermissionDenied) {
            this.isListening = false;
            this.callbacks?.onStateChange?.(false);
            return;
          }

          // If we were awaiting a manual command and Web Speech didn't produce a final result, process MediaRecorder fallback!
          if (this.awaitingCommand && !this.hasReceivedSpeechResult && !this.isTTSActive) {
            this.finishRecordingAndTranscribeWithGemini();
          }

          // Restart if wake word is active
          if (
            this.wakeWordActive &&
            !this.userExplicitlyMuted &&
            !this.isTTSActive &&
            !ttsEngine.isSpeaking() &&
            Date.now() >= this.blockEchoUntil
          ) {
            setTimeout(() => {
              if (
                this.wakeWordActive &&
                !this.userExplicitlyMuted &&
                !this.isTTSActive &&
                !ttsEngine.isSpeaking()
              ) {
                this.startListening();
              }
            }, 100);
          } else if (!this.awaitingCommand) {
            this.isListening = false;
            this.callbacks?.onStateChange?.(false);
          }
        };
      } catch (err) {
        console.warn('[VoiceEngine] Could not initialize WebSpeech:', err);
      }
    }

    return true;
  }

  // Starts recording audio chunks for backup Gemini transcription
  private startMediaRecorderBackup(stream: MediaStream) {
    try {
      this.recordedChunks = [];
      const options: MediaRecorderOptions = {};
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options.mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          options.mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options.mimeType = 'audio/mp4';
        }
      }

      this.mediaRecorder = new MediaRecorder(stream, options);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };
      this.mediaRecorder.start(250); // collect slice every 250ms
    } catch (err) {
      console.warn('[VoiceEngine] MediaRecorder not available:', err);
      this.mediaRecorder = null;
    }
  }

  // Fallback: transcribes recorded audio buffer with Gemini when Web Speech produces no output
  private async finishRecordingAndTranscribeWithGemini() {
    if (this.hasReceivedSpeechResult || this.isProcessingFallback) return;

    if (!this.mediaRecorder || this.recordedChunks.length === 0) {
      return;
    }

    this.isProcessingFallback = true;
    this.callbacks?.onInterimResult?.('Transcrevendo áudio com IA...');

    try {
      const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(this.recordedChunks, { type: mimeType });

      if (audioBlob.size < 1200) {
        // Very short / empty audio
        this.isProcessingFallback = false;
        return;
      }

      // Convert Blob to Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      const dataUrl = await base64Promise;

      const response = await fetch('/api/transcribe-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: dataUrl, mimeType }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = (data.text || '').trim();
        if (text && text.length > 1) {
          this.triggerFinalCommand(text);
          this.isProcessingFallback = false;
          return;
        }
      }
    } catch (err) {
      console.warn('[VoiceEngine] Gemini transcription fallback failed:', err);
    } finally {
      this.isProcessingFallback = false;
    }
  }

  private resetCommandTimeout() {
    if (this.commandTimeoutTimer) {
      clearTimeout(this.commandTimeoutTimer);
      this.commandTimeoutTimer = null;
    }
    // 10 seconds timeout for command mode
    this.commandTimeoutTimer = setTimeout(() => {
      if (this.awaitingCommand && !this.isTTSActive) {
        if (!this.hasReceivedSpeechResult) {
          this.finishRecordingAndTranscribeWithGemini();
        }
        this.awaitingCommand = !this.wakeWordActive;
        this.callbacks?.onModeChange?.('STANDBY');
        this.callbacks?.onInterimResult?.('');
        this.stopAllAudioCapture();
      }
    }, 10000);
  }

  private triggerFinalCommand(commandText: string) {
    if (!commandText || commandText.trim().length < 2) return;
    if (this.isTTSActive || Date.now() < this.blockEchoUntil || ttsEngine.isSpeaking()) return;

    this.hasReceivedSpeechResult = true;

    if (this.commandTimeoutTimer) {
      clearTimeout(this.commandTimeoutTimer);
      this.commandTimeoutTimer = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    this.stopAllAudioCapture();
    this.awaitingCommand = false;
    this.callbacks?.onModeChange?.('STANDBY');
    this.callbacks?.onFinalResult(commandText);
  }

  // User manually clicked the mascot or the microphone button
  public async activateManualCommand() {
    this.micPermissionDenied = false;
    this.userExplicitlyMuted = false;
    this.isTTSActive = false;
    this.blockEchoUntil = 0;
    this.awaitingCommand = true;
    this.hasReceivedSpeechResult = false;
    this.isProcessingFallback = false;

    this.callbacks?.onModeChange?.('LISTENING_COMMAND');
    this.resetCommandTimeout();

    // 1. Force explicit getUserMedia permission (lights up the browser's red microphone dot)
    const stream = await this.ensureMicrophonePermission();

    // 2. Connect to Audio Analyzer so visualizer and mascot move to speech
    if (stream) {
      try {
        await audioAnalyzer.initMicrophone();
      } catch {}

      // 3. Start MediaRecorder backup in parallel
      this.startMediaRecorderBackup(stream);
    }

    // 4. Start Web Speech recognition
    this.startListening();
  }

  public setMuted(muted: boolean) {
    this.userExplicitlyMuted = muted;
    if (muted) {
      if (this.commandTimeoutTimer) {
        clearTimeout(this.commandTimeoutTimer);
        this.commandTimeoutTimer = null;
      }
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
      this.awaitingCommand = false;
      this.stopAllAudioCapture();
    } else {
      if (this.isTTSActive || ttsEngine.isSpeaking()) return;
      this.startListening();
    }
  }

  public stopAllAudioCapture() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        try {
          this.recognition.stop();
        } catch {}
      }
    }

    this.isListening = false;
    this.callbacks?.onStateChange?.(false);
  }

  public onAssistantFinishedSpeaking() {
    this.handleTTSFinished();
  }

  public setLastAssistantSpeech(text: string) {
    this.lastAssistantSpeech = text;
  }

  public startListening() {
    if (this.userExplicitlyMuted || this.isTTSActive || Date.now() < this.blockEchoUntil || ttsEngine.isSpeaking()) {
      return;
    }

    if (this.recognition) {
      try {
        this.recognition.start();
        this.isListening = true;
        this.callbacks?.onStateChange?.(true);
      } catch {
        // Recognition already active
        this.isListening = true;
        this.callbacks?.onStateChange?.(true);
      }
    } else {
      // If Web Speech is not supported, we are still listening via MediaRecorder!
      this.isListening = true;
      this.callbacks?.onStateChange?.(true);
    }
  }

  public stopListening() {
    // If user clicks while listening to finish their command, process what was said!
    if (this.awaitingCommand && !this.hasReceivedSpeechResult) {
      this.finishRecordingAndTranscribeWithGemini();
    }
    this.setMuted(true);
  }

  public setWakeWord(enabled: boolean) {
    this.wakeWordActive = enabled;
    if (!enabled) {
      this.awaitingCommand = true;
    }
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public isAwaitingCommand(): boolean {
    return this.awaitingCommand;
  }

  public interruptSpeaking() {
    ttsEngine.stop();
    this.isTTSActive = false;
    this.blockEchoUntil = 0;
    this.userExplicitlyMuted = false;
    this.awaitingCommand = true;
    this.callbacks?.onModeChange?.('LISTENING_COMMAND');
    this.startListening();
  }
}

export const voiceEngine = new VoiceEngine();

// Real Web Audio API Microphone Analyzer
// Extracts real-time frequency, volume, and spectrum data for the OTTO CORE

export interface AudioMetrics {
  volume: number; // 0 to 1
  rawVolume: number;
  bass: number; // 0 to 1
  mid: number; // 0 to 1
  treble: number; // 0 to 1
  frequencies: number[]; // 32 normalized frequency bins (0 to 1)
  isLive: boolean;
}

class AudioAnalyzerService {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  private isInitialized: boolean = false;
  private isListeningToMic: boolean = false;
  private smoothedVolume: number = 0;

  public async initMicrophone(): Promise<boolean> {
    try {
      if (this.mediaStream && this.mediaStream.active) {
        return true;
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return false;

      this.audioCtx = new AudioContextClass();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);
      this.sourceNode.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      this.isInitialized = true;
      this.isListeningToMic = true;
      return true;
    } catch (err) {
      console.warn('[AudioAnalyzer] Could not access microphone directly:', err);
      this.isListeningToMic = false;
      return false;
    }
  }

  public stopMicrophone() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }
    this.isListeningToMic = false;
  }

  public getMediaStream(): MediaStream | null {
    if (this.mediaStream && this.mediaStream.active) {
      return this.mediaStream;
    }
    return null;
  }

  public getMetrics(syntheticBoost = 0): AudioMetrics {
    if (this.analyser && this.dataArray && this.isListeningToMic) {
      // @ts-ignore
      this.analyser.getByteFrequencyData(this.dataArray);

      const length = this.dataArray.length;
      let sum = 0;
      let bassSum = 0;
      let midSum = 0;
      let trebleSum = 0;

      const bassEnd = Math.floor(length * 0.15);
      const midEnd = Math.floor(length * 0.55);

      for (let i = 0; i < length; i++) {
        const val = this.dataArray[i] / 255;
        sum += val;
        if (i < bassEnd) bassSum += val;
        else if (i < midEnd) midSum += val;
        else trebleSum += val;
      }

      const rawVolume = sum / length;
      // Exponential smoothing for fluid animation
      this.smoothedVolume = this.smoothedVolume * 0.75 + rawVolume * 0.25;

      // Extract 32 normalized frequency bins
      const binStep = Math.max(1, Math.floor(length / 32));
      const frequencies: number[] = [];
      for (let i = 0; i < 32; i++) {
        const index = Math.min(i * binStep, length - 1);
        frequencies.push(this.dataArray[index] / 255);
      }

      return {
        volume: Math.min(1, this.smoothedVolume + syntheticBoost),
        rawVolume,
        bass: Math.min(1, (bassSum / (bassEnd || 1)) * 1.4),
        mid: Math.min(1, (midSum / (midEnd - bassEnd || 1)) * 1.2),
        treble: Math.min(1, (trebleSum / (length - midEnd || 1)) * 1.5),
        frequencies,
        isLive: true,
      };
    }

    // Fallback metrics when mic is idle or synthetic wave is active
    const time = performance.now() * 0.003;
    const baseVal = syntheticBoost > 0 ? syntheticBoost : 0.05 + Math.sin(time) * 0.03;
    const fallbackFrequencies: number[] = [];
    for (let i = 0; i < 32; i++) {
      const wave = Math.sin(time * 2 + i * 0.3) * 0.5 + 0.5;
      fallbackFrequencies.push(Math.min(1, wave * (syntheticBoost > 0 ? syntheticBoost * 0.8 : 0.1)));
    }

    return {
      volume: Math.min(1, baseVal),
      rawVolume: baseVal,
      bass: baseVal * 1.2,
      mid: baseVal * 0.9,
      treble: baseVal * 0.7,
      frequencies: fallbackFrequencies,
      isLive: false,
    };
  }
}

export const audioAnalyzer = new AudioAnalyzerService();

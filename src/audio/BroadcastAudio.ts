const backgroundMusicUrl = new URL("../assets/audio/background.mp3", import.meta.url).href;
const audioElementVolume = 0.72;
const mobileNativeVolume = 0.24;
const masterTargetGain = 0.34;
const fadeInSeconds = 1.4;

export class BroadcastAudio {
  private readonly audio: HTMLAudioElement;
  private readonly nativeOnly: boolean;
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private armed = false;
  private starting = false;
  private nativeFadeHandle = 0;

  private readonly startFromGesture = (): void => {
    this.playFromGesture();
  };

  constructor() {
    this.nativeOnly = window.matchMedia("(pointer: coarse)").matches;
    this.audio = new Audio(backgroundMusicUrl);
    this.audio.loop = true;
    this.audio.preload = "auto";
    this.audio.volume = this.nativeOnly ? 0 : audioElementVolume;
    this.audio.setAttribute("playsinline", "true");
    this.audio.setAttribute("webkit-playsinline", "true");
    this.audio.style.display = "none";
    document.body.append(this.audio);
    this.audio.load();
  }

  arm(): void {
    if (this.armed) return;
    this.armed = true;

    window.addEventListener("pointerdown", this.startFromGesture, { capture: true, passive: true });
    window.addEventListener("click", this.startFromGesture, { passive: true });
    window.addEventListener("keydown", this.startFromGesture);
    window.addEventListener("touchstart", this.startFromGesture, { capture: true, passive: true });
    window.addEventListener("touchend", this.startFromGesture, { capture: true, passive: true });
  }

  dispose(): void {
    this.disarm();
    cancelAnimationFrame(this.nativeFadeHandle);
    this.audio.pause();
    this.audio.remove();
    this.audio.src = "";
    void this.context?.close();
    this.context = null;
  }

  private playFromGesture(): void {
    if (this.starting) return;
    this.starting = true;

    if (this.nativeOnly) {
      this.playNativeOnly();
      return;
    }

    try {
      const context = this.ensureGraph();
      const resumePromise = context.state === "suspended" ? context.resume() : Promise.resolve();

      this.fadeIn(context);
      const playPromise = this.audio.play();

      void Promise.all([resumePromise, playPromise])
        .then(() => {
          this.disarm();
        })
        .catch(() => {
          this.resetFade(context);
        })
        .finally(() => {
          this.starting = false;
        });
    } catch {
      this.starting = false;
    }
  }

  private playNativeOnly(): void {
    this.audio.volume = Math.min(this.audio.volume, mobileNativeVolume * 0.35);
    this.fadeNativeVolume(mobileNativeVolume);

    try {
      void this.audio
        .play()
        .then(() => {
          this.disarm();
        })
        .catch(() => {
          cancelAnimationFrame(this.nativeFadeHandle);
          this.audio.volume = 0;
        })
        .finally(() => {
          this.starting = false;
        });
    } catch {
      cancelAnimationFrame(this.nativeFadeHandle);
      this.audio.volume = 0;
      this.starting = false;
    }
  }

  private ensureGraph(): AudioContext {
    if (this.context) {
      return this.context;
    }

    const context = new AudioContext();
    const source = context.createMediaElementSource(this.audio);
    const highpass = context.createBiquadFilter();
    const lowpass = context.createBiquadFilter();
    const dryGain = context.createGain();
    const wetGain = context.createGain();
    const masterGain = context.createGain();
    const leftDelay = context.createDelay(0.45);
    const rightDelay = context.createDelay(0.45);
    const leftPan = context.createStereoPanner();
    const rightPan = context.createStereoPanner();

    highpass.type = "highpass";
    highpass.frequency.value = 95;
    highpass.Q.value = 0.55;

    lowpass.type = "lowpass";
    lowpass.frequency.value = 6800;
    lowpass.Q.value = 0.45;

    dryGain.gain.value = 0.72;
    wetGain.gain.value = 0.10;
    masterGain.gain.value = 0.0;
    leftDelay.delayTime.value = 0.16;
    rightDelay.delayTime.value = 0.24;
    leftPan.pan.value = -0.55;
    rightPan.pan.value = 0.55;

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(dryGain);
    lowpass.connect(leftDelay);
    lowpass.connect(rightDelay);
    leftDelay.connect(leftPan);
    rightDelay.connect(rightPan);
    leftPan.connect(wetGain);
    rightPan.connect(wetGain);
    dryGain.connect(masterGain);
    wetGain.connect(masterGain);
    masterGain.connect(context.destination);

    this.context = context;
    this.masterGain = masterGain;
    return context;
  }

  private fadeIn(context: AudioContext): void {
    if (!this.masterGain) return;
    const gain = this.masterGain.gain;
    const now = context.currentTime;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(masterTargetGain, now + fadeInSeconds);
  }

  private resetFade(context: AudioContext): void {
    if (!this.masterGain) return;
    const gain = this.masterGain.gain;
    const now = context.currentTime;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(0, now);
  }

  private fadeNativeVolume(targetVolume: number): void {
    cancelAnimationFrame(this.nativeFadeHandle);
    const startedAt = performance.now();
    const startVolume = this.audio.volume;

    const step = (now: number): void => {
      const t = Math.min(1, (now - startedAt) / (fadeInSeconds * 1000));
      this.audio.volume = startVolume + (targetVolume - startVolume) * t;

      if (t < 1) {
        this.nativeFadeHandle = requestAnimationFrame(step);
      }
    };

    this.nativeFadeHandle = requestAnimationFrame(step);
  }

  private disarm(): void {
    if (!this.armed) return;
    this.armed = false;
    window.removeEventListener("pointerdown", this.startFromGesture, { capture: true });
    window.removeEventListener("click", this.startFromGesture);
    window.removeEventListener("keydown", this.startFromGesture);
    window.removeEventListener("touchstart", this.startFromGesture, { capture: true });
    window.removeEventListener("touchend", this.startFromGesture, { capture: true });
  }
}

const backgroundMusicUrl = new URL("../assets/audio/background.mp3", import.meta.url).href;
const audioElementVolume = 0.72;
const masterTargetGain = 0.34;
const fadeInSeconds = 1.4;

export class BroadcastAudio {
  private readonly audio: HTMLAudioElement;
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private armed = false;

  private readonly startFromGesture = (): void => {
    void this.play();
  };

  constructor() {
    this.audio = new Audio(backgroundMusicUrl);
    this.audio.loop = true;
    this.audio.preload = "auto";
    this.audio.volume = audioElementVolume;
  }

  arm(): void {
    if (this.armed) return;
    this.armed = true;

    window.addEventListener("pointerdown", this.startFromGesture, { passive: true });
    window.addEventListener("keydown", this.startFromGesture);
    window.addEventListener("touchstart", this.startFromGesture, { passive: true });
  }

  dispose(): void {
    this.disarm();
    this.audio.pause();
    this.audio.src = "";
    void this.context?.close();
    this.context = null;
  }

  private async play(): Promise<void> {
    try {
      const context = this.ensureGraph();
      if (context.state === "suspended") {
        await context.resume();
      }

      this.fadeIn(context);
      await this.audio.play();
      this.disarm();
    } catch {
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

  private disarm(): void {
    if (!this.armed) return;
    this.armed = false;
    window.removeEventListener("pointerdown", this.startFromGesture);
    window.removeEventListener("keydown", this.startFromGesture);
    window.removeEventListener("touchstart", this.startFromGesture);
  }
}

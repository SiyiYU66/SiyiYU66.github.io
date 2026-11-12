// Original, locally synthesized demo. No external music or audio requests.
export class DemoAudio {
  constructor(onUpdate) {
    this.duration = 84;
    this.offset = 0;
    this.playing = false;
    this.onUpdate = onUpdate;
    this.context = null;
    this.buffer = null;
    this.source = null;
    this.loading = false;
    this.raf = 0;
  }
  async prepare() {
    if (!this.context) this.context = new AudioContext();
    await this.context.resume();
    if (this.buffer) return;
    const sampleRate = 22050;
    const offline = new OfflineAudioContext(2, this.duration * sampleRate, sampleRate);
    const master = offline.createGain();
    master.gain.value = 0.42;
    const compressor = offline.createDynamicsCompressor();
    master.connect(compressor).connect(offline.destination);
    const delay = offline.createDelay(1);
    const feedback = offline.createGain();
    const wet = offline.createGain();
    delay.delayTime.value = 0.48;
    feedback.gain.value = 0.28;
    wet.gain.value = 0.23;
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(master);
    const note = (frequency, time, length, volume, type = 'sine', pan = 0) => {
      const oscillator = offline.createOscillator();
      const gain = offline.createGain();
      const panner = offline.createStereoPanner();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume, time + Math.min(0.12, length / 5));
      gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
      panner.pan.value = pan;
      oscillator.connect(gain).connect(panner).connect(master);
      panner.connect(delay);
      oscillator.start(time);
      oscillator.stop(time + length);
    };
    const chords = [[130.81, 164.81, 196, 246.94], [110, 130.81, 164.81, 220], [87.31, 130.81, 174.61, 220], [98, 146.83, 196, 246.94]];
    for (let bar = 0; bar < 14; bar++) {
      const time = bar * 6;
      const chord = chords[bar % chords.length];
      chord.forEach((frequency, index) => note(frequency, time, 5.8, 0.052, 'sine', (index - 1.5) * 0.35));
      note(chord[0] / 2, time, 5.7, 0.075);
      for (let step = 0; step < 8; step++) {
        const frequency = chord[[0, 2, 1, 3, 2, 1, 3, 2][step]] * (step % 3 === 0 ? 4 : 2);
        note(frequency, time + step * 0.75, 1.5, 0.046, 'sine', Math.sin(step * 2) * 0.55);
      }
    }
    master.gain.setValueAtTime(0, 0);
    master.gain.linearRampToValueAtTime(0.42, 3);
    master.gain.setValueAtTime(0.42, 78);
    master.gain.linearRampToValueAtTime(0, 84);
    this.buffer = await offline.startRendering();
  }
  async toggle() {
    if (this.loading) return;
    if (this.playing) { this.pause(); return; }
    this.loading = true;
    this.emit();
    try {
      await this.prepare();
      this.loading = false;
      if (this.offset >= this.duration) this.offset = 0;
      this.start();
    } catch (error) {
      this.loading = false;
      this.emit(error);
    }
  }
  start() {
    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.context.destination);
    this.startedAt = this.context.currentTime;
    this.source.start(0, this.offset);
    this.playing = true;
    this.tick();
  }
  position() { return this.playing ? Math.min(this.duration, this.offset + this.context.currentTime - this.startedAt) : this.offset; }
  pause() {
    this.offset = this.position();
    this.playing = false;
    this.source?.stop();
    this.source?.disconnect();
    this.source = null;
    cancelAnimationFrame(this.raf);
    this.emit();
  }
  seek(value) {
    const wasPlaying = this.playing;
    if (wasPlaying) this.pause();
    this.offset = Math.max(0, Math.min(this.duration, value));
    if (wasPlaying && this.offset < this.duration) this.start();
    else this.emit();
  }
  tick() {
    if (this.position() >= this.duration) { this.pause(); this.offset = this.duration; this.emit(); return; }
    this.emit();
    this.raf = requestAnimationFrame(() => this.tick());
  }
  emit(error) { this.onUpdate({ playing: this.playing, loading: this.loading, position: this.position(), duration: this.duration, error }); }
}

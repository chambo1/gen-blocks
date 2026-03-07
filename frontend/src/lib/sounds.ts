"use client";

class SoundEngine {
    private ctx: AudioContext | null = null;
    private enabled: boolean = true;

    private initCtx() {
        if (!this.ctx && typeof window !== 'undefined') {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
    }

    setEnabled(val: boolean) {
        this.enabled = val;
    }

    isEnabled() {
        return this.enabled;
    }

    private async noise(duration: number, volume: number = 0.1) {
        if (!this.enabled) return;
        this.initCtx();
        if (!this.ctx) return;

        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start();
        noise.stop(this.ctx.currentTime + duration);
    }

    private async tone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1, slide: number = 0) {
        if (!this.enabled) return;
        this.initCtx();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (slide !== 0) {
            osc.frequency.exponentialRampToValueAtTime(slide, this.ctx.currentTime + duration);
        }

        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playClick() {
        this.tone(800, 'sine', 0.1, 0.05);
    }

    playDice() {
        // Low frequency crunch
        this.noise(0.05, 0.05);
    }

    playLand() {
        // Pop
        this.tone(440, 'triangle', 0.1, 0.1, 880);
    }

    playEliminated() {
        // Sad downward slide
        this.tone(440, 'sawtooth', 0.6, 0.1, 110);
    }

    playWin() {
        // Upward arpeggio
        const now = this.ctx?.currentTime || 0;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((f, i) => {
            setTimeout(() => this.tone(f, 'sine', 0.4, 0.1), i * 150);
        });
    }

    playBonus() {
        this.tone(880, 'sine', 0.2, 0.1, 1760);
    }

    playHazard() {
        this.tone(220, 'square', 0.3, 0.05, 110);
    }
}

export const sounds = new SoundEngine();

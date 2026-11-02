import { Injectable, signal } from '@angular/core';
import { CompassDirection, ExitDirection } from '../models/domain.models';

const STORAGE_KEY_MUTED = 'lpr_sound_muted';

@Injectable({
  providedIn: 'root',
})
export class SoundFxService {
  readonly isMuted = signal<boolean>(false);

  private audioCtx: AudioContext | null = null;

  constructor() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY_MUTED);
        if (saved === 'true') {
          this.isMuted.set(true);
        }
      }
    } catch {
      // Storage access failure fallback
    }
  }

  toggleMute(): boolean {
    const next = !this.isMuted();
    this.isMuted.set(next);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_MUTED, String(next));
      }
    } catch {
      // Storage access failure fallback
    }
    return next;
  }

  private getContext(): AudioContext | null {
    if (this.isMuted()) return null;
    if (typeof window === 'undefined') return null;

    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return null;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      }
      if (this.audioCtx.state === 'suspended') {
        void this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Calculates directional stereo panning (-1.0 left to +1.0 right)
   * based on the compass direction of the sound source relative to player facing.
   */
  calculateBearingPan(
    targetDir?: ExitDirection | CompassDirection,
    playerFacing?: CompassDirection,
  ): number {
    if (!targetDir || !playerFacing || targetDir === 'U' || targetDir === 'D') {
      return 0;
    }
    const compassAngles: Record<CompassDirection, number> = {
      N: 0,
      E: 90,
      S: 180,
      W: 270,
    };
    const targetAngle = compassAngles[targetDir as CompassDirection] ?? 0;
    const facingAngle = compassAngles[playerFacing] ?? 0;
    const deltaAngle = (targetAngle - facingAngle + 360) % 360;
    const pan = Math.sin((deltaAngle * Math.PI) / 180) * 0.85;
    return Math.max(-1, Math.min(1, Number(pan.toFixed(2))));
  }

  private createSpatialNode(ctx: AudioContext, pan = 0): AudioNode {
    if (typeof ctx.createStereoPanner === 'function') {
      const clampedPan = Math.max(-1, Math.min(1, pan));
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(clampedPan, ctx.currentTime);
      panner.connect(ctx.destination);
      return panner;
    }
    return ctx.destination;
  }

  /**
   * Subtle stone/wood footstep tap on room navigation with directional stereo panning
   */
  playFootstep(pan = 0): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.createSpatialNode(ctx, pan));

      osc.start();
      osc.stop(ctx.currentTime + 0.055);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * Resonant ethereal harmonic chord on realm collision / crossed paths encounter
   */
  playConvergenceChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const chord = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const delay = idx * 0.06;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

        gain.gain.setValueAtTime(0.001, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + delay + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.9);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.95);
      });
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * Crisp kinetic strike impact on weapon attack with directional stereo panning
   */
  playCombatHit(pan = 0): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.createSpatialNode(ctx, pan));

      osc.start();
      osc.stop(ctx.currentTime + 0.085);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * Resonant magical energy whoosh on casting an active skill
   */
  playCastSkill(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.14);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.155);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * Sparkling ascending arpeggio on pruning an overgrowth chamber & harvesting shards
   */
  playHarvestShards(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const freqs = [880, 1108.73, 1318.51, 1760]; // A5, C#6, E6, A6
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const delay = idx * 0.05;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

        gain.gain.setValueAtTime(0.1, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.36);
      });
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * Soothing warm chord when resting at a safe campfire
   */
  playCampfireRest(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const chord = [174.61, 220.0, 261.63, 349.23]; // F3, A3, C4, F4
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 1.25);
      });
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * Soft chalk scraping click when leaving a traveler's inscription
   */
  playInscription(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.065);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * Visceral crunch and armor shatter when an anatomical sub-part is severed
   */
  playAnatomicalSeverance(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // Metallic snap
      const snap = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snap.type = 'sawtooth';
      snap.frequency.setValueAtTime(1400, ctx.currentTime);
      snap.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.09);

      snapGain.gain.setValueAtTime(0.18, ctx.currentTime);
      snapGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

      snap.connect(snapGain);
      snapGain.connect(ctx.destination);
      snap.start();
      snap.stop(ctx.currentTime + 0.095);

      // Low crunch resonance
      const crunch = ctx.createOscillator();
      const crunchGain = ctx.createGain();
      crunch.type = 'square';
      crunch.frequency.setValueAtTime(220, ctx.currentTime);
      crunch.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.18);

      crunchGain.gain.setValueAtTime(0.2, ctx.currentTime);
      crunchGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      crunch.connect(crunchGain);
      crunchGain.connect(ctx.destination);
      crunch.start();
      crunch.stop(ctx.currentTime + 0.185);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * Resonant flare when an environmental spell reaction triggers (e.g. Spore Conflagration)
   */
  playResonanceReaction(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(360, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(940, ctx.currentTime + 0.16);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.23);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * Ethereal subtle whisper tone when walking into a room with a phantom wanderer presence
   */
  playPhantomWhisper(pan = 0): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(680, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(540, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.createSpatialNode(ctx, pan));

      osc.start();
      osc.stop(ctx.currentTime + 0.42);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * Solemn bell chime when paying tribute to a fallen explorer's memorial
   */
  playTombstoneTribute(pan = 0): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const freqs = [293.66, 392.0]; // D4 -> G4
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const delay = idx * 0.12;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

        gain.gain.setValueAtTime(0.001, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + delay + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.8);

        osc.connect(gain);
        gain.connect(this.createSpatialNode(ctx, pan));

        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.85);
      });
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * Parchment page rustle when opening or turning a page in a grimoire
   */
  playGrimoireTurn(pan = 0): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.07);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);

      osc.connect(gain);
      gain.connect(this.createSpatialNode(ctx, pan));

      osc.start();
      osc.stop(ctx.currentTime + 0.075);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * Heavy mechanical ratchet and gear clunk when pulling a linked resonance lever
   */
  playMechanismClank(pan = 0): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // Industrial gear clank
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.14);

      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

      osc.connect(gain);
      gain.connect(this.createSpatialNode(ctx, pan));

      osc.start();
      osc.stop(ctx.currentTime + 0.145);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * Mobile haptic pulse via navigator.vibrate
   */
  triggerHaptic(
    pattern:
      | 'STEP'
      | 'STRIKE'
      | 'SEVERANCE'
      | 'CONVERGENCE'
      | 'RESONANCE'
      | 'TRIBUTE'
      | 'MECHANISM'
      | 'TOME',
  ): void {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;

    try {
      switch (pattern) {
        case 'STEP':
          navigator.vibrate(15);
          break;
        case 'STRIKE':
          navigator.vibrate(35);
          break;
        case 'SEVERANCE':
          navigator.vibrate([60, 40, 80]);
          break;
        case 'RESONANCE':
          navigator.vibrate([40, 30, 40]);
          break;
        case 'CONVERGENCE':
          navigator.vibrate([50, 40, 60, 40, 100]);
          break;
        case 'TRIBUTE':
          navigator.vibrate([40, 60, 40]);
          break;
        case 'MECHANISM':
          navigator.vibrate([80, 50, 80]);
          break;
        case 'TOME':
          navigator.vibrate(20);
          break;
      }
    } catch {
      // Device vibration restriction fallback
    }
  }
}

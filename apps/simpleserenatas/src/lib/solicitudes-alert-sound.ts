const MUTE_STORAGE_KEY = 'simpleserenatas:solicitudes-sound-muted';

let audioUnlocked = false;

export function isSolicitudesSoundMuted(): boolean {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === '1';
}

export function setSolicitudesSoundMuted(muted: boolean) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
}

/** Desbloquea audio tras un gesto del usuario (política autoplay). */
export function unlockSolicitudesAlertSound() {
    if (typeof window === 'undefined' || audioUnlocked) return;
    try {
        const ctx = new AudioContext();
        void ctx.resume().then(() => {
            void ctx.close();
            audioUnlocked = true;
        });
    } catch {
        audioUnlocked = true;
    }
}

function scheduleDecay(gain: GainNode, start: number, peak: number, decaySec: number) {
    const end = start + decaySec;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
}

/** Campana FM (timbre metálico suave, estilo apps de pedidos). */
function playFmBell(
    ctx: AudioContext,
    destination: AudioNode,
    startTime: number,
    frequency: number,
    peakVolume: number,
    decaySec: number,
) {
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const env = ctx.createGain();

    carrier.type = 'sine';
    modulator.type = 'sine';
    carrier.frequency.setValueAtTime(frequency, startTime);
    modulator.frequency.setValueAtTime(frequency * 3.2, startTime);

    const modIndex = frequency * 1.4;
    modGain.gain.setValueAtTime(modIndex, startTime);
    modGain.gain.exponentialRampToValueAtTime(0.01, startTime + decaySec * 0.55);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(env);
    env.connect(destination);

    scheduleDecay(env, startTime, peakVolume, decaySec);

    const stopAt = startTime + decaySec + 0.06;
    carrier.start(startTime);
    modulator.start(startTime);
    carrier.stop(stopAt);
    modulator.stop(stopAt);
}

/** Brillo adicional en parciales superiores (cola corta). */
function playShimmer(
    ctx: AudioContext,
    destination: AudioNode,
    startTime: number,
    frequency: number,
    peakVolume: number,
) {
    const ratios = [2, 2.76, 3.8];
    const decays = [0.42, 0.28, 0.18];
    const gains = [0.22, 0.12, 0.07];

    for (let i = 0; i < ratios.length; i += 1) {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency * ratios[i], startTime);
        osc.connect(env);
        env.connect(destination);
        scheduleDecay(env, startTime, peakVolume * gains[i], decays[i]);
        osc.start(startTime);
        osc.stop(startTime + decays[i] + 0.05);
    }
}

function playModernBellChime(
    ctx: AudioContext,
    destination: AudioNode,
    startTime: number,
    frequency: number,
    peakVolume: number,
) {
    playFmBell(ctx, destination, startTime, frequency, peakVolume * 0.85, 0.72);
    playShimmer(ctx, destination, startTime, frequency, peakVolume);
}

/** Campanita moderna: ding principal + ding más agudo y corto. */
export function playSolicitudAlertSound() {
    if (typeof window === 'undefined' || isSolicitudesSoundMuted()) return;
    try {
        const ctx = new AudioContext();
        const master = ctx.createGain();
        const lowpass = ctx.createBiquadFilter();
        const compressor = ctx.createDynamicsCompressor();

        lowpass.type = 'lowpass';
        lowpass.frequency.value = 5200;
        lowpass.Q.value = 0.4;

        compressor.threshold.setValueAtTime(-22, ctx.currentTime);
        compressor.knee.setValueAtTime(18, ctx.currentTime);
        compressor.ratio.setValueAtTime(3, ctx.currentTime);
        compressor.attack.setValueAtTime(0.003, ctx.currentTime);
        compressor.release.setValueAtTime(0.2, ctx.currentTime);

        master.connect(compressor);
        compressor.connect(lowpass);
        lowpass.connect(ctx.destination);
        master.gain.setValueAtTime(0.95, ctx.currentTime);

        const t0 = ctx.currentTime;
        playModernBellChime(ctx, master, t0, 880, 0.38);
        playModernBellChime(ctx, master, t0 + 0.14, 1174.66, 0.2);

        window.setTimeout(() => void ctx.close(), 1100);
    } catch {
        // Sin soporte de audio en este entorno.
    }
}

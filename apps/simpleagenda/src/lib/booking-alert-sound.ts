const MUTE_STORAGE_KEY = 'simpleagenda:booking-sound-muted';

let audioUnlocked = false;

export function isAgendaBookingSoundMuted(): boolean {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === '1';
}

export function setAgendaBookingSoundMuted(muted: boolean) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
}

export function unlockAgendaBookingAlertSound() {
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

function playFmBell(ctx: AudioContext, destination: AudioNode, startTime: number, frequency: number, peakVolume: number, decaySec: number) {
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

export function playAgendaBookingAlertSound() {
    if (typeof window === 'undefined' || isAgendaBookingSoundMuted()) return;
    try {
        const ctx = new AudioContext();
        const master = ctx.createGain();
        master.connect(ctx.destination);
        master.gain.setValueAtTime(0.95, ctx.currentTime);
        const t0 = ctx.currentTime;
        playFmBell(ctx, master, t0, 880, 0.34, 0.72);
        playFmBell(ctx, master, t0 + 0.14, 1174.66, 0.18, 0.55);
        window.setTimeout(() => void ctx.close(), 1100);
    } catch {
        // Sin soporte de audio.
    }
}

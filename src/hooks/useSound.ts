import { useCallback, useRef } from 'react';

export const useSound = () => {
    // Persistent AudioContext to prevent garbage collection issues and lag
    const audioContextRef = useRef<AudioContext | null>(null);

    // Sound Effect - Plays when a brick hits the ground/another brick
    const playLandedSound = useCallback(() => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') {
                ctx.resume().catch(console.error);
            }

            const t = ctx.currentTime;

            // Layer 1: The "Click"
            const oscClick = ctx.createOscillator();
            const gainClick = ctx.createGain();

            oscClick.type = 'square';
            oscClick.frequency.setValueAtTime(1200, t);
            oscClick.frequency.exponentialRampToValueAtTime(600, t + 0.02);

            gainClick.gain.setValueAtTime(0.08, t);
            gainClick.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

            oscClick.connect(gainClick);
            gainClick.connect(ctx.destination);

            oscClick.start(t);
            oscClick.stop(t + 0.04);

            // Layer 2: The "Clack"
            const oscClack = ctx.createOscillator();
            const gainClack = ctx.createGain();

            oscClack.type = 'sine';
            const basePitch = 350 + (Math.random() * 60 - 30);
            oscClack.frequency.setValueAtTime(basePitch, t);
            oscClack.frequency.exponentialRampToValueAtTime(100, t + 0.08);

            gainClack.gain.setValueAtTime(0.15, t);
            gainClack.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

            oscClack.connect(gainClack);
            gainClack.connect(ctx.destination);

            oscClack.start(t);
            oscClack.stop(t + 0.12);

        } catch (e) {
            console.warn("Audio play failed", e);
        }
    }, []);

    return { playLandedSound };
};

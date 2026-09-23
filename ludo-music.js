(function() {
    let audioCtx = null;
    let isPlaying = false;
    let isMuted = localStorage.getItem('ludo_bgm_muted') === 'true';
    let masterGain = null;
    let nextNoteTime = 0;
    let currentStep = 0;
    let timerID = null;
    const TEMPO = 114;
    const SECONDS_PER_BEAT = 60.0 / TEMPO;
    const STEP_TIME = SECONDS_PER_BEAT / 2;

    const N = {
        C2: 65.41, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, B2: 123.47,
        C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
        C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
        C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
        C6: 1046.50
    };

    const melodyPattern = [
        { step: 0, f: N.E5, dur: 1, v: 0.7 },
        { step: 1, f: N.G5, dur: 1, v: 0.8 },
        { step: 2, f: N.C6, dur: 2, v: 0.9 },
        { step: 4, f: N.A5, dur: 1, v: 0.75 },
        { step: 5, f: N.G5, dur: 1, v: 0.7 },
        { step: 6, f: N.E5, dur: 2, v: 0.8 },
        { step: 8, f: N.D5, dur: 1, v: 0.75 },
        { step: 9, f: N.G5, dur: 1, v: 0.8 },
        { step: 10, f: N.B5, dur: 2, v: 0.85 },
        { step: 12, f: N.A5, dur: 1, v: 0.7 },
        { step: 13, f: N.G5, dur: 1, v: 0.75 },
        { step: 14, f: N.D5, dur: 2, v: 0.8 },
        { step: 16, f: N.C5, dur: 1, v: 0.75 },
        { step: 17, f: N.E5, dur: 1, v: 0.8 },
        { step: 18, f: N.A5, dur: 2, v: 0.85 },
        { step: 20, f: N.F5, dur: 1, v: 0.75 },
        { step: 21, f: N.A5, dur: 1, v: 0.8 },
        { step: 22, f: N.C6, dur: 2, v: 0.9 },
        { step: 24, f: N.B5, dur: 1, v: 0.75 },
        { step: 25, f: N.A5, dur: 1, v: 0.7 },
        { step: 26, f: N.G5, dur: 1, v: 0.8 },
        { step: 27, f: N.F5, dur: 1, v: 0.75 },
        { step: 28, f: N.E5, dur: 2, v: 0.85 },
        { step: 30, f: N.G5, dur: 2, v: 0.8 },
        { step: 32, f: N.C5, dur: 1, v: 0.8 },
        { step: 33, f: N.D5, dur: 1, v: 0.75 },
        { step: 34, f: N.E5, dur: 1, v: 0.85 },
        { step: 35, f: N.G5, dur: 1, v: 0.9 },
        { step: 36, f: N.A5, dur: 1, v: 0.8 },
        { step: 37, f: N.G5, dur: 1, v: 0.75 },
        { step: 38, f: N.C6, dur: 2, v: 0.95 },
        { step: 40, f: N.A5, dur: 1, v: 0.8 },
        { step: 41, f: N.C6, dur: 1, v: 0.85 },
        { step: 42, f: N.D6, dur: 2, v: 0.9 },
        { step: 44, f: N.B5, dur: 1, v: 0.8 },
        { step: 45, f: N.G5, dur: 1, v: 0.75 },
        { step: 46, f: N.A5, dur: 2, v: 0.8 },
        { step: 48, f: N.C6, dur: 1, v: 0.85 },
        { step: 49, f: N.B5, dur: 1, v: 0.75 },
        { step: 50, f: N.A5, dur: 1, v: 0.8 },
        { step: 51, f: N.G5, dur: 1, v: 0.8 },
        { step: 52, f: N.F5, dur: 1, v: 0.75 },
        { step: 53, f: N.A5, dur: 1, v: 0.8 },
        { step: 54, f: N.G5, dur: 2, v: 0.85 },
        { step: 56, f: N.F5, dur: 1, v: 0.75 },
        { step: 57, f: N.E5, dur: 1, v: 0.75 },
        { step: 58, f: N.D5, dur: 1, v: 0.8 },
        { step: 59, f: N.G5, dur: 1, v: 0.85 },
        { step: 60, f: N.C5, dur: 2, v: 0.9 },
        { step: 62, f: N.C6, dur: 2, v: 0.95 }
    ];

    const bassPattern = [
        { step: 0, f: N.C3 }, { step: 2, f: N.G2 }, { step: 4, f: N.E3 }, { step: 6, f: N.G2 },
        { step: 8, f: N.G2 }, { step: 10, f: N.D3 }, { step: 12, f: N.B2 }, { step: 14, f: N.G2 },
        { step: 16, f: N.A2 }, { step: 18, f: N.E3 }, { step: 20, f: N.F2 }, { step: 22, f: N.C3 },
        { step: 24, f: N.G2 }, { step: 26, f: N.D3 }, { step: 28, f: N.C3 }, { step: 30, f: N.G2 },
        { step: 32, f: N.C3 }, { step: 34, f: N.G2 }, { step: 36, f: N.E3 }, { step: 38, f: N.G2 },
        { step: 40, f: N.F2 }, { step: 42, f: N.C3 }, { step: 44, f: N.G2 }, { step: 46, f: N.D3 },
        { step: 48, f: N.A2 }, { step: 50, f: N.E3 }, { step: 52, f: N.F2 }, { step: 54, f: N.C3 },
        { step: 56, f: N.D3 }, { step: 58, f: N.G2 }, { step: 60, f: N.C3 }, { step: 62, f: N.G2 }
    ];

    const chordPattern = [
        { step: 2, notes: [N.E4, N.G4, N.C5] },
        { step: 6, notes: [N.E4, N.G4, N.C5] },
        { step: 10, notes: [N.D4, N.G4, N.B4] },
        { step: 14, notes: [N.D4, N.G4, N.B4] },
        { step: 18, notes: [N.C4, N.E4, N.A4] },
        { step: 22, notes: [N.C4, N.F4, N.A4] },
        { step: 26, notes: [N.D4, N.F4, N.B4] },
        { step: 30, notes: [N.E4, N.G4, N.C5] },
        { step: 34, notes: [N.E4, N.G4, N.C5] },
        { step: 38, notes: [N.E4, N.G4, N.C5] },
        { step: 42, notes: [N.C4, N.F4, N.A4] },
        { step: 46, notes: [N.D4, N.G4, N.B4] },
        { step: 50, notes: [N.C4, N.E4, N.A4] },
        { step: 54, notes: [N.C4, N.F4, N.A4] },
        { step: 58, notes: [N.D4, N.F4, N.G4] },
        { step: 62, notes: [N.E4, N.G4, N.C5] }
    ];

    function initAudioContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
                masterGain = audioCtx.createGain();
                masterGain.gain.setValueAtTime(isMuted ? 0 : 0.16, audioCtx.currentTime);
                masterGain.connect(audioCtx.destination);
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playMarimba(freq, time, duration, velocity) {
        if (!audioCtx || isMuted) return;
        const osc = audioCtx.createOscillator();
        const overtone = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const overGain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        overtone.type = 'triangle';
        overtone.frequency.setValueAtTime(freq * 3.01, time);

        const noteVol = (velocity || 0.8) * 0.45;
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(noteVol, time + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.28);

        overGain.gain.setValueAtTime(noteVol * 0.35, time);
        overGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);

        osc.connect(gain);
        overtone.connect(overGain);
        gain.connect(masterGain);
        overGain.connect(masterGain);

        osc.start(time);
        overtone.start(time);
        osc.stop(time + duration * 0.3);
        overtone.stop(time + 0.09);
    }

    function playBass(freq, time) {
        if (!audioCtx || isMuted) return;
        const osc = audioCtx.createOscillator();
        const subOsc = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, time);
        filter.Q.setValueAtTime(2.0, time);

        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(0.38, time + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.32);

        osc.connect(filter);
        subOsc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc.start(time);
        subOsc.start(time);
        osc.stop(time + 0.34);
        subOsc.stop(time + 0.34);
    }

    function playWoodblock(pitch, time, vol) {
        if (!audioCtx || isMuted) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitch, time);
        osc.frequency.exponentialRampToValueAtTime(pitch * 0.45, time + 0.06);

        gain.gain.setValueAtTime((vol || 0.25) * 0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(time);
        osc.stop(time + 0.08);
    }

    function playShaker(time, vol) {
        if (!audioCtx || isMuted) return;
        const bufferSize = audioCtx.sampleRate * 0.035;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
        }

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(7500, time);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(vol || 0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        noise.start(time);
        noise.stop(time + 0.04);
    }

    function scheduleNotes() {
        while (nextNoteTime < audioCtx.currentTime + 0.2) {
            const step = currentStep % 64;

            for (let i = 0; i < melodyPattern.length; i++) {
                const m = melodyPattern[i];
                if (m.step === step) {
                    playMarimba(m.f, nextNoteTime, m.dur, m.v);
                }
            }

            for (let i = 0; i < bassPattern.length; i++) {
                const b = bassPattern[i];
                if (b.step === step) {
                    playBass(b.f, nextNoteTime);
                }
            }

            for (let i = 0; i < chordPattern.length; i++) {
                const c = chordPattern[i];
                if (c.step === step) {
                    c.notes.forEach(f => {
                        playMarimba(f, nextNoteTime, 1, 0.4);
                    });
                }
            }

            playShaker(nextNoteTime, (step % 2 === 0) ? 0.08 : 0.04);
            if (step % 4 === 2) {
                playWoodblock(480, nextNoteTime, 0.22);
            }
            if (step % 8 === 6) {
                playWoodblock(320, nextNoteTime, 0.18);
            }

            nextNoteTime += STEP_TIME;
            currentStep++;
        }
        timerID = requestAnimationFrame(scheduleNotes);
    }

    function startMusic() {
        initAudioContext();
        if (!audioCtx) return;
        if (isPlaying) return;

        isPlaying = true;
        nextNoteTime = audioCtx.currentTime + 0.05;
        currentStep = 0;
        scheduleNotes();
        updateButtonUI();
    }

    function stopMusic() {
        if (timerID) {
            cancelAnimationFrame(timerID);
            timerID = null;
        }
        isPlaying = false;
        updateButtonUI();
    }

    function toggleMute() {
        initAudioContext();
        isMuted = !isMuted;
        localStorage.setItem('ludo_bgm_muted', isMuted ? 'true' : 'false');
        if (masterGain && audioCtx) {
            const targetVol = isMuted ? 0 : 0.16;
            masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
            masterGain.gain.linearRampToValueAtTime(targetVol, audioCtx.currentTime + 0.2);
        }
        if (!isPlaying && !isMuted) {
            startMusic();
        }
        updateButtonUI();
    }

    function updateButtonUI() {
        const btns = document.querySelectorAll('.ludo-music-toggle-btn');
        btns.forEach(btn => {
            if (isMuted) {
                btn.innerHTML = '🔇 Music OFF';
                btn.classList.add('muted');
                btn.style.opacity = '0.7';
            } else {
                btn.innerHTML = '🎵 Music ON';
                btn.classList.remove('muted');
                btn.style.opacity = '1';
            }
        });
    }

    function autoStartOnGesture() {
        if (!isMuted && !isPlaying) {
            startMusic();
        }
        window.removeEventListener('click', autoStartOnGesture);
        window.removeEventListener('touchstart', autoStartOnGesture);
        window.removeEventListener('pointerdown', autoStartOnGesture);
    }

    window.addEventListener('click', autoStartOnGesture, { once: true });
    window.addEventListener('touchstart', autoStartOnGesture, { once: true });
    window.addEventListener('pointerdown', autoStartOnGesture, { once: true });

    window.LudoMusic = {
        start: startMusic,
        stop: stopMusic,
        toggleMute: toggleMute,
        isMuted: () => isMuted,
        isPlaying: () => isPlaying,
        updateButtonUI: updateButtonUI
    };

    document.addEventListener('DOMContentLoaded', () => {
        updateButtonUI();
    });
})();

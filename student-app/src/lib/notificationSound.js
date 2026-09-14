// Web Audio API Synthesizer & Browser Notification Engine for Vit: Mute Bites Student Portal

let sharedStudentAudioCtx = null;
let audioUnlocked = false;

// Generate simple in-memory WAV data URI for fallback audio playback
function generateToneWavUri(freq, durationMs = 300) {
  try {
    const sampleRate = 8000;
    const numSamples = Math.floor((sampleRate * durationMs) / 1000);
    const buffer = new ArrayBuffer(44 + numSamples);
    const view = new DataView(buffer);

    // RIFF chunk
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + numSamples, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"

    // fmt chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
    view.setUint16(22, 1, true); // NumChannels (1 = Mono)
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate, true); // ByteRate
    view.setUint16(32, 1, true); // BlockAlign
    view.setUint16(34, 8, true); // BitsPerSample (8 bit)

    // data chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, numSamples, true);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const decay = Math.max(0, 1 - (i / numSamples));
      const sample = Math.sin(2 * Math.PI * freq * t) * decay;
      view.setUint8(44 + i, Math.floor((sample + 1) * 127.5));
    }

    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'data:audio/wav;base64,' + btoa(binary);
  } catch (e) {
    return null;
  }
}

export function getStudentAudioContext() {
  try {
    if (!sharedStudentAudioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        sharedStudentAudioCtx = new AudioCtx();
      }
    }
    if (sharedStudentAudioCtx && sharedStudentAudioCtx.state === 'suspended') {
      sharedStudentAudioCtx.resume().catch(() => {});
    }
    return sharedStudentAudioCtx;
  } catch (e) {
    return null;
  }
}

// User interaction listener to unlock audio policy automatically on first touch/click
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const ctx = getStudentAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          audioUnlocked = true;
        }).catch(() => {});
      } else if (ctx && ctx.state === 'running') {
        audioUnlocked = true;
      }
      // Also request browser notification permission if not asked yet
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch {}
  };

  ['click', 'pointerdown', 'touchstart', 'keydown'].forEach(evt => {
    window.addEventListener(evt, unlockAudio, { passive: true, once: false });
  });
}

export function unlockStudentAudio() {
  try {
    const ctx = getStudentAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    audioUnlocked = true;
    return ctx;
  } catch {
    return null;
  }
}

// Play notification sound with dual-engine fallback (Web Audio API + HTML5 Audio element)
export async function playStudentChime(stage = 'OUT_FOR_DELIVERY') {
  let webAudioSuccess = false;

  try {
    const ctx = getStudentAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }

      if (ctx.state === 'running' || ctx.state === 'suspended') {
        const now = ctx.currentTime;

        if (stage === 'DELIVERED') {
          // 4-chord celebratory fanfare: C5 -> E5 -> G5 -> C6
          [
            { freq: 523.25, start: 0.0, dur: 0.18 },  // C5
            { freq: 659.25, start: 0.14, dur: 0.18 }, // E5
            { freq: 783.99, start: 0.28, dur: 0.22 }, // G5
            { freq: 1046.50, start: 0.44, dur: 0.60 } // C6
          ].forEach(({ freq, start, dur }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + start);
            gain.gain.setValueAtTime(0.45, now + start);
            gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + start);
            osc.stop(now + start + dur);
          });
          webAudioSuccess = true;
        } else if (stage === 'OUT_FOR_DELIVERY') {
          // Energetic 3-tone bike dispatch chime (F5 -> A5 -> C6)
          [
            { freq: 698.46, start: 0.0, dur: 0.16 }, // F5
            { freq: 880.00, start: 0.14, dur: 0.20 }, // A5
            { freq: 1046.50, start: 0.32, dur: 0.45 } // C6
          ].forEach(({ freq, start, dur }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + start);
            gain.gain.setValueAtTime(0.5, now + start);
            gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + start);
            osc.stop(now + start + dur);
          });
          webAudioSuccess = true;
        } else if (stage === 'test') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, now);
          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.35);
          webAudioSuccess = true;
        } else {
          // Double-bell chime for confirmed or partner assigned (E5 -> A5)
          [
            { freq: 659.25, start: 0.0, dur: 0.18 }, // E5
            { freq: 880.00, start: 0.16, dur: 0.38 }  // A5
          ].forEach(({ freq, start, dur }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + start);
            gain.gain.setValueAtTime(0.4, now + start);
            gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + start);
            osc.stop(now + start + dur);
          });
          webAudioSuccess = true;
        }
      }
    }
  } catch (err) {
    console.warn('[Student WebAudio Chime Warn]:', err);
  }

  // Dual Fallback: If Web Audio failed or didn't fire, play via HTML5 Audio element
  if (!webAudioSuccess && typeof window !== 'undefined') {
    try {
      const freq = stage === 'DELIVERED' ? 1046.5 : stage === 'OUT_FOR_DELIVERY' ? 880 : 659.25;
      const wavUri = generateToneWavUri(freq, 400);
      if (wavUri) {
        const audio = new Audio(wavUri);
        audio.volume = 0.5;
        audio.play().catch(() => {});
      }
    } catch {}
  }
}

export function requestStudentNotificationPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
    return Notification.requestPermission().catch(() => {});
  }
  return Promise.resolve(Notification.permission);
}

export function sendStudentNotification(title, body) {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🛵</text></svg>',
          tag: 'vit-mute-bites-student-status-' + Date.now(),
          badge: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍔</text></svg>'
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (e) {}
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }
}

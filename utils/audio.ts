let ctx: AudioContext | null = null;
let voices: SpeechSynthesisVoice[] = [];

// Initialize context on user interaction to bypass autoplay policies
export const initAudio = () => {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  
  // Initialize voices
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    const loadVoices = () => {
      voices = window.speechSynthesis.getVoices();
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }
};

// Text-to-Speech for the Preacher
export const speak = (text: string) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  // Cancel any currently speaking utterance to keep it snappy/responsive
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Try to find a deep/male voice to pitch down
  // Preferences: Google US English, Microsoft David, Daniel (Mac)
  const preferredVoice = voices.find(v => 
    v.name.includes('Google US English') || 
    v.name.includes('David') || 
    v.name.includes('Daniel')
  );

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  // Tuned for "Gritty Preacher"
  utterance.pitch = 0.6; // Deep
  utterance.rate = 0.85; // Deliberate/Slow
  utterance.volume = 1.0;

  window.speechSynthesis.speak(utterance);
};

// Create a buffer of white noise for explosions/gunshots
const createNoiseBuffer = () => {
  if (!ctx) return null;
  const bufferSize = ctx.sampleRate * 2; // 2 seconds buffer
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

let noiseBuffer: AudioBuffer | null = null;

export type SoundType = 'shoot' | 'hit' | 'die' | 'reload' | 'loaded' | 'hurt' | 'wave' | 'empty' | 'pickup';

export const playSound = (type: SoundType) => {
  if (!ctx) return;
  // Ensure noise buffer exists
  if (!noiseBuffer) noiseBuffer = createNoiseBuffer();

  const t = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);

  switch (type) {
    case 'shoot': {
      // Punchy noise burst + low triangle wave
      if (noiseBuffer) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2500, t);
        filter.frequency.exponentialRampToValueAtTime(100, t + 0.15);
        src.connect(filter);
        filter.connect(gain);
        src.start(t);
        src.stop(t + 0.15);
      }
      
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
      osc.connect(gain);
      
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      
      osc.start(t);
      osc.stop(t + 0.15);
      break;
    }
    case 'hit': {
      // Short, sharp sawtooth for impact
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
      
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.1);
      break;
    }
    case 'die': {
      // Longer, crunchier noise
      if (noiseBuffer) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.linearRampToValueAtTime(100, t + 0.3);
        
        src.connect(filter);
        filter.connect(gain);
        
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        
        src.start(t);
        src.stop(t + 0.3);
      }
      break;
    }
    case 'hurt': {
      // Low thud
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.linearRampToValueAtTime(40, t + 0.2);
      
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.3);
      break;
    }
    case 'empty': {
      // Dry click
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, t);
      
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
      
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.05);
      break;
    }
    case 'reload': {
      // Mechanical slide sound
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.linearRampToValueAtTime(600, t + 0.2);
      
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.linearRampToValueAtTime(0.0, t + 0.2);
      
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.2);
      break;
    }
    case 'loaded': {
      // High pitch lock sound
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, t);
      
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.1);
      break;
    }
    case 'wave': {
      // Ominous deep sweep
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(50, t);
      osc.frequency.linearRampToValueAtTime(150, t + 1.5);
      
      // Filter to make it sound distant
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      osc.connect(filter);
      filter.connect(gain);
      
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.linearRampToValueAtTime(0, t + 2.0);
      
      osc.start(t);
      osc.stop(t + 2.0);
      break;
    }
    case 'pickup': {
      // Holy chime
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t); // A5
      osc.frequency.linearRampToValueAtTime(1760, t + 0.1); // A6
      
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.4);
      
      // Secondary harmony
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1108, t); // C#6
      osc2.connect(gain);
      osc2.start(t);
      osc2.stop(t + 0.4);
      break;
    }
  }
};
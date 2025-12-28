import { SinType } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const PLAYER_SPEED = 3.5;
export const PLAYER_MAX_HP = 100;
export const PLAYER_MAX_AMMO = 12;
export const RELOAD_TIME = 90; // Frames (approx 1.5s at 60fps)
export const PROJECTILE_SPEED = 10;
export const FIRE_RATE = 12; // Minimum frames between shots

export const WAVE_DURATION = 30000; // 30 seconds per sin

// PowerUp Config
export const POWERUP_CHANCE = 0.08; // 8% drop rate
export const POWERUP_LIFETIME = 600; // 10 seconds before despawn
export const FURY_DURATION = 300; // 5 seconds of fury

export const PREACHER_BARKS = [
  "REPENT!",
  "JUDGEMENT!",
  "CAST OUT!",
  "TO H*LL!",
  "FORGIVENESS denied!",
  "PURGED!",
  "IMPURE!",
  "SAVED... NOT!",
  "EAT LEAD!",
  "THY END IS NIGH!",
  "$#&%!",
  "D@MNATION!",
  "LORD HAVE MERCY...",
  "BUT I WON'T!",
  "ASHES TO ASHES!",
];

export const HURT_BARKS = [
  "A TEST OF FAITH!",
  "MY FLESH IS WEAK!",
  "GAH! $#&%!",
  "STILL STANDING!",
  "IS THAT ALL?!",
  "THE LORD PROTECTS!",
];

export const SIN_CONFIG: Record<SinType, { 
  speed: number; 
  hp: number; 
  color: string; 
  radius: number; 
  sides: number; 
  label: string;
  spawnRate: number; // Lower is faster (frames)
}> = {
  [SinType.LUST]: { 
    speed: 2.0, 
    hp: 20, 
    color: '#ec4899', // Pink-500
    radius: 12, 
    sides: 0, // Circle
    label: "LUST",
    spawnRate: 80 // ~1.3s
  },
  [SinType.GLUTTONY]: { 
    speed: 0.6, 
    hp: 80, 
    color: '#22c55e', // Green-500
    radius: 25, 
    sides: 6, // Hexagon
    label: "GLUTTONY",
    spawnRate: 150 // ~2.5s
  },
  [SinType.GREED]: { 
    speed: 3.0, 
    hp: 15, 
    color: '#eab308', // Yellow-500
    radius: 10, 
    sides: 4, // Diamond (rotated square)
    label: "GREED",
    spawnRate: 70 // ~1.1s
  },
  [SinType.SLOTH]: { 
    speed: 0.3, 
    hp: 120, 
    color: '#60a5fa', // Blue-400
    radius: 30, 
    sides: 4, // Square
    label: "SLOTH",
    spawnRate: 200 // ~3.3s
  },
  [SinType.WRATH]: { 
    speed: 3.5, 
    hp: 35, 
    color: '#ef4444', // Red-500
    radius: 15, 
    sides: 3, // Triangle
    label: "WRATH",
    spawnRate: 90 // ~1.5s
  },
  [SinType.ENVY]: { 
    speed: 2.0, 
    hp: 25, 
    color: '#a855f7', // Purple-500
    radius: 12, 
    sides: 0, // Circle
    label: "ENVY",
    spawnRate: 45 // ~0.75s (Swarm)
  },
  [SinType.PRIDE]: { 
    speed: 1.5, 
    hp: 200, 
    color: '#f97316', // Orange-500
    radius: 40, 
    sides: 8, // Octagon
    label: "PRIDE",
    spawnRate: 300 // ~5s
  },
};

export const SIN_ORDER = [
  SinType.LUST,
  SinType.GLUTTONY,
  SinType.GREED,
  SinType.SLOTH,
  SinType.WRATH,
  SinType.ENVY,
  SinType.PRIDE,
];
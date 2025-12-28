export interface Vector2 {
  x: number;
  y: number;
}

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface Entity {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  markedForDeletion: boolean;
}

export interface Player extends Entity {
  hp: number;
  maxHp: number;
  ammo: number;
  maxAmmo: number;
  angle: number;
  reloading: boolean;
  reloadTimer: number;
  invulnTimer: number;
  furyTimer: number; // For the special powerup
}

export enum SinType {
  LUST = 'LUST',
  GLUTTONY = 'GLUTTONY',
  GREED = 'GREED',
  SLOTH = 'SLOTH',
  WRATH = 'WRATH',
  ENVY = 'ENVY',
  PRIDE = 'PRIDE',
}

export interface Enemy extends Entity {
  type: SinType;
  hp: number;
  speed: number;
  damage: number;
  sides?: number; // For drawing different shapes
}

export interface Projectile extends Entity {
  vx: number;
  vy: number;
  life: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
  scale: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
  markedForDeletion?: boolean;
}

export enum PowerUpType {
  HEALTH = 'HEALTH',
  AMMO = 'AMMO',
  FURY = 'FURY'
}

export interface PowerUp extends Entity {
  type: PowerUpType;
  life: number;
  blinkOffset: number;
}
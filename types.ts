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

export interface PlayerUpgrades {
  hasSpread: boolean;
  hasKnockback: boolean;
  hasRapidFire: boolean;
  hasSpeed: boolean;
}

export interface Player extends Entity {
  hp: number;
  maxHp: number;
  angle: number;
  invulnTimer: number;
  furyTimer: number; // Temporarily boosts all stats
  upgrades: PlayerUpgrades;
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
  isKnockback: boolean;
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
  HEAL = 'HEAL',          // Restores HP
  SPREAD = 'SPREAD',      // Permanent: Triple shot
  KNOCKBACK = 'KNOCKBACK',// Permanent: High pushback
  RAPID = 'RAPID',        // Permanent: Fast fire rate
  SPEED = 'SPEED'         // Permanent: Move speed
}

export interface PowerUp extends Entity {
  type: PowerUpType;
  life: number;
  blinkOffset: number;
}
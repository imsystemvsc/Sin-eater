import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  CANVAS_HEIGHT, 
  CANVAS_WIDTH, 
  PLAYER_SPEED, 
  PLAYER_SPEED_BOOSTED,
  PLAYER_MAX_HP, 
  PROJECTILE_SPEED, 
  FIRE_RATE, 
  RAPID_FIRE_RATE,
  WAVE_DURATION, 
  PREACHER_BARKS, 
  HURT_BARKS, 
  SIN_CONFIG, 
  SIN_ORDER, 
  POWERUP_LIFETIME, 
  FURY_DURATION 
} from '../constants';
import { 
  Player, 
  Enemy, 
  Projectile, 
  FloatingText, 
  Particle, 
  SinType, 
  PowerUp, 
  PowerUpType,
  PlayerUpgrades
} from '../types';
import { playSound, speak } from '../utils/audio';

// --- PIXEL ART ASSET GENERATION ---
// We define 12x12 pixel art grids. 
// Keys: '.'=transparent, '#' = main color, 'x' = outline/dark, 'f' = face/skin, 'w' = white
const SPRITE_SIZE = 12;
const SCALE = 4; // Render size multiplier

const PIXEL_MAPS: Record<string, string[]> = {
  PLAYER: [
    "....xxxx....",
    "...xxxxxx...",
    "..xxxxxxxx..",
    "....ffff....",
    "...xwwxx....",
    "..x.xxxx.g..",
    "..x.xxxx.g..",
    "..x.xxxx.x..",
    "..x.xxxx.x..",
    "..xx....xx..",
    "..x......x..",
    "............"
  ],
  [SinType.LUST]: [
    "............",
    "..##....##..",
    ".####..####.",
    ".####..####.",
    ".##########.",
    "..########..",
    "...######...",
    "...######...",
    "....####....",
    ".....##.....",
    ".....##.....",
    "............"
  ],
  [SinType.GLUTTONY]: [
    "....xxxx....",
    "..xx####xx..",
    ".x########x.",
    ".x##xxxx##x.",
    ".x#x....x#x.",
    ".x#x....x#x.",
    ".x#x....x#x.",
    ".x##xxxx##x.",
    ".x########x.",
    "..xx####xx..",
    "....xxxx....",
    "............"
  ],
  [SinType.GREED]: [
    ".....xx.....",
    "....x##x....",
    "...x####x...",
    "..x######x..",
    "..x##ww##x..",
    ".x###ww###x.",
    ".x###ww###x.",
    ".x########x.",
    "..x######x..",
    "...x####x...",
    "....xxxx....",
    "............"
  ],
  [SinType.SLOTH]: [
    "............",
    "............",
    "............",
    "..xxxxxxxx..",
    ".x########x.",
    ".x#xx##xx#x.",
    ".x########x.",
    ".x########x.",
    ".x########x.",
    ".x########x.",
    "..xxxxxxxx..",
    "............",
    "............"
  ],
  [SinType.WRATH]: [
    ".....xx.....",
    "...xx##xx...",
    "..x######x..",
    ".x#x####x#x.",
    ".x#x####x#x.",
    ".x########x.",
    ".x##xxxx##x.",
    ".x##x##x##x.",
    "..x######x..",
    "...xx##xx...",
    ".....xx.....",
    "............"
  ],
  [SinType.ENVY]: [
    ".....xx.....",
    "....x##x....",
    "...x####x...",
    "..x##ww##x..",
    ".x###ww###x.",
    ".x###xx###x.",
    ".x########x.",
    "..x##ww##x..",
    "...x####x...",
    "....x##x....",
    ".....xx.....",
    "............"
  ],
  [SinType.PRIDE]: [
    ".x..x..x..x.",
    ".x..x..x..x.",
    ".##########.",
    ".##########.",
    ".##########.",
    ".##########.",
    ".##########.",
    ".##########.",
    ".##########.",
    ".##########.",
    "............",
    "............"
  ]
};

const PALETTES: Record<string, Record<string, string>> = {
  PLAYER: { x: '#111827', f: '#fca5a5', w: '#f3f4f6', g: '#4b5563' }, // Preacher colors
  [SinType.LUST]: { '#': '#ec4899' }, // Pink
  [SinType.GLUTTONY]: { '#': '#22c55e', x: '#14532d' }, // Green
  [SinType.GREED]: { '#': '#eab308', x: '#000000', w: '#fef08a' }, // Gold
  [SinType.SLOTH]: { '#': '#60a5fa', x: '#1e3a8a' }, // Blue
  [SinType.WRATH]: { '#': '#ef4444', x: '#7f1d1d' }, // Red
  [SinType.ENVY]: { '#': '#a855f7', x: '#581c87', w: '#ffffff' }, // Purple/Eye
  [SinType.PRIDE]: { '#': '#f97316', x: '#fbbf24' }, // Orange/Crown
};

const generateSpriteUrl = (key: string): string => {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_SIZE * SCALE;
  canvas.height = SPRITE_SIZE * SCALE;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';

  const map = PIXEL_MAPS[key] || PIXEL_MAPS['PLAYER']; // Fallback
  const palette = PALETTES[key] || PALETTES['PLAYER'];

  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw
  map.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const char = row[x];
      if (char !== '.' && palette[char]) {
        ctx.fillStyle = palette[char];
        ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
      }
    }
  });

  return canvas.toDataURL('image/png');
};

interface GameProps {
  onGameOver: (score: number) => void;
  onUpdateStats: (hp: number, wave: number, sin: string, score: number, upgrades: PlayerUpgrades) => void;
}

const Game: React.FC<GameProps> = ({ onGameOver, onUpdateStats }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spritesRef = useRef<Record<string, HTMLImageElement>>({});

  // Initialize Sprites
  useEffect(() => {
    const loadSprite = (key: string) => {
      const img = new Image();
      img.src = generateSpriteUrl(key);
      spritesRef.current[key] = img;
    };

    loadSprite('PLAYER');
    Object.values(SinType).forEach(sin => loadSprite(sin));
  }, []);

  // Mutable game state refs (for performance vs React state)
  const gameStateRef = useRef({
    lastFrameTime: 0,
    score: 0,
    waveStartTime: 0,
    currentSinIndex: 0,
    frameCount: 0,
    isPlaying: true,
  });

  const inputsRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
    shoot: false,
    mouseX: 0,
    mouseY: 0,
  });

  const entitiesRef = useRef({
    player: {
      id: 'player',
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      radius: 20, 
      color: '#171717', 
      markedForDeletion: false,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      angle: 0,
      invulnTimer: 0,
      furyTimer: 0,
      upgrades: {
        hasSpread: false,
        hasKnockback: false,
        hasRapidFire: false,
        hasSpeed: false
      }
    } as Player,
    enemies: [] as Enemy[],
    projectiles: [] as Projectile[],
    texts: [] as FloatingText[],
    particles: [] as Particle[],
    powerups: [] as PowerUp[],
  });

  // Helper: Spawn Floating Text
  const spawnText = (x: number, y: number, text: string, color: string = '#ffffff', scale: number = 1) => {
    entitiesRef.current.texts.push({
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      text,
      life: 60, // frames
      color,
      scale
    });
  };

  // Helper: Spawn Particles
  const spawnParticles = (x: number, y: number, color: string, count: number = 5) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      entitiesRef.current.particles.push({
        id: Math.random().toString(36).substr(2, 9),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        color,
        size: Math.random() * 4 + 2,
        markedForDeletion: false
      });
    }
  };

  // Helper: Spawn PowerUp Relic (Wave Clear Reward)
  const spawnRelic = (x: number, y: number) => {
    const player = entitiesRef.current.player;
    // Determine pool of available upgrades (excluding maxed ones)
    const pool = [];
    if (!player.upgrades.hasSpread) pool.push(PowerUpType.SPREAD);
    if (!player.upgrades.hasKnockback) pool.push(PowerUpType.KNOCKBACK);
    if (!player.upgrades.hasRapidFire) pool.push(PowerUpType.RAPID);
    if (!player.upgrades.hasSpeed) pool.push(PowerUpType.SPEED);
    
    // Always add heal as an option, but weight it lower if player has upgrades available
    pool.push(PowerUpType.HEAL);

    const type = pool[Math.floor(Math.random() * pool.length)];
    let color = '#ffffff';

    switch(type) {
      case PowerUpType.SPREAD: color = '#3b82f6'; break; // Blue
      case PowerUpType.KNOCKBACK: color = '#a855f7'; break; // Purple
      case PowerUpType.RAPID: color = '#facc15'; break; // Yellow
      case PowerUpType.SPEED: color = '#22c55e'; break; // Green
      case PowerUpType.HEAL: color = '#ef4444'; break; // Red
    }

    entitiesRef.current.powerups.push({
      id: Math.random().toString(),
      x,
      y,
      radius: 15,
      color,
      markedForDeletion: false,
      type,
      life: POWERUP_LIFETIME,
      blinkOffset: 0
    });
  };

  // Game Loop
  const loop = useCallback((time: number) => {
    if (!gameStateRef.current.isPlaying) return;

    const dt = time - gameStateRef.current.lastFrameTime;
    
    // Cap at ~60 FPS (approx 16.67ms per frame)
    if (dt < 16) {
      requestAnimationFrame(loop);
      return;
    }

    gameStateRef.current.lastFrameTime = time;
    gameStateRef.current.frameCount++;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // IMPORTANT: Ensure pixel art looks crisp
    ctx.imageSmoothingEnabled = false;

    // --- LOGIC ---
    
    // 1. Wave Management
    const now = Date.now();
    const timeInWave = now - gameStateRef.current.waveStartTime;
    if (timeInWave > WAVE_DURATION) {
      // WAVE COMPLETE
      gameStateRef.current.waveStartTime = now;
      gameStateRef.current.currentSinIndex = (gameStateRef.current.currentSinIndex + 1) % SIN_ORDER.length;
      
      // Spawn Relic at Center
      spawnRelic(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      
      spawnText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 4, "WAVE CLEARED - RELIC APPEARED", '#eab308', 2);
      playSound('wave');
    }
    const currentSinType = SIN_ORDER[gameStateRef.current.currentSinIndex];
    const sinStats = SIN_CONFIG[currentSinType];

    // 2. Player Movement
    const player = entitiesRef.current.player;
    let dx = 0; 
    let dy = 0;
    if (inputsRef.current.up) dy -= 1;
    if (inputsRef.current.down) dy += 1;
    if (inputsRef.current.left) dx -= 1;
    if (inputsRef.current.right) dx += 1;

    // Normalize diagonal
    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
      const speed = player.upgrades.hasSpeed ? PLAYER_SPEED_BOOSTED : PLAYER_SPEED;
      player.x += dx * speed;
      player.y += dy * speed;
    }

    // Clamp to screen
    player.x = Math.max(player.radius, Math.min(CANVAS_WIDTH - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(CANVAS_HEIGHT - player.radius, player.y));

    // Player Aim
    const angle = Math.atan2(inputsRef.current.mouseY - player.y, inputsRef.current.mouseX - player.x);
    player.angle = angle;

    // Fury Timer
    if (player.furyTimer > 0) player.furyTimer--;

    // Shooting
    const isFury = player.furyTimer > 0;
    const baseFireRate = player.upgrades.hasRapidFire ? RAPID_FIRE_RATE : FIRE_RATE;
    const effectiveFireRate = isFury ? Math.max(2, baseFireRate / 2) : baseFireRate;
    const canShoot = gameStateRef.current.frameCount % Math.floor(effectiveFireRate) === 0;
    
    if (inputsRef.current.shoot && canShoot) {
        playSound('shoot');
        
        // Spread Shot Logic
        const projectileCount = player.upgrades.hasSpread ? 3 : 1;
        const spreadAngle = 0.25; // Radians (~15 degrees)

        for(let i = 0; i < projectileCount; i++) {
           let fireAngle = angle;
           if (projectileCount > 1) {
             // -spread, 0, +spread
             fireAngle = angle + (i - 1) * spreadAngle;
           }

           entitiesRef.current.projectiles.push({
            id: Math.random().toString(),
            x: player.x + Math.cos(fireAngle) * 20,
            y: player.y + Math.sin(fireAngle) * 20,
            vx: Math.cos(fireAngle) * PROJECTILE_SPEED,
            vy: Math.sin(fireAngle) * PROJECTILE_SPEED,
            life: 100, // frames
            radius: 4,
            color: isFury ? '#ef4444' : '#fde047',
            markedForDeletion: false,
            isKnockback: player.upgrades.hasKnockback
          });
        }

        // Small recoil
        player.x -= Math.cos(angle) * 2;
        player.y -= Math.sin(angle) * 2;
    }

    // Spawning Enemies
    if (gameStateRef.current.frameCount % sinStats.spawnRate === 0) {
      // Spawn at edge
      let ex, ey;
      if (Math.random() < 0.5) {
        ex = Math.random() < 0.5 ? -50 : CANVAS_WIDTH + 50;
        ey = Math.random() * CANVAS_HEIGHT;
      } else {
        ex = Math.random() * CANVAS_WIDTH;
        ey = Math.random() < 0.5 ? -50 : CANVAS_HEIGHT + 50;
      }
      
      entitiesRef.current.enemies.push({
        id: Math.random().toString(),
        x: ex,
        y: ey,
        type: currentSinType,
        hp: sinStats.hp,
        speed: sinStats.speed,
        color: sinStats.color,
        radius: sinStats.radius,
        sides: sinStats.sides,
        damage: 10,
        markedForDeletion: false
      });
    }

    // Update PowerUps
    entitiesRef.current.powerups.forEach(p => {
      p.life--;
      if (p.life <= 0) p.markedForDeletion = true;
      
      // Collision with Player
      const dx = player.x - p.x;
      const dy = player.y - p.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist < player.radius + p.radius) {
        p.markedForDeletion = true;
        playSound('pickup');
        spawnParticles(p.x, p.y, p.color, 15);
        
        switch(p.type) {
          case PowerUpType.HEAL:
            player.hp = player.maxHp; // Full Heal
            spawnText(player.x, player.y - 20, "DIVINE HEALING", '#ef4444');
            break;
          case PowerUpType.SPREAD:
            player.upgrades.hasSpread = true;
            spawnText(player.x, player.y - 20, "TRINITY SHOT", '#3b82f6', 1.5);
            break;
          case PowerUpType.KNOCKBACK:
            player.upgrades.hasKnockback = true;
            spawnText(player.x, player.y - 20, "FORCE OF GOD", '#a855f7', 1.5);
            break;
          case PowerUpType.RAPID:
            player.upgrades.hasRapidFire = true;
            spawnText(player.x, player.y - 20, "RIGHTEOUS SPEED", '#facc15', 1.5);
            break;
          case PowerUpType.SPEED:
            player.upgrades.hasSpeed = true;
            spawnText(player.x, player.y - 20, "SWIFT JUSTICE", '#22c55e', 1.5);
            break;
        }
      }
    });

    // Update Projectiles
    entitiesRef.current.projectiles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0 || p.x < 0 || p.x > CANVAS_WIDTH || p.y < 0 || p.y > CANVAS_HEIGHT) {
        p.markedForDeletion = true;
      }
    });

    // Update Enemies & Collisions
    entitiesRef.current.enemies.forEach(e => {
      // Move towards player
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist > 0) {
        e.x += (dx / dist) * e.speed;
        e.y += (dy / dist) * e.speed;
      }

      // Enemy vs Projectile
      entitiesRef.current.projectiles.forEach(p => {
        if (p.markedForDeletion) return;
        const pdx = p.x - e.x;
        const pdy = p.y - e.y;
        const pdist = Math.sqrt(pdx*pdx + pdy*pdy);
        if (pdist < e.radius + p.radius) {
          e.hp -= 10; // Damage
          p.markedForDeletion = true;
          spawnParticles(p.x, p.y, p.color, 3);
          playSound('hit');

          // Knockback
          if (p.isKnockback) {
             e.x += p.vx * 1.5; // Push back significantly
             e.y += p.vy * 1.5;
          } else {
             // Standard tiny stagger
             e.x += p.vx * 0.1;
             e.y += p.vy * 0.1;
          }
          
          if (e.hp <= 0) {
            e.markedForDeletion = true;
            gameStateRef.current.score += 100;
            spawnParticles(e.x, e.y, e.color, 10);
            playSound('die');
            
            // Foul Mouth on Kill (Chance)
            if (Math.random() < 0.15) {
               const bark = PREACHER_BARKS[Math.floor(Math.random() * PREACHER_BARKS.length)];
               spawnText(player.x, player.y - 40, bark, '#ffffff');
               speak(bark); // Voice the line
            }
          }
        }
      });

      // Enemy vs Player
      if (player.invulnTimer <= 0) { 
          const collDist = e.radius + player.radius;
          if (dist < collDist) {
             player.hp -= e.damage;
             player.invulnTimer = 30; // 0.5s invuln
             spawnParticles(player.x, player.y, '#ef4444', 5);
             playSound('hurt');
             
             // Foul Mouth on Hurt
             const bark = HURT_BARKS[Math.floor(Math.random() * HURT_BARKS.length)];
             spawnText(player.x, player.y - 40, bark, '#ef4444');
             speak(bark); // Voice the line

             if (player.hp <= 0) {
                gameStateRef.current.isPlaying = false;
                onGameOver(gameStateRef.current.score);
             }
          }
      }
    });

    if (player.invulnTimer > 0) player.invulnTimer--;

    // Update Particles
    entitiesRef.current.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) p.markedForDeletion = true;
    });

    // Update Text
    entitiesRef.current.texts.forEach(t => {
        t.y -= 0.5;
        t.life--;
        if (t.life <= 0) (t as any).markedForDeletion = true; 
    });

    // Cleanup
    entitiesRef.current.enemies = entitiesRef.current.enemies.filter(e => !e.markedForDeletion);
    entitiesRef.current.projectiles = entitiesRef.current.projectiles.filter(p => !p.markedForDeletion);
    entitiesRef.current.particles = entitiesRef.current.particles.filter(p => !p.markedForDeletion);
    entitiesRef.current.powerups = entitiesRef.current.powerups.filter(p => !p.markedForDeletion);
    // @ts-ignore
    entitiesRef.current.texts = entitiesRef.current.texts.filter(t => t.life > 0);


    // --- DRAW ---
    // Background
    ctx.fillStyle = '#111827'; // Dark BG
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Grid Lines (for arena feel)
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1;
    for(let x=0; x<CANVAS_WIDTH; x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,CANVAS_HEIGHT); ctx.stroke(); }
    for(let y=0; y<CANVAS_HEIGHT; y+=40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(CANVAS_WIDTH,y); ctx.stroke(); }

    // Draw PowerUps
    entitiesRef.current.powerups.forEach(p => {
        // Blink if despawning (Relics last a long time though)
        if (p.life < 120 && Math.floor((gameStateRef.current.frameCount + p.blinkOffset) / 5) % 2 === 0) {
            return;
        }

        ctx.fillStyle = p.color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        // Draw Shield-like shape for relics
        const s = p.radius;
        ctx.moveTo(p.x - s, p.y - s);
        ctx.lineTo(p.x + s, p.y - s);
        ctx.lineTo(p.x + s, p.y);
        ctx.lineTo(p.x, p.y + s*1.3);
        ctx.lineTo(p.x - s, p.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let label = "?";
        if (p.type === PowerUpType.HEAL) label = "+";
        if (p.type === PowerUpType.SPREAD) label = "III";
        if (p.type === PowerUpType.KNOCKBACK) label = "POW";
        if (p.type === PowerUpType.RAPID) label = ">>>";
        if (p.type === PowerUpType.SPEED) label = "SPD";

        ctx.fillText(label, p.x, p.y - 2);
    });

    // Draw Particles
    entitiesRef.current.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

    // Draw Enemies
    entitiesRef.current.enemies.forEach(e => {
        const sprite = spritesRef.current[e.type];
        // Calculate angle to look at player
        const lookAngle = Math.atan2(player.y - e.y, player.x - e.x);

        if (sprite && sprite.complete && sprite.naturalWidth !== 0) {
            // Shadow (simple circle for performance)
            ctx.save();
            ctx.translate(e.x + 4, e.y + 4);
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Draw Sprite
            ctx.save();
            ctx.translate(e.x, e.y);
            // Flip if looking left
            if (player.x < e.x) {
                ctx.scale(-1, 1);
            }
            
            // Draw image centered
            const drawSize = SPRITE_SIZE * SCALE;
            ctx.drawImage(sprite, -drawSize/2, -drawSize/2, drawSize, drawSize);
            ctx.restore();
            
            // Draw HP bar for heavy enemies (overlay on sprite)
            if (e.hp > 20) {
                ctx.fillStyle = 'red';
                ctx.fillRect(e.x - 10, e.y - e.radius - 12, 20, 4);
                ctx.fillStyle = '#0f0';
                ctx.fillRect(e.x - 10, e.y - e.radius - 12, 20 * (e.hp / (SIN_CONFIG[e.type].hp)), 4);
            }
        }
    });

    // Draw Projectiles
    entitiesRef.current.projectiles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw Player
    const playerSprite = spritesRef.current['PLAYER'];
    
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle + Math.PI/2); // Adjustment for sprite facing UP

    if (playerSprite && playerSprite.complete && playerSprite.naturalWidth !== 0) {
        // Shadow
        ctx.save();
        ctx.translate(4, 4); // Relative shadow offset
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(0, 0, player.radius, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();

        // Draw Player Sprite
        const drawSize = SPRITE_SIZE * SCALE;
        ctx.drawImage(playerSprite, -drawSize/2, -drawSize/2, drawSize, drawSize);
    } 

    // Muzzle Flash
    const isFuryMuzzle = player.furyTimer > 0;
    if (gameStateRef.current.frameCount % (isFuryMuzzle ? FIRE_RATE/2 : FIRE_RATE) < 2 && inputsRef.current.shoot) {
        ctx.fillStyle = isFuryMuzzle ? '#ef4444' : '#fef08a';
        ctx.beginPath();
        // Muzzle pos 
        ctx.arc(10, -30, 8 + Math.random()*4, 0, Math.PI*2);
        ctx.fill();
    }

    // Fury Aura
    if (player.furyTimer > 0) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, player.radius + 6 + Math.sin(gameStateRef.current.frameCount * 0.5) * 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();

    // Invulnerability Blink
    if (player.invulnTimer > 0 && Math.floor(gameStateRef.current.frameCount / 4) % 2 === 0) {
        ctx.globalCompositeOperation = 'xor';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 5, 0, Math.PI*2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }

    // Draw Floating Text
    entitiesRef.current.texts.forEach(t => {
        ctx.font = `bold ${16 * t.scale}px "Crimson Text"`;
        ctx.fillStyle = t.color;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.strokeText(t.text, t.x, t.y);
        ctx.fillText(t.text, t.x, t.y);
    });

    // Update UI Stats
    onUpdateStats(
        player.hp, 
        Math.floor((now - gameStateRef.current.waveStartTime) / 1000), 
        sinStats.label,
        gameStateRef.current.score,
        player.upgrades
    );

    requestAnimationFrame(loop);
  }, [onGameOver, onUpdateStats]);


  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'KeyW': inputsRef.current.up = true; break;
        case 'KeyS': inputsRef.current.down = true; break;
        case 'KeyA': inputsRef.current.left = true; break;
        case 'KeyD': inputsRef.current.right = true; break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'KeyW': inputsRef.current.up = false; break;
        case 'KeyS': inputsRef.current.down = false; break;
        case 'KeyA': inputsRef.current.left = false; break;
        case 'KeyD': inputsRef.current.right = false; break;
      }
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        inputsRef.current.mouseX = e.clientX - rect.left;
        inputsRef.current.mouseY = e.clientY - rect.top;
      }
    };
    const handleMouseDown = () => { inputsRef.current.shoot = true; };
    const handleMouseUp = () => { inputsRef.current.shoot = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Start Loop
  useEffect(() => {
    gameStateRef.current.waveStartTime = Date.now();
    const animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [loop]);

  return (
    <canvas 
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="border-4 border-gray-700 rounded shadow-2xl bg-black cursor-crosshair block mx-auto"
    />
  );
};

export default Game;
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  CANVAS_HEIGHT, 
  CANVAS_WIDTH, 
  PLAYER_SPEED, 
  PLAYER_MAX_HP, 
  PLAYER_MAX_AMMO, 
  PROJECTILE_SPEED, 
  RELOAD_TIME,
  FIRE_RATE,
  WAVE_DURATION,
  PREACHER_BARKS,
  HURT_BARKS,
  SIN_CONFIG,
  SIN_ORDER,
  POWERUP_CHANCE,
  POWERUP_LIFETIME,
  FURY_DURATION
} from '../constants';
import { 
  GameState, 
  Player, 
  Enemy, 
  Projectile, 
  FloatingText, 
  Particle,
  SinType,
  PowerUp,
  PowerUpType 
} from '../types';
import { playSound, speak } from '../utils/audio';

interface GameProps {
  onGameOver: (score: number) => void;
  onUpdateStats: (hp: number, ammo: number, maxAmmo: number, wave: number, sin: string, score: number) => void;
}

const Game: React.FC<GameProps> = ({ onGameOver, onUpdateStats }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
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
      radius: 16,
      color: '#171717', // Neutral 900
      markedForDeletion: false,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      ammo: PLAYER_MAX_AMMO,
      maxAmmo: PLAYER_MAX_AMMO,
      angle: 0,
      reloading: false,
      reloadTimer: 0,
      invulnTimer: 0,
      furyTimer: 0,
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
        size: Math.random() * 4 + 2
      });
    }
  };

  // Helper: Spawn PowerUp
  const spawnPowerUp = (x: number, y: number) => {
    const rand = Math.random();
    let type = PowerUpType.HEALTH;
    let color = '#22c55e'; // Green
    
    if (rand < 0.4) {
      type = PowerUpType.HEALTH; // 40%
      color = '#22c55e';
    } else if (rand < 0.8) {
      type = PowerUpType.AMMO; // 40%
      color = '#eab308';
    } else {
      type = PowerUpType.FURY; // 20%
      color = '#ef4444';
    }

    entitiesRef.current.powerups.push({
      id: Math.random().toString(),
      x,
      y,
      radius: 10,
      color,
      markedForDeletion: false,
      type,
      life: POWERUP_LIFETIME,
      blinkOffset: Math.random() * 100
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

    // --- LOGIC ---
    
    // 1. Wave Management
    const now = Date.now();
    const timeInWave = now - gameStateRef.current.waveStartTime;
    if (timeInWave > WAVE_DURATION) {
      gameStateRef.current.waveStartTime = now;
      gameStateRef.current.currentSinIndex = (gameStateRef.current.currentSinIndex + 1) % SIN_ORDER.length;
      spawnText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 4, "NEW SIN APPROACHES", '#dc2626', 2);
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
      player.x += dx * PLAYER_SPEED;
      player.y += dy * PLAYER_SPEED;
    }

    // Clamp to screen
    player.x = Math.max(player.radius, Math.min(CANVAS_WIDTH - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(CANVAS_HEIGHT - player.radius, player.y));

    // Player Aim
    const angle = Math.atan2(inputsRef.current.mouseY - player.y, inputsRef.current.mouseX - player.x);
    player.angle = angle;

    // Fury Timer
    if (player.furyTimer > 0) player.furyTimer--;

    // Reloading
    if (player.reloading) {
      player.reloadTimer--;
      if (player.reloadTimer <= 0) {
        player.reloading = false;
        player.ammo = player.maxAmmo;
        spawnText(player.x, player.y - 20, "LOADED", '#ffffff');
        playSound('loaded');
      }
    } else if (player.ammo <= 0 && !player.reloading && player.furyTimer <= 0) {
      // Auto reload if empty and not in fury
      player.reloading = true;
      player.reloadTimer = RELOAD_TIME;
      spawnText(player.x, player.y - 20, "RELOADING...", '#fbbf24');
      playSound('reload');
    }

    // Shooting
    const isFury = player.furyTimer > 0;
    const effectiveFireRate = isFury ? Math.max(2, FIRE_RATE / 2) : FIRE_RATE; // Twice as fast in Fury
    const canShoot = (!player.reloading || isFury) && gameStateRef.current.frameCount % Math.floor(effectiveFireRate) === 0;
    
    if (inputsRef.current.shoot && canShoot) {
      if (player.ammo > 0 || isFury) {
        if (!isFury) player.ammo--;
        playSound('shoot');
        
        // Projectile spread in fury? No, just faster.
        entitiesRef.current.projectiles.push({
          id: Math.random().toString(),
          x: player.x + Math.cos(angle) * 20,
          y: player.y + Math.sin(angle) * 20,
          vx: Math.cos(angle) * PROJECTILE_SPEED,
          vy: Math.sin(angle) * PROJECTILE_SPEED,
          life: 100, // frames
          radius: 4,
          color: isFury ? '#ef4444' : '#fde047', // Red bullets in fury
          markedForDeletion: false
        });
        // Small recoil
        player.x -= Math.cos(angle) * 2;
        player.y -= Math.sin(angle) * 2;
      } else {
        // Empty click logic
        playSound('empty');
      }
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
        spawnParticles(p.x, p.y, p.color, 10);
        
        switch(p.type) {
          case PowerUpType.HEALTH:
            player.hp = Math.min(player.maxHp, player.hp + 30);
            spawnText(player.x, player.y - 20, "+30 HP", '#22c55e');
            break;
          case PowerUpType.AMMO:
            player.ammo = player.maxAmmo;
            player.reloading = false; // Cancel reload if active
            spawnText(player.x, player.y - 20, "AMMO FULL", '#eab308');
            break;
          case PowerUpType.FURY:
            player.furyTimer = FURY_DURATION;
            player.ammo = player.maxAmmo; // Free refill
            spawnText(player.x, player.y - 20, "HOLY FURY!", '#ef4444', 1.5);
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
          
          if (e.hp <= 0) {
            e.markedForDeletion = true;
            gameStateRef.current.score += 100;
            spawnParticles(e.x, e.y, e.color, 10);
            playSound('die');
            
            // Chance to drop powerup
            if (Math.random() < POWERUP_CHANCE) {
              spawnPowerUp(e.x, e.y);
            }
            
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
      if (!player.reloading && player.invulnTimer <= 0) { 
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
        // Blink if despawning
        if (p.life < 120 && Math.floor((gameStateRef.current.frameCount + p.blinkOffset) / 5) % 2 === 0) {
            return;
        }

        ctx.fillStyle = p.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        
        // Shape based on type
        switch(p.type) {
            case PowerUpType.HEALTH:
                // Cross
                ctx.beginPath();
                ctx.rect(p.x - 4, p.y - 10, 8, 20);
                ctx.rect(p.x - 10, p.y - 4, 20, 8);
                ctx.fill();
                ctx.stroke();
                break;
            case PowerUpType.AMMO:
                // Box
                ctx.beginPath();
                ctx.rect(p.x - 8, p.y - 8, 16, 16);
                ctx.fill();
                ctx.stroke();
                // 'A' label
                ctx.fillStyle = 'black';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('A', p.x, p.y);
                break;
            case PowerUpType.FURY:
                // Star
                ctx.beginPath();
                const spikes = 5;
                const outerRadius = 12;
                const innerRadius = 6;
                let rot = Math.PI / 2 * 3;
                let cx = p.x;
                let cy = p.y;
                let step = Math.PI / spikes;

                ctx.moveTo(cx, cy - outerRadius);
                for (let i = 0; i < spikes; i++) {
                    cx = p.x + Math.cos(rot) * outerRadius;
                    cy = p.y + Math.sin(rot) * outerRadius;
                    ctx.lineTo(cx, cy);
                    rot += step;

                    cx = p.x + Math.cos(rot) * innerRadius;
                    cy = p.y + Math.sin(rot) * innerRadius;
                    ctx.lineTo(cx, cy);
                    rot += step;
                }
                ctx.lineTo(p.x, p.y - outerRadius);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
        }
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
        ctx.fillStyle = e.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        if (e.sides === 0) {
            ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        } else if (e.sides) {
            // Draw polygon
            const step = (Math.PI * 2) / e.sides;
            // Rotate shape slowly
            const rot = gameStateRef.current.frameCount * 0.05;
            for (let i = 0; i < e.sides; i++) {
                const tx = e.x + Math.cos(rot + step * i) * e.radius;
                const ty = e.y + Math.sin(rot + step * i) * e.radius;
                if (i === 0) ctx.moveTo(tx, ty);
                else ctx.lineTo(tx, ty);
            }
            ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();

        // HP bar for heavy enemies
        if (e.hp > 20) {
            ctx.fillStyle = 'red';
            ctx.fillRect(e.x - 10, e.y - e.radius - 10, 20, 4);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(e.x - 10, e.y - e.radius - 10, 20 * (e.hp / (SIN_CONFIG[e.type].hp)), 4);
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
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    // Body (Black Square)
    ctx.fillStyle = player.color;
    ctx.fillRect(-player.radius, -player.radius, player.radius * 2, player.radius * 2);
    
    // Collar (White Rect)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-5, -12, 10, 4);

    // Fury Aura
    if (player.furyTimer > 0) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, player.radius + 6 + Math.sin(gameStateRef.current.frameCount * 0.5) * 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Hands/Gun
    ctx.fillStyle = '#374151'; // Gray gun
    ctx.fillRect(10, 2, 12, 6); // Right hand gun
    ctx.fillStyle = '#171717'; 
    ctx.fillRect(10, -10, 6, 6); // Left hand 

    // Muzzle Flash
    const isFuryMuzzle = player.furyTimer > 0;
    if (gameStateRef.current.frameCount % (isFuryMuzzle ? FIRE_RATE/2 : FIRE_RATE) < 2 && inputsRef.current.shoot && (player.ammo >= 0 || isFuryMuzzle) && (!player.reloading || isFuryMuzzle)) {
        ctx.fillStyle = isFuryMuzzle ? '#ef4444' : '#fef08a';
        ctx.beginPath();
        ctx.arc(25, 5, 8 + Math.random()*4, 0, Math.PI*2);
        ctx.fill();
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

    // Update UI Stats (Throttled slightly or just every frame, simple logic is fine)
    onUpdateStats(
        player.hp, 
        (player.furyTimer > 0) ? player.maxAmmo : player.ammo, // Show full ammo visually during fury
        player.maxAmmo, 
        Math.floor((now - gameStateRef.current.waveStartTime) / 1000), 
        sinStats.label,
        gameStateRef.current.score
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
    // Attach mouse events to window to prevent getting stuck if dragging out of canvas
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
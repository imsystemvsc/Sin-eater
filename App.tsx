import React, { useState, useCallback } from 'react';
import Game from './components/Game';
import { GameState, SinType } from './types';
import { CANVAS_WIDTH, PLAYER_MAX_HP, PLAYER_MAX_AMMO, WAVE_DURATION } from './constants';
import { initAudio, speak } from './utils/audio';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [finalScore, setFinalScore] = useState(0);

  // HUD State
  const [hp, setHp] = useState(PLAYER_MAX_HP);
  const [ammo, setAmmo] = useState(PLAYER_MAX_AMMO);
  const [maxAmmo, setMaxAmmo] = useState(PLAYER_MAX_AMMO);
  const [waveTimer, setWaveTimer] = useState(0);
  const [currentSin, setCurrentSin] = useState<string>('LUST');
  const [score, setScore] = useState(0);

  const handleGameOver = useCallback((score: number) => {
    setFinalScore(score);
    setGameState(GameState.GAME_OVER);
    speak("I have fallen.");
  }, []);

  const handleUpdateStats = useCallback((
    newHp: number, 
    newAmmo: number, 
    newMaxAmmo: number, 
    timer: number, 
    sin: string,
    newScore: number
  ) => {
    // Throttle React updates slightly if needed, but modern React handles this okay usually.
    // For a smoother bar, we update every frame.
    setHp(newHp);
    setAmmo(newAmmo);
    setMaxAmmo(newMaxAmmo);
    setWaveTimer(timer);
    setCurrentSin(sin);
    setScore(newScore);
  }, []);

  const startGame = () => {
    initAudio(); // Initialize audio context on user gesture
    setGameState(GameState.PLAYING);
    setHp(PLAYER_MAX_HP);
    setAmmo(PLAYER_MAX_AMMO);
    setScore(0);
    speak("Lord, forgive them. For I will not.");
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-gray-100 flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-4xl">
        
        {/* Header / Title */}
        <div className="text-center mb-4">
          <h1 className="text-5xl font-bold text-red-600 tracking-wider" style={{ textShadow: '2px 2px 0 #000' }}>SIN EATER</h1>
          <p className="text-gray-400 italic mt-2">"Though I walk through the valley..."</p>
        </div>

        {/* Game Container */}
        <div className="relative bg-black rounded-lg shadow-2xl overflow-hidden border border-gray-800" style={{ width: CANVAS_WIDTH, margin: '0 auto' }}>
          
          {gameState === GameState.MENU && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
              <h2 className="text-3xl text-white mb-6">PREPARE FOR JUDGEMENT</h2>
              <div className="space-y-4 text-center text-gray-300 mb-8">
                <p>WASD to Move • Mouse to Aim & Shoot</p>
                <p>Survive the 7 Deadly Sins. The cycle repeats.</p>
              </div>
              <button 
                onClick={startGame}
                className="px-8 py-3 bg-red-700 hover:bg-red-600 text-white font-bold rounded text-xl transition-all hover:scale-105 border-2 border-red-500"
              >
                BEGIN PURGE
              </button>
            </div>
          )}

          {gameState === GameState.GAME_OVER && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/90 z-20">
              <h2 className="text-4xl text-white font-bold mb-2">FALLEN</h2>
              <p className="text-2xl text-gray-200 mb-6">Score: {finalScore}</p>
              <button 
                onClick={startGame}
                className="px-8 py-3 bg-black hover:bg-gray-900 text-white font-bold rounded text-xl transition-all border-2 border-gray-500"
              >
                RESURRECT
              </button>
            </div>
          )}

          {/* HUD Overlay */}
          {gameState === GameState.PLAYING && (
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none z-10">
              {/* Left: Health & Ammo */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 font-bold text-red-500">HP</div>
                  <div className="w-48 h-4 bg-gray-800 border border-gray-600 relative">
                    <div 
                      className="absolute top-0 left-0 h-full bg-red-600 transition-all duration-100" 
                      style={{ width: `${(Math.max(0, hp) / PLAYER_MAX_HP) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono">{Math.floor(hp)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-8 font-bold text-yellow-500">AMMO</div>
                  <div className="flex gap-1">
                    {Array.from({ length: maxAmmo }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-2 h-4 border border-gray-900 ${i < ammo ? 'bg-yellow-400' : 'bg-gray-700'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Center: Wave Info */}
              <div className="text-center">
                <div className="text-xs text-gray-400 uppercase tracking-widest">Current Sin</div>
                <div className="text-2xl font-bold text-red-500 tracking-widest" style={{ textShadow: '0 0 10px rgba(220, 38, 38, 0.5)' }}>
                  {currentSin}
                </div>
                <div className="text-sm text-gray-500 font-mono mt-1">
                   Next in: {Math.max(0, 30 - waveTimer)}s
                </div>
              </div>

              {/* Right: Score */}
              <div className="text-right">
                <div className="text-xs text-gray-400 uppercase tracking-widest">Penance Paid</div>
                <div className="text-3xl font-mono font-bold text-white">
                  {score.toString().padStart(6, '0')}
                </div>
              </div>
            </div>
          )}

          {/* The Game Canvas */}
          {gameState === GameState.PLAYING && (
            <Game onGameOver={handleGameOver} onUpdateStats={handleUpdateStats} />
          )}

          {/* Placeholder for menu visuals so it's not empty black before start */}
          {gameState !== GameState.PLAYING && (
             <div className="w-full h-[600px] bg-neutral-800 flex items-center justify-center">
                 {/* Static background visual */}
             </div>
          )}
        </div>
        
        <div className="mt-4 text-center text-gray-500 text-sm">
          <p>Tip: Prioritize fast enemies. Reload when safe.</p>
        </div>
      </div>
    </div>
  );
};

export default App;
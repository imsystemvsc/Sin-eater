# Sin Eater

A gritty top-down arena survival shooter where a Preacher battles waves of the 7 Deadly Sins.

## Game Concept

You play as a Preacher armed with a gun and righteous fury. Your goal is to survive endless waves of enemies representing the Seven Deadly Sins.

*   **Enemies**: Each Sin has unique behavior and stats (e.g., Lust is fast, Sloth is slow/tanky, Pride is a boss).
*   **Mechanics**:
    *   **WASD** to Move.
    *   **Mouse** to Aim & Shoot.
    *   **Ammo Management**: You have limited shots before needing to reload.
    *   **Power-ups**: Collect Health, Ammo refills, and "Fury" (infinite ammo + rapid fire).
    *   **Dynamic Voice**: The Preacher speaks using your browser's built-in Text-to-Speech engine.

## How to Run Locally

This is a standalone web application built with React and HTML5 Canvas. It does **not** require any API keys.

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Run the development server**:
    ```bash
    npm run dev
    ```

3.  Open your browser to the local URL provided (usually `http://localhost:5173`).

## Technologies Used

*   **React**: UI overlay and game loop management.
*   **HTML5 Canvas**: High-performance 2D rendering for entities and particles.
*   **Web Audio API**: Procedurally generated sound effects (no external audio files required).
*   **Web Speech API**: Real-time voice synthesis for character dialogue.

// js/main.js
import { state, profile } from './core/state.js';

// NOTE: We will uncomment these as we build them in Phase 2 & 3!
import * as Graphics from './engine/graphics.js';
import * as Physics from './engine/physics.js';
import * as TerminalUI from './ui/terminal.js';
import * as Entities from './game/entities.js';

let lastTime = performance.now();
let accumulator = 0;
const fixedDt = 1 / 60; // Strictly 60Hz (16.666ms)

function init() {
    console.log("SYS.RESONANCE // BOOT SEQUENCE INITIATED");
    
    // 1. Initialize Peripheral Systems (Phase 3)
    // Webring.init(state);
    TerminalUI.init(state, profile);
    
    // 2. Initialize Engine (Phase 2)
    Graphics.init(state);
    Physics.init(state);

    // 3. Initialize Entities (Phase 3)
    Entities.spawnCrown(Graphics.scene);
    Entities.spawnBots(Graphics.scene, null); // Pass rival domain if available
    
    // 4. Start Loop
    requestAnimationFrame(gameLoop);
}

function gameLoop(currentTime) {
    requestAnimationFrame(gameLoop);
    
    if (!state.isPlaying || state.isPaused) {
        lastTime = currentTime; // Prevent "spiral of death" when paused
        Graphics.render(state); // Keep rendering the static frame
        return;
    }

    let frameTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Failsafe: Cap frame time to prevent physics explosions if tab is backgrounded
    if (frameTime > 0.25) frameTime = 0.25;

    accumulator += frameTime;

    // Fixed-Timestep Physics Execution
    while (accumulator >= fixedDt) {
        Physics.update(state, fixedDt);
        Entities.updateBots(fixedDt, Graphics.camera.position);
        
        accumulator -= fixedDt;
        
        // Clear single-frame input triggers after physics consumes them
        state.input.mouseJustPressed = false;
        state.input.mouseJustReleased = false;
    }

    Graphics.render(state);
}

// --- DECOUPLED INPUT LISTENERS ---
// Instead of mutating player velocity directly, we mutate state.input.
// Physics.js will read this state during its fixed tick.

document.addEventListener('mousemove', (e) => {
    if (!state.isPlaying || state.isPaused || document.pointerLockElement !== document.body) return;
    state.input.yaw -= e.movementX * 0.002;
    state.input.pitch -= e.movementY * 0.002;
    state.input.pitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, state.input.pitch));
});

document.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (key === 'w') state.input.forward = true;
    if (key === 's') state.input.backward = true;
    if (key === 'a') state.input.left = true;
    if (key === 'd') state.input.right = true;
});

document.addEventListener('keyup', e => {
    const key = e.key.toLowerCase();
    if (key === 'w') state.input.forward = false;
    if (key === 's') state.input.backward = false;
    if (key === 'a') state.input.left = false;
    if (key === 'd') state.input.right = false;
});

document.addEventListener('mousedown', e => {
    if (e.button === 0) {
        state.input.mouseDown = true;
        state.input.mouseJustPressed = true;
    }
});

document.addEventListener('mouseup', e => {
    if (e.button === 0) {
        state.input.mouseDown = false;
        state.input.mouseJustReleased = true;
    }
});

// Boot the application
window.addEventListener('DOMContentLoaded', init);

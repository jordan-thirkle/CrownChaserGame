// js/main.js
import { state, profile } from './core/state.js';

// NOTE: We will uncomment these as we build them in Phase 2 & 3!
import * as Graphics from './engine/graphics.js';
import * as Physics from './engine/physics.js';
import * as TerminalUI from './ui/terminal.js';
import * as Entities from './game/entities.js';
import * as Webring from './core/webring.js';
import * as Debug from './engine/debug.js';

let lastTime = performance.now();
let accumulator = 0;
const fixedDt = 1 / 60; // Strictly 60Hz (16.666ms)

class Profiler {
    constructor() {
        this.frameTimes = [];
        this.accDepths = [];
        this.lastLog = 0;
    }
    update(dt, acc) {
        this.frameTimes.push(dt);
        this.accDepths.push(acc);
        if (performance.now() - this.lastLog > 1000) {
            const avgDt = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
            const maxAcc = Math.max(...this.accDepths);
            console.log(`[PRF] FPS: ${Math.round(1/avgDt)} | Avg DT: ${(avgDt*1000).toFixed(2)}ms | Max Acc: ${(maxAcc*1000).toFixed(2)}ms`);
            this.frameTimes = [];
            this.accDepths = [];
            this.lastLog = performance.now();
        }
    }
}
const profiler = new Profiler();

function init() {
    console.log("SYS.RESONANCE // BOOT SEQUENCE INITIATED");
    
    // 1. Initialize Core Engine FIRST (Creates the Scene & Hash Grid)
    Graphics.init(state);
    Physics.init(state);

    // 2. Initialize Entities (Requires the Scene)
    Entities.spawnCrown(Graphics.scene);
    Entities.spawnBots(Graphics.scene, state.rivalDomain); // Pass rival domain if available
    
    // 3. Initialize Peripheral Systems (Requires Scene & State)
    Webring.init(Graphics.scene);
    TerminalUI.init(state, profile);
    Debug.init();
    
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

    let steps = 0;
    // Fixed-Timestep Physics Execution
    while (accumulator >= fixedDt) {
        Physics.update(state, fixedDt);
        Entities.updateBots(fixedDt, Graphics.camera.position);
        Webring.update(fixedDt);
        
        accumulator -= fixedDt;
        steps++;
        
        // Decement input buffer
        if (state.input.bufferTimer > 0) state.input.bufferTimer -= fixedDt;
        
        // Clear single-frame input triggers after physics consumes them
        state.input.mouseJustPressed = false;
        state.input.mouseJustReleased = false;
    }

    state.lastDt = frameTime;
    state.lastAcc = accumulator;
    state.lastSteps = steps;

    Debug.update(frameTime, accumulator, steps);
    profiler.update(frameTime, accumulator);
    if (steps > 1) console.warn(`[PRF] Physics Spike: ${steps} steps in one frame!`);

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
        state.input.bufferTimer = 0.15; // 150ms of buffer for "intent"
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

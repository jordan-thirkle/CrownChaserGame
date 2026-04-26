// js/engine/debug.js
import { state } from '../core/state.js';

let debugEl = null;
let lastUpdate = 0;

export function init() {
    debugEl = document.createElement('div');
    debugEl.id = 'debug-overlay';
    debugEl.style.cssText = `
        position: fixed; top: 10px; left: 10px;
        background: rgba(0,0,0,0.8); color: #00f0ff;
        font-family: 'Courier New', monospace; font-size: 10px;
        padding: 10px; border: 1px solid #00f0ff;
        pointer-events: none; z-index: 9999; display: none;
    `;
    document.body.appendChild(debugEl);

    // Toggle with backtick
    document.addEventListener('keydown', (e) => {
        if (e.key === '`') {
            debugEl.style.display = debugEl.style.display === 'none' ? 'block' : 'none';
        }
    });

    window.Debug = { dumpReport };
}

export function update(dt, accumulator, steps) {
    if (!debugEl || debugEl.style.display === 'none') return;

    if (performance.now() - lastUpdate < 100) return; // Cap UI refresh rate
    lastUpdate = performance.now();

    const speed = new THREE.Vector3(state.player.vel.x, state.player.vel.y, state.player.vel.z).length();
    const botCount = Object.keys(state.peers).length;

    debugEl.innerHTML = `
        <div style="color:#ffcc00; font-weight:bold; margin-bottom:5px;">[SYS.TELEMETRY]</div>
        --- ENGINE ---<br>
        FPS: ${Math.round(1/dt)}<br>
        ACC: ${(accumulator*1000).toFixed(2)}ms<br>
        STEPS: ${steps}<br><br>
        --- PLAYER ---<br>
        SPD: ${speed.toFixed(2)}<br>
        MULT: ${state.combo.multiplier.toFixed(2)}<br>
        BUFF: ${(state.input.bufferTimer*1000).toFixed(0)}ms<br><br>
        --- ENTITIES ---<br>
        BOTS: ${botCount}<br>
        VIP: ${state.currentVipId}<br>
        ---<br>
        [ \` ] TO TOGGLE
    `;
}

export function dumpReport() {
    const speed = new THREE.Vector3(state.player.vel.x, state.player.vel.y, state.player.vel.z).length();
    const report = {
        timestamp: performance.now(),
        engine: {
            fps: Math.round(1/state.lastDt), // Assuming state stores last dt
            acc: state.lastAcc,
            steps: state.lastSteps
        },
        physics: {
            playerSpeed: speed,
            multiplier: state.combo.multiplier,
            tetherActive: state.tether.active
        },
        entities: {
            botCount: Object.keys(state.peers).length,
            vip: state.currentVipId
        }
    };
    console.log("TELEMETRY_DUMP_START");
    console.log(JSON.stringify(report, null, 2));
    console.log("TELEMETRY_DUMP_END");
    return report;
}

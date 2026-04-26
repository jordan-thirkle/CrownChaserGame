// js/engine/physics.js
import { state } from '../core/state.js';
import { colliders, camera } from './graphics.js';
import * as TerminalUI from '../ui/terminal.js';

// O(1) Spatial Grid Data
// ... (rest of the file)
const spatialGrid = new Map();
const cellSize = 30;
const arenaSize = 400;

export function init() {
    console.log("[SYS] Initializing Physics Engine & Spatial Hash...");
    
    // Build Spatial Hash from Graphics Colliders
    colliders.forEach(c => {
        const k = getCellKey(c.center);
        if(!spatialGrid.has(k)) spatialGrid.set(k, []);
        spatialGrid.get(k).push(c);
    });
}

function getCellKey(p) { 
    return `${Math.floor(p.x/cellSize)},${Math.floor(p.y/cellSize)},${Math.floor(p.z/cellSize)}`; 
}

export function getNearby(p) {
    let res = []; 
    const cx = Math.floor(p.x/cellSize), cy = Math.floor(p.y/cellSize), cz = Math.floor(p.z/cellSize);
    for(let x=-1; x<=1; x++) {
        for(let y=-1; y<=1; y++) {
            for(let z=-1; z<=1; z++) {
                const k = `${cx+x},${cy+y},${cz+z}`; 
                if(spatialGrid.has(k)) res.push(...spatialGrid.get(k));
            }
        }
    }
    return res;
}

export function update(state, dt) {
    // Trigger Tether Logic (With Input Buffering)
    if (state.input.bufferTimer > 0 && !state.tether.active) {
        attemptTether(state);
    }
    if (state.input.mouseJustReleased) releaseTether(state);

    // Combo Decay Math
    if (state.combo.timer > 0) { 
        state.combo.timer -= dt; 
    } else if (state.combo.multiplier > 1.0) { 
        state.combo.multiplier = Math.max(1.0, state.combo.multiplier - (state.combo.decayRate * dt)); 
    }

    // Translate player object into Vector3s for math
    let pos = new THREE.Vector3(state.player.pos.x, state.player.pos.y, state.player.pos.z);
    let vel = new THREE.Vector3(state.player.vel.x, state.player.vel.y, state.player.vel.z);
    
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    
    // Handle WASD Thrust
    // Fallback to default stats if chassis hasn't injected them yet
    const mass = state.player.stats ? state.player.stats.mass : 1.0;
    const drag = state.player.stats ? state.player.stats.drag : 0.99;
    const spring = state.player.stats ? state.player.stats.spring : 30;

    const thrust = (35 / mass) * state.combo.multiplier; 
    
    if (state.input.forward) vel.addScaledVector(forward, thrust * dt);
    if (state.input.backward) vel.addScaledVector(forward, -thrust * dt);
    if (state.input.right) vel.addScaledVector(right, thrust * dt);
    if (state.input.left) vel.addScaledVector(right, -thrust * dt);

    // Tether Physics (Hooke's Law + Tangential Preservation)
    if (state.tether.active) {
        const tetherPoint = new THREE.Vector3(state.tether.point.x, state.tether.point.y, state.tether.point.z);
        const dir = new THREE.Vector3().subVectors(tetherPoint, pos); 
        const dist = dir.length(); 
        dir.normalize();
        
        if (dist > state.tether.length) {
            vel.addScaledVector(dir, (dist - state.tether.length) * spring * dt);
        }
        
        const proj = vel.clone().projectOnVector(dir); 
        const tangential = new THREE.Vector3().subVectors(vel, proj);
        vel.copy(tangential).add(proj.multiplyScalar(0.85)); 
    }

    // Apply Drag and Max Speed
    vel.multiplyScalar(drag);
    const currentMax = 100 + (state.combo.multiplier * 15);
    if (vel.length() > currentMax) vel.setLength(currentMax);

    // O(1) Collision & Graze Detection
    const nextPos = pos.clone().addScaledVector(vel, dt);
    const nearby = getNearby(nextPos); 
    let collided = false;

    for (let c of nearby) {
        const dist = nextPos.distanceTo(c.center);
        if (dist < c.radius + state.player.radius) {
            // Hard Collision
            vel.multiplyScalar(-0.5); 
            state.combo.multiplier = 1.0; 
            state.combo.timer = 0; 
            
            TerminalUI.triggerDamageFlash();
            
            releaseTether(state, true); // Force break
            collided = true; 
            break;
        } else if (dist < c.radius + state.player.radius + 6.0) {
            // Graze
            if (!c.grazed) { 
                c.grazed = true; 
                state.combo.multiplier += 0.5;
                state.combo.timer = state.combo.maxTime;
            }
        } else { 
            c.grazed = false; 
        }
    }

    // Arena Bounds
    if (nextPos.length() > arenaSize) { 
        nextPos.normalize().multiplyScalar(arenaSize); 
        vel.multiplyScalar(-0.5); 
    }

    if (!collided) pos.copy(nextPos);

    // Write back to state
    state.player.pos = { x: pos.x, y: pos.y, z: pos.z };
    state.player.vel = { x: vel.x, y: vel.y, z: vel.z };
    
    // Update HUD
    TerminalUI.updateHUD(vel.length(), state.combo.multiplier, state.combo.timer, state.combo.maxTime);
}

function attemptTether(state) {
    if(!camera) return;
    const raycaster = new THREE.Raycaster(); 
    raycaster.set(camera.position, new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)); 
    raycaster.far = 150; 
    
    let closest = null; 
    let minDist = Infinity;
    const nearby = getNearby(camera.position);
    
    for (let c of nearby) {
        const box = new THREE.Box3().setFromCenterAndSize(c.center, new THREE.Vector3(c.radius*2, c.radius*2, c.radius*2));
        const target = new THREE.Vector3();
        if (raycaster.ray.intersectBox(box, target)) {
            const dist = camera.position.distanceTo(target);
            if (dist < minDist) { minDist = dist; closest = target.clone(); }
        }
    }

    if (closest) {
        state.tether.active = true; 
        state.tether.point = { x: closest.x, y: closest.y, z: closest.z };
        state.tether.length = camera.position.distanceTo(closest);
        TerminalUI.setCrosshairTethered(true);
        state.input.bufferTimer = 0; // Consume intent
    }
}

function releaseTether(state, forced = false) {
    if (!state.tether.active) return;
    
    if (!forced) {
        const vel = new THREE.Vector3(state.player.vel.x, state.player.vel.y, state.player.vel.z);
        const forward = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
        
        // Perfect Release Check
        if (vel.clone().normalize().dot(forward) > 0.95) {
            vel.multiplyScalar(2.5); 
            state.combo.multiplier += 1.0; 
            state.combo.timer = state.combo.maxTime;
            
            TerminalUI.triggerPerfectFlash();
        } else if (vel.clone().normalize().dot(forward) > 0) {
            vel.multiplyScalar(1.5);
        }
        
        state.player.vel = { x: vel.x, y: vel.y, z: vel.z };
    }
    
    state.tether.active = false; 
    TerminalUI.setCrosshairTethered(false);
}

// js/game/entities.js
import { state, profile } from '../core/state.js';
import * as TerminalUI from '../ui/terminal.js';
import * as Physics from '../engine/physics.js'; // Requires export of getNearby()

const arenaSize = 400;

// --- PROCEDURAL CHASSIS GENERATORS (Micro-Assets) ---

export function createOrbGeometry() { 
    const group = new THREE.Group(); 
    group.add(new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 16), new THREE.MeshStandardMaterial({color: 0x222222, metalness: 1, roughness: 0.2}))); 
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.2, 8, 32), new THREE.MeshBasicMaterial({color: 0x00f0ff, wireframe: true})); 
    ring.rotation.x = Math.PI / 2; 
    group.add(ring); 
    return group; 
}

export function createNeedleGeometry() { 
    const group = new THREE.Group(); 
    const nose = new THREE.Mesh(new THREE.ConeGeometry(1, 4, 8), new THREE.MeshStandardMaterial({color: 0x333344})); 
    nose.rotation.x = Math.PI / 2; 
    nose.position.z = -2; 
    group.add(nose); 
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 3, 8), new THREE.MeshBasicMaterial({color: 0xff007f, wireframe: true})); 
    body.rotation.x = Math.PI / 2; 
    body.position.z = 1.5; 
    group.add(body); 
    return group; 
}

export function createBruteGeometry() { 
    const group = new THREE.Group(); 
    group.add(new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), new THREE.MeshStandardMaterial({color: 0x111111}))); 
    group.add(new THREE.Mesh(new THREE.BoxGeometry(4.5, 1, 4.5), new THREE.MeshBasicMaterial({color: 0xffcc00, wireframe: true}))); 
    return group; 
}

// --- ZERO-GC TRAIL BUFFER ---

export function createTrailBuffer(scene) {
    const max = 30; 
    const geo = new THREE.BufferGeometry(); 
    const pos = new Float32Array(max * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, linewidth: 4 }));
    scene.add(line); 
    
    // Pre-allocate to prevent Garbage Collection stutters
    const points = [];
    for(let i = 0; i < max; i++) points.push(new THREE.Vector3());
    
    return { line, positions: pos, points };
}

export function updateTrail(trailObj, newPos, colorHex, trailType, clockElapsedTime) {
    trailObj.line.material.color.setHex(colorHex);
    
    // Shift data (Zero Allocation)
    for(let i = trailObj.points.length - 1; i > 0; i--) {
        trailObj.points[i].copy(trailObj.points[i-1]);
    }
    trailObj.points[0].copy(newPos);

    // Procedural math modifiers
    if(trailType === 'glitch') { 
        const n = Math.sin(clockElapsedTime * 60) * 2; 
        trailObj.points[0].x += n; 
        trailObj.points[0].y -= n; 
    }
    if(trailType === 'sine') { 
        const n = Math.sin(clockElapsedTime * 10) * 3; 
        trailObj.points[0].y += n; 
    }

    for(let i = 0; i < trailObj.points.length; i++) {
        trailObj.positions[i*3] = trailObj.points[i].x; 
        trailObj.positions[i*3+1] = trailObj.points[i].y; 
        trailObj.positions[i*3+2] = trailObj.points[i].z;
    }
    trailObj.line.geometry.attributes.position.needsUpdate = true;
}

// --- ENTITY LIFECYCLES ---

export let crownEntity;

export function spawnCrown(scene) {
    crownEntity = new THREE.Mesh(new THREE.OctahedronGeometry(3), new THREE.MeshBasicMaterial({ color: 0xffcc00, wireframe: true }));
    const glow = new THREE.Mesh(new THREE.OctahedronGeometry(5), new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending }));
    crownEntity.add(glow); 
    scene.add(crownEntity);
    crownEntity.visible = false; // Hidden until player deploys
    
    return { center: new THREE.Vector3(0,0,0), radius: 5, isCrown: true };
}

export function spawnBots(scene, rivalDomain) {
    const botNames = ['N30N', 'V0ID', 'GL1TCH', 'PH4GE', 'CYB3R', 'K1LL', 'V1RUS', 'D3MON', 'PUL5E', 'GHOST'];
    if (rivalDomain) botNames.push(`SYS.${rivalDomain.toUpperCase()}`);

    for(let i = 0; i < botNames.length; i++) {
        const id = 'bot_' + i;
        const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(2), new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true }));
        const glow = new THREE.Mesh(new THREE.OctahedronGeometry(3.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending }));
        glow.visible = false; 
        mesh.add(glow);

        mesh.position.set((Math.random() - 0.5) * 150, (Math.random() - 0.5) * 150, (Math.random() - 0.5) * 150);
        scene.add(mesh);
        
        state.peers[id] = { 
            id, 
            name: botNames[i], 
            mesh, 
            glow, 
            pos: mesh.position.clone(), 
            vel: new THREE.Vector3(), 
            trail: createTrailBuffer(scene), 
            isRival: (rivalDomain && i === botNames.length - 1) 
        };
    }
}

// --- AI LOGIC ---

function applyBotSteering(bot, id, playerPosVec, vipPos, dt) {
    let thrustDir = new THREE.Vector3();
    if (state.currentVipId === id) {
        thrustDir.subVectors(bot.pos, playerPosVec).normalize(); // Evade
    } else {
        thrustDir.subVectors(vipPos, bot.pos).normalize(); // Chase
    }
    bot.vel.addScaledVector(thrustDir, (bot.isRival ? 45 : 30) * dt);
}

function applyBotObstacleAvoidance(bot, dt) {
    const nearby = Physics.getNearby(bot.pos);
    for (let c of nearby) {
        if (bot.pos.distanceTo(c.center) < c.radius + 15) {
            bot.vel.addScaledVector(new THREE.Vector3().subVectors(bot.pos, c.center).normalize(), 60 * dt);
        }
    }
}

function applyBotPhysicsAndBounds(bot, dt) {
    bot.vel.multiplyScalar(0.98); // Drag
    const maxSpeed = bot.isRival ? 100 : 80;
    if(bot.vel.length() > maxSpeed) bot.vel.setLength(maxSpeed);

    bot.pos.addScaledVector(bot.vel, dt);

    // Bounds
    if (bot.pos.length() > arenaSize) {
        bot.pos.normalize().multiplyScalar(arenaSize);
        bot.vel.multiplyScalar(-0.5);
    }
}

function updateBotVisuals(bot, id, dt, cameraPosition) {
    // Mesh Update
    bot.mesh.position.lerp(bot.pos, 0.5);
    if (cameraPosition) bot.mesh.lookAt(cameraPosition);

    // Visuals & Tagging
    if (id === state.currentVipId) {
        bot.glow.visible = true;
        bot.mesh.rotation.z += dt * 5;
        bot.glow.material.color.setHex(0xffcc00);
        updateTrail(bot.trail, bot.pos, 0xffcc00, 'linear', 0);
    } else {
        bot.glow.visible = false;
        bot.mesh.rotation.z += dt;
        updateTrail(bot.trail, bot.pos, bot.isRival ? 0xff0000 : 0x00f0ff, 'linear', 0);
    }
}

function checkCrownSteal(bot, id, vipPos) {
    if (id !== state.currentVipId && bot.pos.distanceTo(vipPos) < 6) {
        state.currentVipId = id;
        // SFX & UI trigger through external modules
        TerminalUI.triggerPerfectFlash();
        TerminalUI.spawnPopup("CROWN LOST!", "#ff007f");
        
        bot.vel.multiplyScalar(-0.5);
        if(state.currentVipId === 'player') {
            // If it stole from player, knock player back
            state.player.vel.x *= -0.5; state.player.vel.y *= -0.5; state.player.vel.z *= -0.5;
        }
    }
}

export function updateBots(dt, cameraPosition) {
    // Helper to extract Vector3 from plain state object
    const playerPosVec = new THREE.Vector3(state.player.pos.x, state.player.pos.y, state.player.pos.z);
    const vipPos = state.currentVipId === 'player' ? playerPosVec : state.peers[state.currentVipId]?.pos;

    if (!vipPos) return;

    for (let id in state.peers) {
        let bot = state.peers[id];

        applyBotSteering(bot, id, playerPosVec, vipPos, dt);
        applyBotObstacleAvoidance(bot, dt);
        applyBotPhysicsAndBounds(bot, dt);
        updateBotVisuals(bot, id, dt, cameraPosition);
        checkCrownSteal(bot, id, vipPos);
    }
}
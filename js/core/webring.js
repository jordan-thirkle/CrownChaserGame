// js/core/webring.js
import { state, profile, saveProfile } from './state.js';
import * as TerminalUI from '../ui/terminal.js';

export let portalCollider = null;
let isTransitioning = false;

export function init(scene) {
    console.log("[SYS] Initializing Webring Portal Protocol...");
    
    // 1. Spawn the Exit Portal Mesh
    const pGeo = new THREE.TorusGeometry(15, 1, 16, 100);
    const mesh = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ color: 0xffcc00, wireframe: true }));
    mesh.position.set(0, 0, -200); 
    scene.add(mesh);
    
    // Add Additive Glow Shell
    const pGlow = new THREE.Mesh(
        new THREE.TorusGeometry(15, 3, 16, 100), 
        new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending })
    );
    mesh.add(pGlow);

    // Register logical collider
    portalCollider = { mesh, radius: 15 };

    // 2. Parse Inbound Webring Telemetry
    parseInbound();
}

function parseInbound() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Inherit username if passed from previous Webring node
    const inboundUser = urlParams.get('username');
    if (inboundUser && !profile.username) {
        profile.username = inboundUser.toUpperCase();
        saveProfile();
        // UI will automatically update via state binding
    }
    
    // Note: The 'ref' parameter (Rival Domain tracking) is independently 
    // parsed inside entities.js during the bot spawning phase.
}

export function update(dt) {
    if (!portalCollider || !state.isPlaying || isTransitioning) return;

    // Rotate portal geometry mathematically
    portalCollider.mesh.rotation.z -= dt * 0.5;

    // O(1) Distance Check for Portal Entry
    const playerPos = new THREE.Vector3(state.player.pos.x, state.player.pos.y, state.player.pos.z);
    
    if (playerPos.distanceTo(portalCollider.mesh.position) < portalCollider.radius) {
        executePortalJump();
    }
}

function executePortalJump() {
    console.log("[SYS] Executing Webring Traversal...");
    
    isTransitioning = true;
    state.isPlaying = false;
    if (document.pointerLockElement) document.exitPointerLock();
    
    // 1. Economy & State Resolution
    const shardsEarned = Math.floor(state.player.score / 10);
    profile.shards += shardsEarned;
    if (Math.floor(state.player.score) > profile.highScore) {
        profile.highScore = Math.floor(state.player.score);
    }
    saveProfile();

    // 2. UI Domination (Override Terminal View)
    const terminalUI = document.getElementById('terminal-ui');
    if (terminalUI) {
        terminalUI.style.display = 'flex'; 
        terminalUI.style.opacity = 1;
        terminalUI.innerHTML = `
            <div class="header">
                <h1>PORTAL LINK ESTABLISHED</h1>
                <div class="balance">SCORE: ${Math.floor(state.player.score)}</div>
                <div class="balance" style="color:var(--boost)">+${shardsEarned} SHARDS</div>
            </div>
            <p style="font-size: 1.5rem; letter-spacing: 2px; margin-top: 2rem;">Encoding Telemetry & Redirecting to Vibe Jam Webring...</p>
        `;
    }
    
    // 3. Outbound Encoding & Redirect
    setTimeout(() => {
        const params = new URLSearchParams();
        
        // Encode state into URL Query Strings for the next game in the ring
        params.set('username', profile.username); 
        params.set('color', state.currentVipId === 'player' ? 'ffcc00' : '00f0ff');
        params.set('speed_x', state.player.vel.x.toFixed(2)); 
        params.set('speed_y', state.player.vel.y.toFixed(2)); 
        params.set('speed_z', state.player.vel.z.toFixed(2));
        params.set('ref', window.location.href); // Pass our origin for Bounty generation
        
        window.location.href = `https://vibej.am/portal/2026?${params.toString()}`;
    }, 1500);
}

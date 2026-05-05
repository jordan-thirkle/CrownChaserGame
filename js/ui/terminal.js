// js/ui/terminal.js
import { state, profile, saveProfile } from '../core/state.js';
import * as Graphics from '../engine/graphics.js';
import * as Audio from '../engine/audio.js';

// --- ASSET DATABASE ---
const chassisDB = {
    'orb': { name: 'The Orb', cost: 0, desc: 'Balanced baseline.', stats: { mass: 1.0, drag: 0.99, spring: 30 } },
    'needle': { name: 'The Needle', cost: 500, desc: 'Aerodynamic. Slides heavy.', stats: { mass: 0.6, drag: 0.995, spring: 20 } },
    'brute': { name: 'The Brute', cost: 1200, desc: 'Aggressive mass and torque.', stats: { mass: 1.85, drag: 0.97, spring: 50 } }
};

const trailsDB = {
    'basic': { name: 'Standard Plasma', cost: 0, desc: 'Linear ion exhaust.', color: 0x00f0ff, type: 'linear' },
    'sine': { name: 'Sine Wave Ripple', cost: 300, desc: 'Oscillating phase frequency.', color: 0xff007f, type: 'sine' },
    'glitch': { name: 'Glitch Noise', cost: 800, desc: 'Corrupted spatial coords.', color: 0xffcc00, type: 'glitch' }
};

// Make these globally accessible so the inline onclick HTML can reach them
if (typeof window !== 'undefined') {
    window.buyItem = buyItem;
    window.equipItem = equipItem;
}

export function init() {
    console.log("[SYS] Initializing Terminal UI...");

    updateTerminalUI();

    // DOM Event Listeners
    const callsignInput = document.getElementById('callsign');
    if (callsignInput) {
        callsignInput.addEventListener('change', (e) => { 
            profile.username = e.target.value.toUpperCase(); 
            saveProfile(); 
        });
        callsignInput.addEventListener('keypress', (e) => { 
            if (e.key === 'Enter') deployToArena(); 
        });
    }

    const deployBtn = document.getElementById('btn-deploy');
    if (deployBtn) {
        deployBtn.addEventListener('mouseenter', () => Audio.play(Audio.sfx.uiHover));
        deployBtn.addEventListener('click', () => { Audio.play(Audio.sfx.uiClick); deployToArena(); });
    }

    // Initialize Garage Preview Camera
    if (Graphics.camera) {
        Graphics.camera.position.set(0, 2, 20); 
        Graphics.camera.lookAt(0, 2, 0);
    }
}

function updateTerminalUI() {
    const shardEl = document.getElementById('shard-balance');
    if (shardEl) shardEl.innerText = profile.shards;
    
    const hsEl = document.getElementById('stat-highscore');
    if (hsEl) hsEl.innerText = profile.highScore;
    
    const callsignInput = document.getElementById('callsign');
    if (callsignInput && profile.username) callsignInput.value = profile.username;

    renderStore(chassisDB, profile.unlockedChassis, profile.equippedChassis, 'chassis-list', 'chassis');
    renderStore(trailsDB, profile.unlockedTrails, profile.equippedTrail, 'trail-list', 'trail');
}

function renderStore(db, unlockedList, equippedId, containerId, typeStr) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';

    // Create a document fragment to avoid iterative reflows and XSS vulnerabilities via innerHTML +=
    const fragment = document.createDocumentFragment();

    for (let id in db) {
        const item = db[id];
        const isUnlocked = unlockedList.includes(id);
        const isEquipped = equippedId === id;
        
        const itemDiv = document.createElement('div');
        itemDiv.className = `store-item ${isEquipped ? 'equipped' : ''}`;

        const infoDiv = document.createElement('div');
        infoDiv.className = 'item-info';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.textContent = item.name;

        const descSpan = document.createElement('span');
        descSpan.className = 'item-desc';
        descSpan.textContent = item.desc;

        infoDiv.appendChild(nameSpan);
        infoDiv.appendChild(descSpan);
        itemDiv.appendChild(infoDiv);

        const btn = document.createElement('button');
        btn.className = 'btn btn-buy';
        if (isEquipped) {
            btn.disabled = true;
            btn.style.background = 'var(--boost)';
            btn.style.color = 'black';
            btn.textContent = 'EQUIPPED';
        } else if (isUnlocked) {
            // Using closures instead of inline onclick for better security and scoping
            btn.addEventListener('mouseenter', () => Audio.play(Audio.sfx.uiHover));
            btn.addEventListener('click', () => { window.equipItem(typeStr, id); Audio.play(Audio.sfx.uiClick); });
            btn.textContent = 'EQUIP';
        } else {
            btn.addEventListener('mouseenter', () => Audio.play(Audio.sfx.uiHover));
            btn.addEventListener('click', () => { window.buyItem(typeStr, id); });
            btn.textContent = `BUY (${item.cost})`;
        }
        itemDiv.appendChild(btn);

        fragment.appendChild(itemDiv);
    }

    container.appendChild(fragment);
}

function buyItem(type, id) {
    const cost = type === 'chassis' ? chassisDB[id].cost : trailsDB[id].cost;
    if (profile.shards >= cost) {
        Audio.play(Audio.sfx.uiClick);
        profile.shards -= cost;
        type === 'chassis' ? profile.unlockedChassis.push(id) : profile.unlockedTrails.push(id);
        saveProfile();
        updateTerminalUI();
    } else {
        alert("NOT ENOUGH SHARDS");
    }
}

function equipItem(type, id) {
    type === 'chassis' ? profile.equippedChassis = id : profile.equippedTrail = id;
    saveProfile();
    updateTerminalUI();
}

function deployToArena() {
    if(!profile.username) { alert("ENTER CALLSIGN TO DEPLOY"); return; }
    
    // Inject stats into the core engine state
    state.player.stats = chassisDB[profile.equippedChassis].stats;
    
    // Trigger UI transitions
    const terminalUI = document.getElementById('terminal-ui');
    if (terminalUI) {
        terminalUI.style.opacity = 0;
        setTimeout(() => {
            terminalUI.style.display = 'none';
            const hud = document.getElementById('hud');
            if(hud) hud.style.display = 'flex';
            
            document.body.requestPointerLock();
            state.isPlaying = true;
        }, 500);
    }
}

// --- EXTERNAL HUD TRIGGERS FOR PHYSICS.JS ---

export function triggerDamageFlash() {
    const el = document.getElementById('damage-flash');
    if (!el) return;
    el.style.opacity = 1;
    setTimeout(() => el.style.opacity = 0, 100);
}

export function triggerPerfectFlash() {
    const el = document.getElementById('invert-flash');
    if (!el) return;
    el.style.opacity = 1;
    setTimeout(() => el.style.opacity = 0, 100);
}

export function updateHUD(speed, comboMult, comboTimer, comboMax) {
    const speedEl = document.getElementById('speed-val');
    if (speedEl) speedEl.innerText = Math.floor(speed).toString().padStart(3, '0');
    
    const comboEl = document.getElementById('combo-val');
    if (comboEl) comboEl.innerText = comboMult.toFixed(1);
    
    const barEl = document.getElementById('combo-bar-fill');
    if (barEl) barEl.style.transform = `scaleX(${Math.max(0, comboTimer / comboMax)})`;
}

export function setCrosshairTethered(active) {
    const el = document.getElementById('crosshair');
    if (!el) return;
    if (active) el.classList.add('tethered');
    else el.classList.remove('tethered');
}

export function spawnPopup(text, color) {
    const container = document.getElementById('popup-container');
    if (!container) return;
    const el = document.createElement('div'); 
    el.className = 'popup-text'; 
    el.style.color = color; 
    el.innerText = text;
    container.appendChild(el); 
    setTimeout(() => { if(el.parentNode) el.parentNode.removeChild(el); }, 1000);
}

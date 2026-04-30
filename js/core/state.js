// js/core/state.js

const CURRENT_SAVE_VERSION = 1;

// 1. Initialize / Migrate LocalStorage Economy
export const profile = loadProfile();

// 2. Centralized Game State
export const state = {
    gamePhase: 'intro', // 'intro', 'playing'
    isPlaying: false,
    isPaused: false,
    lastDt: 0,
    lastAcc: 0,
    lastSteps: 0,
    currentVipId: 'crown_entity',
    
    player: {
        pos: { x: 0, y: 0, z: 50 }, 
        vel: { x: 0, y: 0, z: 0 },
        radius: 2,
        score: 0,
        stats: null // Will be injected by the equipped chassis
    },
    
    combo: {
        multiplier: 1.0,
        timer: 0.0,
        maxTime: 2.5,
        decayRate: 1.2
    },
    
    tether: {
        active: false,
        point: { x: 0, y: 0, z: 0 },
        length: 0
    },
    
    peers: {}, // Holds bot and ghost data
    rivalDomain: null,
    
    // Decoupled Input State (Read by Physics, written by Main)
    input: {
        forward: false, backward: false, left: false, right: false,
        pitch: 0, yaw: 0,
        mouseDown: false, mouseJustPressed: false, mouseJustReleased: false,
        bufferTimer: 0 // Window for "intent to grapple"
    }
};

function loadProfile() {
    let loaded;
    try {
        if (typeof localStorage !== 'undefined') {
            loaded = JSON.parse(localStorage.getItem('vibe_resonance_profile')) || {};
        } else {
            loaded = {};
        }
    } catch(e) {
        loaded = {};
    }

    // Schema Migration & Validation
    if (!loaded.version || loaded.version < CURRENT_SAVE_VERSION) {
        console.log(`[SYS] Migrating save profile to version ${CURRENT_SAVE_VERSION}`);
        loaded = {
            version: CURRENT_SAVE_VERSION,
            username: loaded.username || '',
            shards: loaded.shards !== undefined ? loaded.shards : 1000,
            highScore: loaded.highScore || 0,
            unlockedChassis: Array.isArray(loaded.unlockedChassis) ? loaded.unlockedChassis : ['orb'],
            equippedChassis: loaded.equippedChassis || 'orb',
            unlockedTrails: Array.isArray(loaded.unlockedTrails) ? loaded.unlockedTrails : ['basic'],
            equippedTrail: loaded.equippedTrail || 'basic'
        };
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('vibe_resonance_profile', JSON.stringify(loaded));
        }
    }
    return loaded;
}

export function saveProfile() {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('vibe_resonance_profile', JSON.stringify(profile));
        }
    } catch(e) {
        console.warn("[SYS] Failed to save profile to localStorage", e);
    }
}

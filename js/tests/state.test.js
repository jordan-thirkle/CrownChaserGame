import test from 'node:test';
import assert from 'node:assert';

global.localStorage = {
    store: {},
    getItem(key) {
        return this.store[key] || null;
    },
    setItem(key, value) {
        this.store[key] = String(value);
    },
    clear() {
        this.store = {};
    }
};

test('loadProfile - missing profile', async () => {
    localStorage.clear();
    const { loadProfile } = await import('../core/state.js?v=2');
    const p = loadProfile();
    assert.strictEqual(p.version, 1);
    assert.strictEqual(p.shards, 1000);
});

test('loadProfile - valid existing profile', async () => {
    localStorage.clear();
    const validProfile = {
        version: 1,
        username: 'test_user',
        shards: 500,
        highScore: 100,
        unlockedChassis: ['orb', 'cube'],
        equippedChassis: 'cube',
        unlockedTrails: ['basic', 'fire'],
        equippedTrail: 'fire'
    };
    localStorage.setItem('vibe_resonance_profile', JSON.stringify(validProfile));
    const { loadProfile } = await import('../core/state.js?v=3');
    const p = loadProfile();
    assert.strictEqual(p.version, 1);
    assert.strictEqual(p.username, 'test_user');
    assert.strictEqual(p.shards, 500);
    assert.strictEqual(p.highScore, 100);
    assert.deepStrictEqual(p.unlockedChassis, ['orb', 'cube']);
    assert.strictEqual(p.equippedChassis, 'cube');
});

test('loadProfile - outdated profile migration', async () => {
    localStorage.clear();
    const outdatedProfile = {
        // no version
        username: 'old_user',
        shards: 10,
        unlockedChassis: 'orb' // not an array
    };
    localStorage.setItem('vibe_resonance_profile', JSON.stringify(outdatedProfile));
    const { loadProfile } = await import('../core/state.js?v=4');
    const p = loadProfile();
    assert.strictEqual(p.version, 1);
    assert.strictEqual(p.username, 'old_user');
    assert.strictEqual(p.shards, 10);
    assert.strictEqual(p.highScore, 0); // Default applied
    assert.deepStrictEqual(p.unlockedChassis, ['orb']); // Default applied since it wasn't an array
});

test('loadProfile - corrupted JSON', async () => {
    localStorage.clear();
    localStorage.setItem('vibe_resonance_profile', '{ corrupted json');
    const { loadProfile } = await import('../core/state.js?v=5');
    const p = loadProfile();
    assert.strictEqual(p.version, 1);
    assert.strictEqual(p.shards, 1000); // defaults
});

test('saveProfile - saves to localStorage', async () => {
    localStorage.clear();
    const { profile, saveProfile } = await import('../core/state.js?v=6');
    profile.username = 'saved_user';
    saveProfile();
    const loadedStr = localStorage.getItem('vibe_resonance_profile');
    const loaded = JSON.parse(loadedStr);
    assert.strictEqual(loaded.username, 'saved_user');
});

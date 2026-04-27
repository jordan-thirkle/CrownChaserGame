import test from 'node:test';
import assert from 'node:assert';

// Mock localStorage
global.localStorage = {
    _data: {},
    getItem(key) {
        return this._data[key] || null;
    },
    setItem(key, value) {
        this._data[key] = String(value);
    },
    clear() {
        this._data = {};
    }
};

test('state module - profile loading and migration', async (t) => {
    await t.test('loads default profile when localStorage is empty', async () => {
        global.localStorage.clear();

        // Use cache-busting to re-evaluate the module
        const { profile } = await import('./state.js?t=1');

        assert.equal(profile.version, 1);
        assert.equal(profile.shards, 1000);
        assert.deepEqual(profile.unlockedChassis, ['orb']);
        assert.equal(profile.equippedChassis, 'orb');

        // Ensure it saved the migrated profile back
        const saved = JSON.parse(global.localStorage.getItem('vibe_resonance_profile'));
        assert.equal(saved.version, 1);
        assert.equal(saved.shards, 1000);
    });

    await t.test('handles invalid JSON in localStorage gracefully', async () => {
        global.localStorage.clear();
        global.localStorage.setItem('vibe_resonance_profile', 'invalid-json');

        const { profile } = await import('./state.js?t=2');

        assert.equal(profile.version, 1);
        assert.equal(profile.shards, 1000);
    });

    await t.test('migrates outdated profile', async () => {
        global.localStorage.clear();
        const outdatedProfile = {
            username: 'OldPlayer',
            shards: 50,
            // Missing version, equippedChassis, etc.
        };
        global.localStorage.setItem('vibe_resonance_profile', JSON.stringify(outdatedProfile));

        const { profile } = await import('./state.js?t=3');

        assert.equal(profile.version, 1);
        assert.equal(profile.username, 'OldPlayer');
        assert.equal(profile.shards, 50); // Should keep old shards
        assert.equal(profile.equippedChassis, 'orb'); // Should add defaults
        assert.deepEqual(profile.unlockedTrails, ['basic']);
    });

    await t.test('loads valid current profile without migrating', async () => {
        global.localStorage.clear();
        const validProfile = {
            version: 1,
            username: 'ProGamer',
            shards: 9999,
            highScore: 500,
            unlockedChassis: ['orb', 'cube'],
            equippedChassis: 'cube',
            unlockedTrails: ['basic', 'fire'],
            equippedTrail: 'fire'
        };
        global.localStorage.setItem('vibe_resonance_profile', JSON.stringify(validProfile));

        const { profile } = await import('./state.js?t=4');

        assert.equal(profile.version, 1);
        assert.equal(profile.username, 'ProGamer');
        assert.equal(profile.shards, 9999);
        assert.equal(profile.equippedChassis, 'cube');
        assert.deepEqual(profile.unlockedChassis, ['orb', 'cube']);
    });
});

test('state module - saveProfile', async (t) => {
    await t.test('saves current profile to localStorage', async () => {
        global.localStorage.clear();

        const { profile, saveProfile } = await import('./state.js?t=5');

        // Modify the profile
        profile.shards = 12345;
        profile.username = 'Saver';

        saveProfile();

        const saved = JSON.parse(global.localStorage.getItem('vibe_resonance_profile'));
        assert.equal(saved.shards, 12345);
        assert.equal(saved.username, 'Saver');
    });

    await t.test('handles localStorage exceptions gracefully', async () => {
        global.localStorage.clear();

        const { profile, saveProfile } = await import('./state.js?t=6');

        // Sabotage localStorage
        const originalSetItem = global.localStorage.setItem;
        global.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };

        // Should not throw
        assert.doesNotThrow(() => {
            saveProfile();
        });

        // Restore
        global.localStorage.setItem = originalSetItem;
    });
});

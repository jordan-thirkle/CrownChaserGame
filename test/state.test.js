import test from 'node:test';
import assert from 'node:assert';

test('saveProfile successfully saves to localStorage', async () => {
    let savedKey = null;
    let savedValue = null;

    globalThis.localStorage = {
        getItem: () => null,
        setItem: (key, value) => {
            savedKey = key;
            savedValue = value;
        }
    };

    const state = await import('../js/core/state.js');

    state.saveProfile();

    assert.strictEqual(savedKey, 'vibe_resonance_profile');
    assert.ok(savedValue);

    // Clean up
    delete globalThis.localStorage;
    // reset module cache for next test (not easily possible with esm, but we can reset state)
});

test('saveProfile error handling', async () => {
    let shouldThrow = false;
    globalThis.localStorage = {
        getItem: () => null,
        setItem: () => {
            if (shouldThrow) throw new Error('Storage Full');
        }
    };

    const originalWarn = console.warn;
    let warnedMessage = null;
    let warnedError = null;
    console.warn = (msg, err) => {
        warnedMessage = msg;
        warnedError = err;
    };

    // dynamically importing so it runs loadProfile, which calls setItem and triggers 'Storage Full' error unless we do shouldThrow
    const state = await import('../js/core/state.js?t=' + Date.now());

    shouldThrow = true;
    state.saveProfile();

    assert.strictEqual(warnedMessage, "[SYS] Failed to save profile to localStorage");
    assert.strictEqual(warnedError.message, 'Storage Full');

    console.warn = originalWarn;
    delete globalThis.localStorage;
});

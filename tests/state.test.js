import test from 'node:test';
import assert from 'node:assert';

global.localStorage = {
    getItem: () => null,
    setItem: () => {}
};

const { saveProfile } = await import('../js/core/state.js');

test('saveProfile handles localStorage errors gracefully', () => {
    global.localStorage.setItem = () => {
        throw new Error('QuotaExceededError');
    };

    let errorLogged = false;
    let loggedError = null;
    const originalConsoleWarn = console.warn;

    console.warn = (msg, e) => {
        if (msg === "[SYS] Failed to save profile to localStorage") {
            errorLogged = true;
            loggedError = e;
        }
    };

    saveProfile();

    assert.strictEqual(errorLogged, true);
    assert.strictEqual(loggedError.message, 'QuotaExceededError');

    console.warn = originalConsoleWarn;
    global.localStorage.setItem = () => {};
});

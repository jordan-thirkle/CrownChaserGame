// Set up global mocks before importing the modules that require them
if (typeof global !== 'undefined' && !global.localStorage) {
    global.localStorage = {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {}
    };
}

// Now import the rest
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { updateHUD, triggerDamageFlash, triggerPerfectFlash, setCrosshairTethered, spawnPopup } from './terminal.js';

describe('Terminal UI HUD Updates', () => {
    let dom;
    let window;
    let document;

    beforeEach(() => {
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <div id="speed-val"></div>
                <div id="combo-val"></div>
                <div id="combo-bar-fill"></div>
                <div id="damage-flash" style="opacity: 0;"></div>
                <div id="invert-flash" style="opacity: 0;"></div>
                <div id="crosshair"></div>
                <div id="popup-container"></div>
            </body>
            </html>
        `, { url: 'http://localhost' });
        window = dom.window;
        document = window.document;
        global.window = window;
        global.document = document;
    });

    afterEach(() => {
        delete global.window;
        delete global.document;
    });

    test('updateHUD updates speed value with padding', () => {
        updateHUD(5.2, 1.0, 0, 10);
        const speedEl = document.getElementById('speed-val');
        assert.strictEqual(speedEl.innerText, '005');

        updateHUD(123.9, 1.0, 0, 10);
        assert.strictEqual(speedEl.innerText, '123');
    });

    test('updateHUD updates combo multiplier with one decimal place', () => {
        updateHUD(0, 1.5, 0, 10);
        const comboEl = document.getElementById('combo-val');
        assert.strictEqual(comboEl.innerText, '1.5');

        updateHUD(0, 2, 0, 10);
        assert.strictEqual(comboEl.innerText, '2.0');
    });

    test('updateHUD scales combo bar correctly', () => {
        updateHUD(0, 1.0, 5, 10);
        const barEl = document.getElementById('combo-bar-fill');
        assert.strictEqual(barEl.style.transform, 'scaleX(0.5)');

        updateHUD(0, 1.0, -1, 10);
        assert.strictEqual(barEl.style.transform, 'scaleX(0)');

        updateHUD(0, 1.0, 10, 10);
        assert.strictEqual(barEl.style.transform, 'scaleX(1)');
    });

    test('triggerDamageFlash sets opacity to 1 then 0', () => {
        const originalSetTimeout = global.setTimeout;
        let timeoutCb;
        global.setTimeout = (cb) => { timeoutCb = cb; };

        try {
            triggerDamageFlash();
            const el = document.getElementById('damage-flash');
            assert.strictEqual(el.style.opacity, '1');

            timeoutCb();
            assert.strictEqual(el.style.opacity, '0');
        } finally {
            global.setTimeout = originalSetTimeout;
        }
    });

    test('triggerPerfectFlash sets opacity to 1 then 0', () => {
        const originalSetTimeout = global.setTimeout;
        let timeoutCb;
        global.setTimeout = (cb) => { timeoutCb = cb; };

        try {
            triggerPerfectFlash();
            const el = document.getElementById('invert-flash');
            assert.strictEqual(el.style.opacity, '1');

            timeoutCb();
            assert.strictEqual(el.style.opacity, '0');
        } finally {
            global.setTimeout = originalSetTimeout;
        }
    });

    test('setCrosshairTethered adds and removes class', () => {
        const el = document.getElementById('crosshair');

        setCrosshairTethered(true);
        assert.strictEqual(el.classList.contains('tethered'), true);

        setCrosshairTethered(false);
        assert.strictEqual(el.classList.contains('tethered'), false);
    });

    test('spawnPopup creates and removes element', () => {
        const originalSetTimeout = global.setTimeout;
        let timeoutCb;
        global.setTimeout = (cb) => { timeoutCb = cb; };

        try {
            spawnPopup('Test Popup', 'red');
            const container = document.getElementById('popup-container');

            assert.strictEqual(container.children.length, 1);
            const popup = container.children[0];
            assert.strictEqual(popup.className, 'popup-text');
            assert.strictEqual(popup.style.color, 'red');
            assert.strictEqual(popup.innerText, 'Test Popup');

            timeoutCb();
            assert.strictEqual(container.children.length, 0);
        } finally {
            global.setTimeout = originalSetTimeout;
        }
    });

    test('functions handle missing DOM elements gracefully', () => {
        document.body.innerHTML = ''; // Clear DOM
        // None of these should throw errors
        assert.doesNotThrow(() => updateHUD(100, 2.0, 5, 10));
        assert.doesNotThrow(() => triggerDamageFlash());
        assert.doesNotThrow(() => triggerPerfectFlash());
        assert.doesNotThrow(() => setCrosshairTethered(true));
        assert.doesNotThrow(() => spawnPopup('Test', 'red'));
    });
});

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

// Mock Browser Environment
global.window = {
    AudioContext: class {
        constructor() { this.state = 'running'; }
        createBufferSource() { return { connect: () => {}, start: () => {}, buffer: null }; }
        createBuffer() { return { getChannelData: () => ({ set: () => {} }) }; }
        createGain() { return { connect: () => {}, gain: { value: 0 } }; }
        createPanner() { return { connect: () => {}, positionX: {}, positionY: {}, positionZ: {} }; }
        destination = {};
    }
};

global.document = {
    addEventListener: () => {},
    removeEventListener: () => {}
};

describe('Audio Module', () => {
    it('defers AudioContext creation until init is called', async () => {
        const audio = await import(`../engine/audio.js?v=${Date.now()}`);
        assert.strictEqual(audio.zzfxX, undefined);
    });

    it('creates AudioContext on init', async () => {
        const audio = await import(`../engine/audio.js?v=${Date.now()}`);

        // Mock interaction event listener registration
        let interactCallback = null;
        global.document.addEventListener = (evt, cb) => {
            if (!interactCallback) interactCallback = cb;
        };

        audio.init();

        // Simulate user interaction
        if (interactCallback) interactCallback();

        assert.notStrictEqual(audio.zzfxX, undefined);
        assert.strictEqual(audio.zzfxX.state, 'running');
    });

    it('plays spatial sound without throwing errors', async () => {
        const audio = await import(`../engine/audio.js?v=${Date.now()}`);

        let interactCallback = null;
        global.document.addEventListener = (evt, cb) => { interactCallback = cb; };
        audio.init();
        if (interactCallback) interactCallback();

        // Should not throw even if camera is undefined (handles fallback)
        assert.doesNotThrow(() => {
            audio.play3D(audio.sfx.tetherAttach, { x: 10, y: 0, z: 0 });
        });
    });

    it('plays non-spatial sound without throwing errors', async () => {
        const audio = await import(`../engine/audio.js?v=${Date.now()}`);

        let interactCallback = null;
        global.document.addEventListener = (evt, cb) => { interactCallback = cb; };
        audio.init();
        if (interactCallback) interactCallback();

        assert.doesNotThrow(() => {
            audio.play(audio.sfx.uiClick);
        });
    });
});

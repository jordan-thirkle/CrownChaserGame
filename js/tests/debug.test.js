import test from 'node:test';
import assert from 'node:assert';

// Mock localStorage BEFORE importing any modules that use it
global.localStorage = {
    getItem: () => null,
    setItem: () => {}
};

// Mock THREE
global.THREE = {
    Vector3: class {
        constructor(x, y, z) {
            this.x = x;
            this.y = y;
            this.z = z;
        }
        length() {
            return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        }
    }
};

// Import modules
const { state } = await import('../core/state.js');
const { dumpReport } = await import('../engine/debug.js');

test('dumpReport generates correct telemetry JSON structure', () => {
    // Setup state
    state.lastDt = 0.016;
    state.lastAcc = 0.005;
    state.lastSteps = 2;
    state.player.vel = { x: 3, y: 4, z: 0 }; // length is 5
    state.combo.multiplier = 1.5;
    state.tether.active = true;
    state.peers = { 'bot1': {}, 'bot2': {} };
    state.currentVipId = 'bot1';

    // Mock console.log to avoid noisy output during tests
    const originalLog = console.log;
    let loggedLines = [];
    console.log = (msg) => loggedLines.push(msg);

    try {
        const report = dumpReport();

        assert.ok(report.timestamp > 0);
        assert.strictEqual(report.engine.fps, Math.round(1 / 0.016));
        assert.strictEqual(report.engine.acc, 0.005);
        assert.strictEqual(report.engine.steps, 2);

        assert.strictEqual(report.physics.playerSpeed, 5);
        assert.strictEqual(report.physics.multiplier, 1.5);
        assert.strictEqual(report.physics.tetherActive, true);

        assert.strictEqual(report.entities.botCount, 2);
        assert.strictEqual(report.entities.vip, 'bot1');

        assert.strictEqual(loggedLines[0], "TELEMETRY_DUMP_START");
        assert.ok(loggedLines[1].includes('"fps"'));
        assert.strictEqual(loggedLines[2], "TELEMETRY_DUMP_END");
    } finally {
        // Restore console.log
        console.log = originalLog;
    }
});

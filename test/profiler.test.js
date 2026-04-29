import test from 'node:test';
import assert from 'node:assert';
import { setCurrentTime } from './setup.js';
import { Profiler } from '../js/main.js';

test('Profiler', async (t) => {
  await t.test('constructor initializes empty arrays and zero lastLog', () => {
    setCurrentTime(100);
    const profiler = new Profiler();
    assert.deepStrictEqual(profiler.frameTimes, []);
    assert.deepStrictEqual(profiler.accDepths, []);
    assert.strictEqual(profiler.lastLog, 0);
  });

  await t.test('update() adds elements to frameTimes and accDepths', () => {
    setCurrentTime(500);
    const profiler = new Profiler();

    profiler.update(0.016, 0.005);

    assert.strictEqual(profiler.frameTimes.length, 1);
    assert.strictEqual(profiler.frameTimes[0], 0.016);
    assert.strictEqual(profiler.accDepths.length, 1);
    assert.strictEqual(profiler.accDepths[0], 0.005);
  });

  await t.test('update() logs and resets arrays when time elapsed > 1000ms', () => {
    // Setup console.log spy
    const originalLog = console.log;
    let loggedMsg = null;
    console.log = (msg) => { loggedMsg = msg; };

    try {
      setCurrentTime(0);
      const profiler = new Profiler();

      // First update, elapsed = 500 - 0 = 500 (no log)
      setCurrentTime(500);
      profiler.update(0.016, 0.005);

      assert.strictEqual(loggedMsg, null);
      assert.strictEqual(profiler.frameTimes.length, 1);

      // Second update, elapsed = 1100 - 0 = 1100 (> 1000, should log)
      setCurrentTime(1100);
      profiler.update(0.020, 0.010);

      assert.notStrictEqual(loggedMsg, null);
      assert.match(loggedMsg, /\[PRF\] FPS: 56 \| Avg DT: 18.00ms \| Max Acc: 10.00ms/);

      // Arrays should be reset
      assert.deepStrictEqual(profiler.frameTimes, []);
      assert.deepStrictEqual(profiler.accDepths, []);

      // lastLog should be updated
      assert.strictEqual(profiler.lastLog, 1100);
    } finally {
      console.log = originalLog; // Restore
    }
  });

  await t.test('update() computes max accumulator depth correctly', () => {
    const originalLog = console.log;
    let loggedMsg = null;
    console.log = (msg) => { loggedMsg = msg; };

    try {
      setCurrentTime(0);
      const profiler = new Profiler();

      setCurrentTime(500);
      profiler.update(0.016, 0.005);

      setCurrentTime(800);
      profiler.update(0.016, 0.025); // Max acc

      setCurrentTime(900);
      profiler.update(0.016, 0.015);

      setCurrentTime(1500);
      profiler.update(0.016, 0.001); // Triggers log

      assert.notStrictEqual(loggedMsg, null);
      assert.match(loggedMsg, /Max Acc: 25.00ms/);
    } finally {
      console.log = originalLog; // Restore
    }
  });
});

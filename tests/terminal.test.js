import test from 'node:test';
import assert from 'node:assert';

// Mock DOM & LocalStorage before any imports
global.window = {};
global.document = {
    getElementById: (id) => ({
        id: id,
        innerText: '',
        innerHTML: '',
        value: '',
        addEventListener: () => {}
    }),
    body: { requestPointerLock: () => {}, appendChild: () => {} },
    createElement: () => ({ style: {} }),
    addEventListener: () => {}
};
global.localStorage = {
    store: {},
    getItem: function(key) { return this.store[key] || null; },
    setItem: function(key, value) { this.store[key] = value; },
    clear: function() { this.store = {}; }
};

let alerts = [];
global.alert = (msg) => { alerts.push(msg); };

// Stub THREE.js to prevent graphic errors during import
global.THREE = {
    Scene: class {},
    FogExp2: class {},
    PerspectiveCamera: class { position = {set:()=>{}}; lookAt() {} },
    WebGLRenderer: class { setSize() {} setPixelRatio() {} setClearColor() {} get domElement() { return {}; } },
    Vector2: class {},
    Vector3: class { set() {} clone() { return this; } length() { return 0; } setLength() {} },
    Object3D: class { position = {set:()=>{}}; rotation = {set:()=>{}}; scale = {set:()=>{}}; updateMatrix() {} },
    MeshStandardMaterial: class {},
    MeshBasicMaterial: class {},
    IcosahedronGeometry: class {},
    InstancedMesh: class { setMatrixAt() {} },
    BufferGeometry: class { setFromPoints() {} setAttribute() {} },
    LineBasicMaterial: class {},
    Line: class {},
    Float32Array: class {},
    BufferAttribute: class {},
    PointsMaterial: class {},
    Points: class {},
    AmbientLight: class {},
    DirectionalLight: class { position = {set:()=>{}} },
    EffectComposer: class { addPass() {} },
    RenderPass: class {},
    UnrealBloomPass: class {},
    ShaderPass: class {},
    RGBShiftShader: {}
};

// Imports
const { profile, saveProfile } = await import('../js/core/state.js');
const terminal = await import('../js/ui/terminal.js');

test('buyItem test suite', async (t) => {
    t.beforeEach(() => {
        global.localStorage.clear();
        // Reset profile to default
        profile.shards = 1000;
        profile.unlockedChassis = ['orb'];
        profile.unlockedTrails = ['basic'];
        alerts.length = 0; // Clear the alerts array
    });

    await t.test('buyItem chassis successful purchase', () => {
        // 'needle' costs 500
        const initialShards = profile.shards;

        window.buyItem('chassis', 'needle');

        assert.strictEqual(profile.shards, initialShards - 500);
        assert.ok(profile.unlockedChassis.includes('needle'));
        assert.strictEqual(alerts.length, 0); // No alert expected
    });

    await t.test('buyItem trail successful purchase', () => {
        // 'sine' costs 300
        const initialShards = profile.shards;

        window.buyItem('trail', 'sine');

        assert.strictEqual(profile.shards, initialShards - 300);
        assert.ok(profile.unlockedTrails.includes('sine'));
        assert.strictEqual(alerts.length, 0); // No alert expected
    });

    await t.test('buyItem chassis insufficient shards', () => {
        // 'brute' costs 1200, we have 1000
        const initialShards = profile.shards;

        window.buyItem('chassis', 'brute');

        assert.strictEqual(profile.shards, initialShards);
        assert.ok(!profile.unlockedChassis.includes('brute'));
        assert.strictEqual(alerts.length, 1);
        assert.strictEqual(alerts[0], "NOT ENOUGH SHARDS");
    });
});

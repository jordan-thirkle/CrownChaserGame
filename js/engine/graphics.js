// js/engine/graphics.js
import { state } from '../core/state.js';

export let scene, camera, renderer, composer;
export let tetherVisual, speedLines;

// We export this so physics.js can build the O(1) spatial hash
export const colliders = []; 

let bloomPass, rgbShift;

export function init() {
    console.log("[SYS] Initializing Graphics Engine...");

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x00050a, 0.002);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x00050a);
    document.body.appendChild(renderer.domElement);

    // --- POST PROCESSING SETUP ---
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));

    bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.2;
    bloomPass.strength = 1.2;
    bloomPass.radius = 0.5;
    composer.addPass(bloomPass);

    rgbShift = new THREE.ShaderPass(THREE.RGBShiftShader);
    rgbShift.uniforms['amount'].value = 0.0015;
    composer.addPass(rgbShift);

    // Lighting
    const ambient = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(5, 10, 7);
    scene.add(sun);

    generateEnvironment();
    setupVFX();

    window.addEventListener('resize', onWindowResize);
}

function generateEnvironment() {
    const count = 1500; // Stress test count
    const arenaSize = 400;
    
    // AAA Visual Upgrade: Jagged Crystals with Additive Neon Wireframes
    const coreGeo = new THREE.IcosahedronGeometry(1, 0); 
    const wireGeo = new THREE.IcosahedronGeometry(1.05, 0);

    const coreMat = new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.9, roughness: 0.1 });
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.3 });

    const coreMesh = new THREE.InstancedMesh(coreGeo, coreMat, count);
    const wireMesh = new THREE.InstancedMesh(wireGeo, wireMat, count);

    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
        const pos = new THREE.Vector3(
            (Math.random() - 0.5) * arenaSize,
            (Math.random() - 0.5) * arenaSize,
            (Math.random() - 0.5) * arenaSize
        );
        
        // Ensure center is clear
        if (pos.length() < 40) pos.setLength(40 + Math.random() * 20);

        dummy.position.copy(pos);
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        const s = 2 + Math.random() * 8;
        dummy.scale.set(s * (0.5 + Math.random()), s * (0.5 + Math.random()), s * (0.5 + Math.random()));
        
        dummy.updateMatrix();
        coreMesh.setMatrixAt(i, dummy.matrix);
        wireMesh.setMatrixAt(i, dummy.matrix);

        // Register for Physics
        colliders.push({ center: pos.clone(), radius: s * 0.8 });
    }

    scene.add(coreMesh);
    scene.add(wireMesh);
}

function setupVFX() {
    // Tether Line
    const tGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    tetherVisual = new THREE.Line(tGeo, new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.5 }));
    tetherVisual.visible = false;
    scene.add(tetherVisual);

    // Speed Lines (Starfield effect)
    const sCount = 200;
    const sGeo = new THREE.BufferGeometry();
    const sPos = new Float32Array(sCount * 3);
    for(let i=0; i<sCount*3; i++) sPos[i] = (Math.random()-0.5) * 500;
    sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    speedLines = new THREE.Points(sGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0.2 }));
    scene.add(speedLines);
}

export function render(state) {
    if (!renderer) return;

    // 1. Sync Camera to State
    camera.position.set(state.player.pos.x, state.player.pos.y, state.player.pos.z);
    camera.rotation.set(state.input.pitch, state.input.yaw, 0, 'YXZ');

    // 2. Update VFX
    if (state.tether.active) {
        tetherVisual.visible = true;
        const p1 = new THREE.Vector3(state.player.pos.x, state.player.pos.y, state.player.pos.z);
        const p2 = new THREE.Vector3(state.tether.point.x, state.tether.point.y, state.tether.point.z);
        tetherVisual.geometry.setFromPoints([p1, p2]);
    } else {
        tetherVisual.visible = false;
    }

    // 3. Dynamic Post-Processing (Speed-based RGB Shift)
    const vel = new THREE.Vector3(state.player.vel.x, state.player.vel.y, state.player.vel.z);
    const speed = vel.length();
    rgbShift.uniforms['amount'].value = 0.001 + (speed * 0.0001);
    bloomPass.strength = 1.0 + (state.combo.multiplier * 0.2);

    // 4. Render with Composer
    composer.render();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

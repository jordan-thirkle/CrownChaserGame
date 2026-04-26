// js/engine/graphics.js
import { state } from '../core/state.js';

export let scene, camera, renderer;
export let tetherVisual, speedLines;

// We export this so physics.js can build the O(1) spatial hash
export const colliders = []; 

export function init() {
    console.log("[SYS] Initializing WebGL Graphics Engine...");

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020205, 0.004);
    
    camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0x222244));
    const light = new THREE.DirectionalLight(0x00f0ff, 1.5); 
    light.position.set(100, 200, 50); 
    scene.add(light);

    generateEnvironment();
    setupVFX();

    window.addEventListener('resize', onWindowResize);
}

function generateEnvironment() {
    const count = 600; 
    const arenaSize = 400;
    
    // AAA Visual Upgrade: Jagged Crystals with Additive Neon Wireframes
    const coreGeo = new THREE.IcosahedronGeometry(6, 0); 
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x0a0a15, roughness: 0.7, metalness: 0.5 });
    const instCore = new THREE.InstancedMesh(coreGeo, coreMat, count); 
    
    const wireGeo = new THREE.IcosahedronGeometry(6.2, 0); 
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending });
    const instWire = new THREE.InstancedMesh(wireGeo, wireMat, count);

    const dummy = new THREE.Object3D();
    
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * arenaSize * 2;
        const y = (Math.random() - 0.5) * arenaSize * 2;
        const z = (Math.random() - 0.5) * arenaSize * 2;
        
        if (Math.abs(x) < 50 && Math.abs(y) < 50 && Math.abs(z) < 50) continue; 
        
        dummy.position.set(x, y, z); 
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0); 
        
        const scaleX = 1 + Math.random() * 2;
        const scaleY = 1 + Math.random() * 3;
        const scaleZ = 1 + Math.random() * 2;
        dummy.scale.set(scaleX, scaleY, scaleZ); 
        dummy.updateMatrix();
        
        instCore.setMatrixAt(i, dummy.matrix);
        instWire.setMatrixAt(i, dummy.matrix);

        // Register logical colliders for physics.js
        const maxScale = Math.max(scaleX, scaleY, scaleZ);
        colliders.push({ center: new THREE.Vector3(x,y,z), radius: 6 * maxScale, grazed: false });
    }
    
    scene.add(instCore);
    scene.add(instWire);
}

function setupVFX() {
    // Tether Line
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    tetherVisual = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9, linewidth: 3, blending: THREE.AdditiveBlending, color: 0xff007f }));
    tetherVisual.visible = false;
    scene.add(tetherVisual);

    // Speed Lines
    const speedGeo = new THREE.BufferGeometry(); 
    const speedPos = new Float32Array(500 * 3);
    for(let i=0; i<500; i++) { 
        speedPos[i*3] = (Math.random() - 0.5) * 60; 
        speedPos[i*3+1] = (Math.random() - 0.5) * 60; 
        speedPos[i*3+2] = -20 - (Math.random() * 80); 
    }
    speedGeo.setAttribute('position', new THREE.BufferAttribute(speedPos, 3));
    speedLines = new THREE.Points(speedGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true, opacity: 0, blending: THREE.AdditiveBlending }));
    camera.add(speedLines); 
    scene.add(camera);
}

function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

export function render(state) {
    if (!scene || !camera) return;

    // Sync Camera to Player State
    camera.position.set(state.player.pos.x, state.player.pos.y, state.player.pos.z);
    
    // Apply decoupled rotation
    const euler = new THREE.Euler(state.input.pitch, state.input.yaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);

    // Update VFX based on Velocity
    const speed = new THREE.Vector3(state.player.vel.x, state.player.vel.y, state.player.vel.z).length();
    const currentMax = 100 + (state.combo.multiplier * 15);
    const speedNorm = Math.min(speed / currentMax, 1);
    
    camera.fov = 85 + (speedNorm * 35);
    camera.updateProjectionMatrix();
    
    if (speedLines) { 
        speedLines.material.opacity = speedNorm * 0.9; 
        speedLines.scale.z = 1 + (speedNorm * 8); 
    }

    // Render Tether
    if (state.tether.active && tetherVisual) {
        tetherVisual.visible = true;
        const positions = tetherVisual.geometry.attributes.position.array;
        
        // Start point (slightly below camera)
        const start = camera.position.clone().add(new THREE.Vector3(0, -0.5, 0).applyQuaternion(camera.quaternion));
        positions[0] = start.x; positions[1] = start.y; positions[2] = start.z;
        
        // End point
        positions[3] = state.tether.point.x; positions[4] = state.tether.point.y; positions[5] = state.tether.point.z;
        tetherVisual.geometry.attributes.position.needsUpdate = true;
    } else if (tetherVisual) {
        tetherVisual.visible = false;
    }

    renderer.render(scene, camera);
}

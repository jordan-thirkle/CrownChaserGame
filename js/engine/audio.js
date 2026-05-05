// js/engine/audio.js
import { camera } from './graphics.js';

// --- ZzFX MICRO SYNTHESIZER ---
// ZzFX - Zuper Zmall Zound Zynth - Micro Edition
// MIT License - Copyright 2019 Frank Force
export let zzfx, zzfxV, zzfxX;

zzfxV = 0.3; // volume
zzfx = (...t) => zzfxP(zzfxG(...t));

let zzfxP = (...t) => {
    let e = zzfxX.createBufferSource(), f = zzfxX.createBuffer(t.length, t[0].length, zzfxR);
    t.map((d, i) => f.getChannelData(i).set(d));
    e.buffer = f;

    // Default master gain (non-spatial)
    let masterGain = zzfxX.createGain();
    masterGain.gain.value = zzfxV;
    masterGain.connect(zzfxX.destination);

    e.connect(masterGain);
    e.start();
    return e;
};

let zzfxG = (q=1,k=.05,c=220,e=0,t=0,m=.1,r=0,F=1,v=0,z=0,w=0,A=0,l=0,B=0,x=0,A2=0,d=0,y=1,m2=0,C=0) => {
    let b=2*Math.PI,p=v*=500*b/zzfxR/zzfxR,C2=c*=(1-k+2*k*Math.random(k=[]))*b/zzfxR,
    g=0,H=0,a=0,n=1,I=0,J=0,f=0,x2=1,N,O;
    e=99+zzfxR*e;m*=zzfxR;r*=zzfxR;m2*=zzfxR;d*=zzfxR;z*=500*b/zzfxR**3;x*=b/zzfxR;w*=b/zzfxR;A*=zzfxR;l=zzfxR*l|0;
    for(h=e+m+r+m2+d|0;a<h;k[a++]=f)
    ++J%(100*F|0)||(f=q?1<q?2<q?3<q?Math.sin((g%b)**3):Math.max(Math.min(Math.tan(g),1),-1):1-(2*g/b%2+2)%2:1-4*Math.abs(Math.round(g/b)-g/b):Math.sin(g),f=(l?1-B+B*Math.sin(2*Math.PI*a/l):1)*(0<f?1:-1)*Math.abs(f)**y*p*(a<e?a/e:a<e+m?1-(a-e)/m*(1-w):a<e+m+r?w:a<h-d?(h-a-d)/m2*w:0),f=d?f/2+(d>a?0:(a<h-d?1:(h-a)/d)*k[a-d|0]/2):f),
    x2=(c+=v+=z)*Math.cos(A*H++),g+=x2-x2*A2*(1-1E9*(Math.sin(a)+1)%2),n&&++n>C&&(c+=x,C2+=x,n=0),!l||++I%l||(c=C2,v=p,n=n||1);
    return k;
};

let zzfxR = 44100;
let h;

// --- SPATIAL AUDIO EXTENSION ---
let isInitialized = false;

// We defer initialization until the first user interaction
export function init() {
    if (isInitialized) return;

    const interactInit = () => {
        if (!isInitialized) {
            try {
                zzfxX = new (window.AudioContext || window.webkitAudioContext)();
                isInitialized = true;
                console.log("[SYS] AudioContext initialized.");

                // Remove listeners once initialized
                ['click', 'keydown', 'mousedown'].forEach(evt => {
                    document.removeElementListener?.(evt, interactInit);
                    document.removeEventListener(evt, interactInit);
                });
            } catch (e) {
                console.warn("[SYS] AudioContext failed to initialize:", e);
            }
        }
    };

    ['click', 'keydown', 'mousedown'].forEach(evt => {
        document.addEventListener(evt, interactInit, { once: true });
    });
}

// Plays a sound spatially if position is provided
export function play3D(zzfxParams, sourcePos) {
    if (!isInitialized || !zzfxX || zzfxX.state !== 'running') return;

    try {
        const audioBufferData = zzfxG(...zzfxParams);

        let e = zzfxX.createBufferSource();
        let f = zzfxX.createBuffer(1, audioBufferData.length, zzfxR);
        f.getChannelData(0).set(audioBufferData);
        e.buffer = f;

        let masterGain = zzfxX.createGain();
        masterGain.gain.value = zzfxV;
        masterGain.connect(zzfxX.destination);

        if (sourcePos && camera) {
            const panner = zzfxX.createPanner();
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'exponential';
            panner.refDistance = 10;
            panner.maxDistance = 300;
            panner.rolloffFactor = 1.5;

            // ZzfxX listener is typically static at (0,0,0) in our simplified setup,
            // so we calculate relative position to the camera manually.
            let relPos = {
                x: sourcePos.x - camera.position.x,
                y: sourcePos.y - camera.position.y,
                z: sourcePos.z - camera.position.z
            };

            panner.positionX.value = relPos.x;
            panner.positionY.value = relPos.y;
            panner.positionZ.value = relPos.z;

            e.connect(panner);
            panner.connect(masterGain);
        } else {
            e.connect(masterGain);
        }

        e.start();
    } catch(err) {
        // Fallback or silent failure if context is interrupted
        console.warn("Audio error:", err);
    }
}

// Basic non-spatial playback
export function play(zzfxParams) {
    if (!isInitialized || !zzfxX || zzfxX.state !== 'running') return;
    try { zzfx(...zzfxParams); } catch(e){}
}

// --- SOUND PRESETS ---
export const sfx = {
    tetherAttach: [1.2,,300,.01,.01,.1,1,1.5,14,-2,-10,.05,,,,,,.5],
    tetherRelease: [1.1,,150,.01,.03,.1,1,.5,-12,1,10,.05,,,,,,.5],
    perfectRelease: [1.5,,800,.01,.1,.3,1,.5,10,,,,,1,,,.1,.5],
    hitObstacle: [2,,100,.01,.05,.2,4,2.5,,,,,,,,.5],
    graze: [1,,400,,.01,.05,1,1.5,,,,,,,,,,.5],
    uiHover: [0.3,,900,.01,.01,.01,1,1.5],
    uiClick: [0.6,,600,.01,.02,.02,1,1],
    stealCrown: [1.5,,1000,.05,.2,.5,1,2,10,2,50,.1,,,,,.5,.5]
};

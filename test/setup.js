// Mock browser APIs
global.window = {
    addEventListener: () => {},
    document: {
        addEventListener: () => {},
        pointerLockElement: null,
        body: {}
    }
};
global.document = global.window.document;
global.requestAnimationFrame = () => {};

// Mock localStorage for state.js to not throw
global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

// Initial mock for performance.now
let currentTime = 0;
global.performance = { now: () => currentTime };
export function setCurrentTime(t) {
    currentTime = t;
}

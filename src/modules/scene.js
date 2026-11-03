/**
 * WonderSnap - Three.js Scene Setup & Rendering Loop
 */
import * as THREE from 'three';

export class SceneManager {
  constructor(containerElement) {
    this.container = containerElement;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x05060f, 0.0008);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 3000);
    this.camera.position.set(0, 0, 450);
    this.baseZ = 450;
    this.targetZ = 450;

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x05060f, 1.0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.container.appendChild(this.renderer.domElement);

    // Performance monitoring
    this.fps = 60;
    this.framesCount = 0;
    this.lastFpsUpdate = performance.now();

    // Render loop callbacks
    this.updateCallbacks = [];
    this.isRendering = false;
    this.rafId = null;

    // Bind resize
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
  }

  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  addUpdateCallback(cb) {
    this.updateCallbacks.push(cb);
  }

  setCameraZoom(factor) {
    // Zoom factor: factor > 1 zooms in (lower Z), factor < 1 zooms out (higher Z)
    this.targetZ = this.baseZ / Math.max(0.2, Math.min(3.0, factor));
  }

  resetCamera() {
    this.targetZ = this.baseZ;
    this.camera.position.set(0, 0, this.baseZ);
    this.camera.lookAt(0, 0, 0);
  }

  start() {
    if (this.isRendering) return;
    this.isRendering = true;

    let lastTime = performance.now();

    const loop = (time) => {
      if (!this.isRendering) return;

      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Smooth camera zoom
      this.camera.position.z += (this.targetZ - this.camera.position.z) * 0.08;

      // FPS Calculation
      this.framesCount++;
      if (time - this.lastFpsUpdate >= 500) {
        this.fps = Math.round((this.framesCount * 1000) / (time - this.lastFpsUpdate));
        this.framesCount = 0;
        this.lastFpsUpdate = time;
      }

      // Execute custom callbacks
      for (let i = 0; i < this.updateCallbacks.length; i++) {
        this.updateCallbacks[i](delta, time);
      }

      this.renderer.render(this.scene, this.camera);
      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.isRendering = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    if (this.renderer && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }
  }
}

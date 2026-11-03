/**
 * WonderSnap - Main Application Orchestrator
 */
import { SceneManager } from './modules/scene.js';
import { ParticleSystem, VISUAL_MODES } from './modules/particleSystem.js';
import { WebcamManager } from './modules/webcam.js';
import { HandTracker } from './modules/handTracker.js';
import { GestureRecognizer, GESTURES } from './modules/gestureRecognizer.js';
import { SoundEngine } from './modules/audio.js';
import { UIManager } from './modules/ui.js';

class WonderSnapApp {
  constructor() {
    this.videoElement = document.getElementById('webcam-video');
    this.canvasOverlay = document.getElementById('tracking-canvas');
    this.canvasContainer = document.getElementById('canvas-container');

    // Modules
    this.ui = new UIManager();
    this.sound = new SoundEngine();
    this.scene = new SceneManager(this.canvasContainer);
    this.particles = new ParticleSystem(this.scene.scene);
    this.webcam = new WebcamManager(this.videoElement);
    this.tracker = new HandTracker(this.videoElement, this.canvasOverlay);
    this.gesture = new GestureRecognizer();

    this.isCameraRunning = false;
    this.isExperienceActive = false;

    this.init();
  }

  init() {
    // 1. Hook Three.js update loop
    this.scene.addUpdateCallback((delta, time) => {
      this.particles.update(delta, time);
      this.ui.updateFps(this.scene.fps);
    });

    // Start background 3D render loop immediately (visible on landing & experience)
    this.scene.start();

    // 2. Wire UI events
    this.setupUIEvents();

    // 3. Fallback Mouse/Touch control when hands are not present or camera is off
    this.setupPointerFallback();
  }

  setupUIEvents() {
    // Start Experience from landing page
    this.ui.on('startExperience', async () => {
      this.isExperienceActive = true;
      this.ui.showExperience();
      this.sound.init(); // Initialize audio context on user gesture
      await this.startTrackingExperience();
    });

    // Exit Experience back to landing page
    this.ui.on('stopExperience', () => {
      this.isExperienceActive = false;
      this.stopTrackingExperience();
      this.ui.showLanding();
    });

    // Camera toggle button in HUD
    this.ui.on('toggleCamera', async () => {
      if (this.isCameraRunning) {
        this.stopTrackingExperience();
      } else {
        await this.startTrackingExperience();
      }
    });

    // Camera flip button
    this.ui.on('flipCamera', () => {
      const isMirrored = this.webcam.toggleMirror();
      this.tracker.setMirrored(isMirrored);
    });

    // Visual Mode Change
    this.ui.on('modeChange', (mode) => {
      this.particles.setMode(mode);
      this.sound.playModeChange();
    });

    // Palette Change
    this.ui.on('paletteChange', (paletteKey) => {
      this.particles.setPalette(paletteKey);
    });

    // Particle Intensity Slider
    this.ui.on('intensityChange', (val) => {
      this.particles.setIntensity(val);
    });

    // Particle Size Slider
    this.ui.on('sizeChange', (val) => {
      this.particles.setSize(val);
    });

    // Audio Toggle
    this.ui.on('toggleAudio', () => {
      const isEnabled = this.sound.toggle();
      this.ui.setAudioState(isEnabled);
    });

    // Reset Experience
    this.ui.on('resetExperience', () => {
      this.particles.reset();
      this.gesture.reset();
      this.scene.resetCamera();
      if (this.ui.sliderIntensity) this.ui.sliderIntensity.value = 1.0;
      if (this.ui.valIntensity) this.ui.valIntensity.textContent = '1.0x';
      if (this.ui.sliderSize) this.ui.sliderSize.value = 4.0;
      if (this.ui.valSize) this.ui.valSize.textContent = '4.0px';
      this.ui.setActiveMode(this.particles.currentMode);
    });
  }

  async startTrackingExperience() {
    try {
      this.ui.setCameraStatus('init', 'INITIALIZING...');

      // 1. Start Webcam
      await this.webcam.start({ width: 640, height: 480 });

      // Match canvas overlay resolution to video dimensions
      if (this.canvasOverlay && this.videoElement) {
        this.canvasOverlay.width = this.videoElement.videoWidth || 640;
        this.canvasOverlay.height = this.videoElement.videoHeight || 480;
      }

      // 2. Initialize MediaPipe
      this.ui.setCameraStatus('init', 'LOADING AI...');
      await this.tracker.init();

      // 3. Start Processing Loop
      this.tracker.start((results) => {
        this.onTrackingResults(results);
      });

      this.isCameraRunning = true;
      this.ui.setCameraStatus('active', 'CAMERA ACTIVE');
    } catch (err) {
      console.error('Camera/MediaPipe initialization failed:', err);
      this.isCameraRunning = false;
      this.ui.setCameraStatus('error', 'CAMERA ERROR');
      this.ui.showToast(err.message || 'Unable to access camera. Please check permissions.', 'error');
    }
  }

  stopTrackingExperience() {
    this.isCameraRunning = false;
    this.tracker.stop();
    this.webcam.stop();
    this.gesture.reset();
    this.ui.setCameraStatus('off', 'CAMERA OFF');
    this.ui.updateGestureHUD({
      gesture: GESTURES.NONE,
      gestureName: 'Camera Off (Pointer Active)',
      handCount: 0
    });
  }

  onTrackingResults(results) {
    if (!this.isExperienceActive) return;

    // 1. Recognize Gesture
    const gestureState = this.gesture.recognize(results);

    // 2. Update HUD
    this.ui.updateGestureHUD(gestureState);

    // 3. Handle Two-Finger Mode Switching Trigger
    if (gestureState.triggerModeSwitch) {
      const nextMode = this.particles.cycleMode();
      this.ui.setActiveMode(nextMode);
      this.sound.playModeChange();
    }

    // 4. Audio reactions
    if (gestureState.gesture === GESTURES.OPEN_PALM) {
      this.sound.playBurst();
    } else if (gestureState.gesture === GESTURES.CLOSED_FIST) {
      this.sound.playContraction();
    } else if (gestureState.gesture === GESTURES.PINCH) {
      this.sound.updatePinchAudio(gestureState.pinchDistance);
    }

    // 5. Apply interactions to 3D Particle System
    this.particles.applyGesture(gestureState);

    // 6. Camera Zoom control via pinch or dual hands
    if (gestureState.isPinching) {
      this.scene.setCameraZoom(gestureState.pinchFactor);
    } else if (gestureState.handCount >= 2) {
      this.scene.setCameraZoom(gestureState.twoHandScale);
    } else {
      this.scene.setCameraZoom(1.0);
    }
  }

  setupPointerFallback() {
    // Allows mouse/touch drag to rotate 3D view when hands are not in front of camera
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const onPointerDown = (e) => {
      // Ignore if interacting with UI controls
      if (e.target.closest('.hud-panel, .nav-bar, .modal-backdrop, .btn, input, select')) return;
      isDragging = true;
      prevX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      prevY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    };

    const onPointerMove = (e) => {
      if (!isDragging || this.gesture.currentGesture !== GESTURES.NONE) return;
      const curX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const curY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

      const dx = curX - prevX;
      const dy = curY - prevY;
      prevX = curX;
      prevY = curY;

      this.particles.group.rotation.y += dx * 0.005;
      this.particles.group.rotation.x += dy * 0.005;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    window.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);
  }
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.wonderSnap = new WonderSnapApp();
});

/**
 * WonderSnap - UI & HUD Manager
 * Coordinates DOM controls, responsive events, gesture HUD, notifications, and fullscreen.
 */
import { VISUAL_MODES } from './particleSystem.js';

export class UIManager {
  constructor() {
    // DOM Elements Cache
    this.landingScreen = document.getElementById('landing-screen');
    this.experienceScreen = document.getElementById('experience-screen');
    this.btnStartExperience = document.getElementById('btn-start-experience');
    this.btnExitExperience = document.getElementById('btn-exit-experience');

    // Camera Controls
    this.btnToggleCamera = document.getElementById('btn-toggle-camera');
    this.cameraStatusBadge = document.getElementById('camera-status-badge');
    this.cameraContainer = document.getElementById('camera-container');
    this.btnFlipCamera = document.getElementById('btn-flip-camera');

    // Gesture HUD
    this.gestureName = document.getElementById('gesture-name');
    this.gestureIcon = document.getElementById('gesture-icon');
    this.gestureConfidence = document.getElementById('gesture-confidence');
    this.handsCountBadge = document.getElementById('hands-count-badge');
    this.interactionHint = document.getElementById('interaction-hint');

    // Sliders & Controls
    this.sliderIntensity = document.getElementById('slider-intensity');
    this.valIntensity = document.getElementById('val-intensity');
    this.sliderSize = document.getElementById('slider-size');
    this.valSize = document.getElementById('val-size');
    this.btnReset = document.getElementById('btn-reset');
    this.btnFullscreen = document.getElementById('btn-fullscreen');
    this.btnAudioToggle = document.getElementById('btn-audio-toggle');
    this.fpsCounter = document.getElementById('fps-counter');

    // Mode Selector Buttons
    this.modeButtons = document.querySelectorAll('.mode-btn');
    this.paletteSelect = document.getElementById('palette-select');

    // Gesture Guide Modal
    this.btnOpenGuide = document.getElementById('btn-open-guide');
    this.btnCloseGuide = document.getElementById('btn-close-guide');
    this.modalGuide = document.getElementById('modal-guide');

    // Notification Toast
    this.toast = document.getElementById('toast');
    this.toastMessage = document.getElementById('toast-message');
    this.toastClose = document.getElementById('toast-close');

    this.callbacks = {};
    this.bindEvents();
  }

  on(event, handler) {
    this.callbacks[event] = handler;
  }

  emit(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event](data);
    }
  }

  bindEvents() {
    // 1. Landing -> Experience
    if (this.btnStartExperience) {
      this.btnStartExperience.addEventListener('click', () => {
        this.emit('startExperience');
      });
    }

    // 2. Experience -> Landing
    if (this.btnExitExperience) {
      this.btnExitExperience.addEventListener('click', () => {
        this.emit('stopExperience');
      });
    }

    // 3. Camera Toggle
    if (this.btnToggleCamera) {
      this.btnToggleCamera.addEventListener('click', () => {
        this.emit('toggleCamera');
      });
    }

    if (this.btnFlipCamera) {
      this.btnFlipCamera.addEventListener('click', () => {
        this.emit('flipCamera');
      });
    }

    // 4. Sliders
    if (this.sliderIntensity) {
      this.sliderIntensity.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (this.valIntensity) this.valIntensity.textContent = `${val.toFixed(1)}x`;
        this.emit('intensityChange', val);
      });
    }

    if (this.sliderSize) {
      this.sliderSize.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (this.valSize) this.valSize.textContent = `${val.toFixed(1)}px`;
        this.emit('sizeChange', val);
      });
    }

    // 5. Visual Mode Buttons
    this.modeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        this.setActiveMode(mode);
        this.emit('modeChange', mode);
      });
    });

    // 6. Palette Selection
    if (this.paletteSelect) {
      this.paletteSelect.addEventListener('change', (e) => {
        this.emit('paletteChange', e.target.value);
      });
    }

    // 7. Reset Button
    if (this.btnReset) {
      this.btnReset.addEventListener('click', () => {
        this.emit('resetExperience');
      });
    }

    // 8. Fullscreen Toggle
    if (this.btnFullscreen) {
      this.btnFullscreen.addEventListener('click', () => {
        this.toggleFullscreen();
      });
    }

    // 9. Audio Toggle
    if (this.btnAudioToggle) {
      this.btnAudioToggle.addEventListener('click', () => {
        this.emit('toggleAudio');
      });
    }

    // 10. Guide Modal
    if (this.btnOpenGuide && this.modalGuide) {
      this.btnOpenGuide.addEventListener('click', () => {
        this.modalGuide.classList.add('visible');
      });
    }

    if (this.btnCloseGuide && this.modalGuide) {
      this.btnCloseGuide.addEventListener('click', () => {
        this.modalGuide.classList.remove('visible');
      });
    }

    if (this.modalGuide) {
      this.modalGuide.addEventListener('click', (e) => {
        if (e.target === this.modalGuide) {
          this.modalGuide.classList.remove('visible');
        }
      });
    }

    // 11. Toast Close
    if (this.toastClose) {
      this.toastClose.addEventListener('click', () => {
        this.hideToast();
      });
    }
  }

  showExperience() {
    if (this.landingScreen) this.landingScreen.classList.add('hidden');
    if (this.experienceScreen) this.experienceScreen.classList.remove('hidden');
  }

  showLanding() {
    if (this.landingScreen) this.landingScreen.classList.remove('hidden');
    if (this.experienceScreen) this.experienceScreen.classList.add('hidden');
  }

  setCameraStatus(status, text) {
    if (!this.cameraStatusBadge) return;
    this.cameraStatusBadge.className = `status-badge status-${status}`;
    this.cameraStatusBadge.textContent = text || status.toUpperCase();

    if (this.btnToggleCamera) {
      if (status === 'active') {
        this.btnToggleCamera.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="20" height="20" rx="4"/>
          </svg> Stop Camera`;
        this.btnToggleCamera.classList.add('active');
      } else {
        this.btnToggleCamera.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 7l-7 5 7 5V7z"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg> Start Camera`;
        this.btnToggleCamera.classList.remove('active');
      }
    }
  }

  updateGestureHUD(gestureState) {
    if (!this.gestureName) return;

    this.gestureName.textContent = gestureState.gestureName || 'No Hand Detected';

    // Update gesture icon & interaction hints
    let iconSvg = '';
    let hintText = 'Move your hand across camera to rotate & tilt 3D space';

    switch (gestureState.gesture) {
      case 'OPEN_PALM':
        iconSvg = `
          <svg viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2">
            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
            <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6"/>
            <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
            <path d="M18 8a2 2 0 0 1 2 2v4a8 8 0 0 1-8 8 8 8 0 0 1-8-8v-2a2 2 0 0 1 2-2 2 2 0 0 1 2 2"/>
          </svg>`;
        hintText = 'Expanding particle field outward';
        break;

      case 'CLOSED_FIST':
        iconSvg = `
          <svg viewBox="0 0 24 24" fill="none" stroke="#ff007f" stroke-width="2">
            <circle cx="12" cy="12" r="8"/>
            <path d="M12 8v8M8 12h8"/>
          </svg>`;
        hintText = 'Attracting particles towards center core';
        break;

      case 'PINCH':
        iconSvg = `
          <svg viewBox="0 0 24 24" fill="none" stroke="#00ff88" stroke-width="2">
            <circle cx="8" cy="12" r="3"/>
            <circle cx="16" cy="12" r="3"/>
            <line x1="11" y1="12" x2="13" y2="12" stroke-dasharray="2 2"/>
          </svg>`;
        hintText = `Pinch to zoom / scale particle size (${gestureState.pinchFactor ? gestureState.pinchFactor.toFixed(2) : '1.00'}x)`;
        break;

      case 'TWO_FINGERS':
        iconSvg = `
          <svg viewBox="0 0 24 24" fill="none" stroke="#ffd700" stroke-width="2">
            <path d="M10 4v8M14 2v10M10 12a4 4 0 0 0 8 0v-2"/>
            <rect x="6" y="12" width="12" height="10" rx="3"/>
          </svg>`;
        hintText = 'Two-Finger Gesture: Visual Mode Shifting';
        break;

      case 'BOTH_HANDS':
        iconSvg = `
          <svg viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2">
            <path d="M5 9l-3 3 3 3M19 9l3 3-3 3M2 12h20"/>
          </svg>`;
        hintText = `Dual Hands detected: Distance warp scale (${gestureState.twoHandScale ? gestureState.twoHandScale.toFixed(2) : '1.00'}x)`;
        break;

      default:
        iconSvg = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>`;
        hintText = gestureState.handCount > 0 ? 'Hand tracked. Try Open Palm, Fist, Pinch, or 2 Fingers!' : 'Bring hands in front of the camera';
        break;
    }

    if (this.gestureIcon && iconSvg) {
      this.gestureIcon.innerHTML = iconSvg;
    }

    if (this.interactionHint) {
      this.interactionHint.textContent = hintText;
    }

    if (this.handsCountBadge) {
      this.handsCountBadge.textContent = gestureState.handCount === 1 ? '1 Hand' : gestureState.handCount > 1 ? `${gestureState.handCount} Hands` : 'No Hands';
      this.handsCountBadge.className = `hands-badge count-${gestureState.handCount}`;
    }
  }

  setActiveMode(mode) {
    this.modeButtons.forEach((btn) => {
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  updateFps(fps) {
    if (this.fpsCounter) {
      this.fpsCounter.textContent = `${fps} FPS`;
    }
  }

  setAudioState(enabled) {
    if (this.btnAudioToggle) {
      this.btnAudioToggle.innerHTML = enabled
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
             <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
           </svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
             <line x1="23" y1="9" x2="17" y2="15"/>
             <line x1="17" y1="9" x2="23" y2="15"/>
           </svg>`;
      this.btnAudioToggle.classList.toggle('active', enabled);
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  showToast(message, type = 'error') {
    if (!this.toast || !this.toastMessage) return;
    this.toastMessage.textContent = message;
    this.toast.className = `toast toast-${type} visible`;

    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.hideToast();
    }, 7000);
  }

  hideToast() {
    if (this.toast) {
      this.toast.classList.remove('visible');
    }
  }
}

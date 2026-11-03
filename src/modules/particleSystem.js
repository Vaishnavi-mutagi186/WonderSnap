/**
 * WonderSnap - 3D Interactive Particle Visual Effects System
 * Implements Galaxy, Fireworks, Wave, Heart, and Spiral modes with smooth morphing and physics.
 */
import * as THREE from 'three';

export const VISUAL_MODES = {
  GALAXY: 'galaxy',
  FIREWORKS: 'fireworks',
  WAVE: 'wave',
  HEART: 'heart',
  SPIRAL: 'spiral'
};

export const COLOR_PALETTES = {
  CYAN_MAGENTA: {
    name: 'Cyberpunk Neon',
    primary: new THREE.Color('#00f0ff'),
    secondary: new THREE.Color('#ff007f'),
    accent: new THREE.Color('#7928ca')
  },
  SOLAR_FIRE: {
    name: 'Solar Flare',
    primary: new THREE.Color('#ffaa00'),
    secondary: new THREE.Color('#ff2200'),
    accent: new THREE.Color('#ffff55')
  },
  COSMIC_VIOLET: {
    name: 'Cosmic Nebula',
    primary: new THREE.Color('#a855f7'),
    secondary: new THREE.Color('#3b82f6'),
    accent: new THREE.Color('#ec4899')
  },
  EMERALD_MATRIX: {
    name: 'Emerald Matrix',
    primary: new THREE.Color('#00ff88'),
    secondary: new THREE.Color('#00b4d8'),
    accent: new THREE.Color('#90e0ef')
  },
  CELESTIAL_GOLD: {
    name: 'Celestial Gold',
    primary: new THREE.Color('#ffd700'),
    secondary: new THREE.Color('#ffffff'),
    accent: new THREE.Color('#ff7b00')
  }
};

export class ParticleSystem {
  constructor(scene, count = 22000) {
    this.scene = scene;
    this.particleCount = count;
    this.currentMode = VISUAL_MODES.GALAXY;
    this.currentPaletteKey = 'CYAN_MAGENTA';
    this.palette = COLOR_PALETTES[this.currentPaletteKey];

    // Interaction multipliers
    this.intensity = 1.0;
    this.baseParticleSize = 4.0;
    this.pinchSizeScale = 1.0;
    this.twoHandScale = 1.0;
    this.expansionForce = 1.0;
    this.contractionForce = 0.0;

    // Rotation targets (controlled by hand translation)
    this.targetRotationX = 0;
    this.targetRotationY = 0;
    this.autoRotate = true;

    // Geometry buffers
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.targetPositions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.originalColors = new Float32Array(this.particleCount * 3);

    // Dynamic firework burst simulation data
    this.fireworkBursts = [];
    this.lastFireworkTime = 0;

    this.init();
  }

  /**
   * Generates a circular radial glow texture without external images
   */
  createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.2, 'rgba(240, 248, 255, 0.85)');
    grad.addColorStop(0.5, 'rgba(100, 200, 255, 0.35)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  init() {
    this.glowTexture = this.createGlowTexture();

    // Material with additive blending for sci-fi neon brilliance
    this.material = new THREE.PointsMaterial({
      size: this.baseParticleSize,
      vertexColors: true,
      map: this.glowTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.9
    });

    // Generate initial formation (Galaxy)
    this.computeFormationPositions(this.currentMode, this.targetPositions);
    // Copy initial target into active positions
    for (let i = 0; i < this.particleCount * 3; i++) {
      this.positions[i] = this.targetPositions[i];
      this.velocities[i] = 0;
    }

    this.updateColors();

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    // Particle Group container for easy rotation and scaling
    this.group = new THREE.Group();
    this.points = new THREE.Points(this.geometry, this.material);
    this.group.add(this.points);
    this.scene.add(this.group);
  }

  updateColors() {
    const { primary, secondary, accent } = this.palette;
    const tempColor = new THREE.Color();

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const ratio = i / this.particleCount;

      if (ratio < 0.45) {
        tempColor.copy(primary).lerp(secondary, ratio / 0.45);
      } else if (ratio < 0.85) {
        tempColor.copy(secondary).lerp(accent, (ratio - 0.45) / 0.4);
      } else {
        tempColor.copy(accent).lerp(primary, (ratio - 0.85) / 0.15);
      }

      this.colors[i3] = tempColor.r;
      this.colors[i3 + 1] = tempColor.g;
      this.colors[i3 + 2] = tempColor.b;

      this.originalColors[i3] = tempColor.r;
      this.originalColors[i3 + 1] = tempColor.g;
      this.originalColors[i3 + 2] = tempColor.b;
    }

    if (this.geometry.attributes.color) {
      this.geometry.attributes.color.needsUpdate = true;
    }
  }

  setPalette(paletteKey) {
    if (COLOR_PALETTES[paletteKey]) {
      this.currentPaletteKey = paletteKey;
      this.palette = COLOR_PALETTES[paletteKey];
      this.updateColors();
    }
  }

  /**
   * Computes 3D coordinates for each formation
   */
  computeFormationPositions(mode, buffer) {
    const count = this.particleCount;

    switch (mode) {
      case VISUAL_MODES.GALAXY: {
        const arms = 4;
        const radius = 280;
        const spin = 3.2;

        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          const r = Math.pow(Math.random(), 2.2) * radius;
          const armAngle = ((i % arms) * 2 * Math.PI) / arms;
          const angle = armAngle + (r / radius) * spin;

          // Core vs outer arm randomness
          const spread = Math.pow(Math.random(), 3) * (r * 0.25 + 10);
          const spreadAngle = Math.random() * Math.PI * 2;
          const zSpread = (Math.random() - 0.5) * (45 * Math.exp(-r / 120) + 12);

          buffer[i3] = Math.cos(angle) * r + Math.cos(spreadAngle) * spread;
          buffer[i3 + 1] = zSpread;
          buffer[i3 + 2] = Math.sin(angle) * r + Math.sin(spreadAngle) * spread;
        }
        break;
      }

      case VISUAL_MODES.HEART: {
        // 3D Parametric Heart Formation
        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          const t = Math.random() * Math.PI * 2;
          const u = Math.random() * Math.PI;

          // 2D Cardioid formula scaled
          const scale = 11.0;
          let hx = 16 * Math.pow(Math.sin(t), 3);
          let hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
          let hz = (Math.random() - 0.5) * 18 * Math.sin(u) * Math.sin(t);

          // Volume filling
          const vol = Math.pow(Math.random(), 0.5);
          buffer[i3] = hx * scale * vol + (Math.random() - 0.5) * 8;
          buffer[i3 + 1] = hy * scale * vol + 20 + (Math.random() - 0.5) * 8;
          buffer[i3 + 2] = hz * scale * vol + (Math.random() - 0.5) * 8;
        }
        break;
      }

      case VISUAL_MODES.WAVE: {
        // 3D Wave terrain grid
        const cols = Math.floor(Math.sqrt(count * 1.5));
        const rows = Math.floor(count / cols);
        const spacing = 12;
        const offsetX = (cols * spacing) / 2;
        const offsetZ = (rows * spacing) / 2;

        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          const c = i % cols;
          const r = Math.floor(i / cols);

          const x = c * spacing - offsetX;
          const z = r * spacing - offsetZ;
          const dist = Math.hypot(x, z);
          const y = Math.sin(dist * 0.03) * 40;

          buffer[i3] = x;
          buffer[i3 + 1] = y;
          buffer[i3 + 2] = z;
        }
        break;
      }

      case VISUAL_MODES.SPIRAL: {
        // Double helix / 3D Vortex
        const height = 380;
        const maxRadius = 140;

        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          const norm = i / count;
          const strand = i % 2 === 0 ? 0 : Math.PI;
          const y = (norm - 0.5) * height;
          const angle = norm * Math.PI * 16 + strand;
          const r = Math.sin(norm * Math.PI) * maxRadius + 15;

          const jitter = (Math.random() - 0.5) * 18;
          buffer[i3] = Math.cos(angle) * r + jitter;
          buffer[i3 + 1] = y + jitter;
          buffer[i3 + 2] = Math.sin(angle) * r + jitter;
        }
        break;
      }

      case VISUAL_MODES.FIREWORKS: {
        // Multi-cluster explosive fireworks
        const clusters = 12;
        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          const clusterIdx = i % clusters;
          const clusterAngle = (clusterIdx * 2 * Math.PI) / clusters;
          const clusterDist = (clusterIdx % 3 + 1) * 65;

          const cx = Math.cos(clusterAngle) * clusterDist;
          const cy = ((clusterIdx % 4) - 1.5) * 45;
          const cz = Math.sin(clusterAngle) * clusterDist;

          // Sphere distribution around cluster center
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const r = Math.pow(Math.random(), 0.5) * 90;

          buffer[i3] = cx + r * Math.sin(phi) * Math.cos(theta);
          buffer[i3 + 1] = cy + r * Math.sin(phi) * Math.sin(theta);
          buffer[i3 + 2] = cz + r * Math.cos(phi);
        }
        break;
      }
    }
  }

  /**
   * Switch visual mode with smooth morphing transition
   */
  setMode(newMode) {
    if (this.currentMode === newMode) return;
    this.currentMode = newMode;
    this.computeFormationPositions(newMode, this.targetPositions);

    // If fireworks, randomize velocities
    if (newMode === VISUAL_MODES.FIREWORKS) {
      for (let i = 0; i < this.particleCount * 3; i += 3) {
        this.velocities[i] = (Math.random() - 0.5) * 2.5;
        this.velocities[i + 1] = Math.random() * 3.5;
        this.velocities[i + 2] = (Math.random() - 0.5) * 2.5;
      }
    }
  }

  cycleMode() {
    const modes = Object.values(VISUAL_MODES);
    const currentIdx = modes.indexOf(this.currentMode);
    const nextIdx = (currentIdx + 1) % modes.length;
    this.setMode(modes[nextIdx]);
    return modes[nextIdx];
  }

  setIntensity(val) {
    this.intensity = Math.max(0.2, Math.min(3.0, val));
  }

  setSize(size) {
    this.baseParticleSize = Math.max(1.0, Math.min(15.0, size));
    this.updateMaterialSize();
  }

  updateMaterialSize() {
    this.material.size = this.baseParticleSize * this.pinchSizeScale;
  }

  /**
   * Updates particle positions, morphing lerp, physics & gesture influences
   */
  update(delta, time) {
    const pos = this.positions;
    const target = this.targetPositions;
    const count = this.particleCount;
    const lerpSpeed = 0.05 * this.intensity;
    const isWave = this.currentMode === VISUAL_MODES.WAVE;
    const isHeart = this.currentMode === VISUAL_MODES.HEART;
    const isFireworks = this.currentMode === VISUAL_MODES.FIREWORKS;
    const isSpiral = this.currentMode === VISUAL_MODES.SPIRAL;

    // Heart pulsation (systole / diastole)
    let heartScale = 1.0;
    if (isHeart) {
      const beat = (time * 0.003) % (2 * Math.PI);
      heartScale = 1.0 + Math.pow(Math.sin(beat), 8) * 0.18 + Math.pow(Math.sin(beat + 0.3), 16) * 0.12;
    }

    // Dynamic wave ripple factor
    const waveTime = time * 0.002 * this.intensity;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      let tx = target[i3];
      let ty = target[i3 + 1];
      let tz = target[i3 + 2];

      // Dynamic animation per mode
      if (isHeart) {
        tx *= heartScale;
        ty *= heartScale;
        tz *= heartScale;
      } else if (isWave) {
        const dist = Math.hypot(tx, tz);
        ty = Math.sin(dist * 0.035 - waveTime) * 35 + Math.cos(tx * 0.02 + waveTime) * 15;
      } else if (isSpiral) {
        // Gentle undulating twist
        const yNorm = ty / 190;
        const angle = waveTime * 0.8 + yNorm * 2;
        const rx = tx * Math.cos(angle) - tz * Math.sin(angle);
        const rz = tx * Math.sin(angle) + tz * Math.cos(angle);
        tx = rx;
        tz = rz;
      } else if (isFireworks) {
        // Firework gravity and drift
        tx += this.velocities[i3] * this.intensity;
        ty += this.velocities[i3 + 1] * this.intensity;
        tz += this.velocities[i3 + 2] * this.intensity;
        this.velocities[i3 + 1] -= 0.04 * this.intensity; // Gravity

        // Loop fireworks around
        if (ty < -200) {
          ty = target[i3 + 1] + Math.random() * 40;
          this.velocities[i3 + 1] = Math.random() * 4.0;
        }
      }

      // Gesture 1: Open Palm expansion
      if (this.expansionForce > 1.05) {
        tx *= this.expansionForce;
        ty *= this.expansionForce;
        tz *= this.expansionForce;
      }

      // Gesture 2: Closed Fist contraction / black-hole attraction
      if (this.contractionForce > 0.05) {
        const factor = 1.0 - this.contractionForce * 0.75;
        tx *= factor;
        ty *= factor;
        tz *= factor;
      }

      // Gesture 6: Dual Hand distance scaling
      if (Math.abs(this.twoHandScale - 1.0) > 0.02) {
        tx *= this.twoHandScale;
        ty *= this.twoHandScale;
        tz *= this.twoHandScale;
      }

      // Smooth lerp to target
      pos[i3] += (tx - pos[i3]) * lerpSpeed;
      pos[i3 + 1] += (ty - pos[i3 + 1]) * lerpSpeed;
      pos[i3 + 2] += (tz - pos[i3 + 2]) * lerpSpeed;
    }

    this.geometry.attributes.position.needsUpdate = true;

    // Smoothly apply rotation from hand movement
    if (this.autoRotate) {
      this.group.rotation.y += 0.003 * this.intensity;
    }

    this.group.rotation.y += (this.targetRotationY - this.group.rotation.y) * 0.08;
    this.group.rotation.x += (this.targetRotationX - this.group.rotation.x) * 0.08;

    // Decay transient expansion/contraction back to neutral
    this.expansionForce += (1.0 - this.expansionForce) * 0.05;
    this.contractionForce += (0.0 - this.contractionForce) * 0.08;
  }

  /**
   * Apply real-time hand gestures
   */
  applyGesture(gestureState) {
    // 1. Hand movement translates to rotation/tilt
    if (gestureState.handCount > 0) {
      this.targetRotationY = gestureState.rotationY;
      this.targetRotationX = gestureState.rotationX;
    }

    // 2. Open Palm triggers particle burst & spread
    if (gestureState.particleSpread > 1.0) {
      this.expansionForce = gestureState.particleSpread;
    }

    // 3. Closed Fist attracts towards center
    if (gestureState.contraction > 0) {
      this.contractionForce = gestureState.contraction;
    }

    // 4. Pinch gesture scales particle size
    if (gestureState.isPinching) {
      this.pinchSizeScale = gestureState.pinchFactor;
      this.updateMaterialSize();
    } else {
      // Ease pinch size back to 1.0
      this.pinchSizeScale += (1.0 - this.pinchSizeScale) * 0.1;
      this.updateMaterialSize();
    }

    // 5. Dual hands scale
    if (gestureState.handCount >= 2) {
      this.twoHandScale = gestureState.twoHandScale;
    } else {
      this.twoHandScale += (1.0 - this.twoHandScale) * 0.05;
    }
  }

  reset() {
    this.intensity = 1.0;
    this.baseParticleSize = 4.0;
    this.pinchSizeScale = 1.0;
    this.twoHandScale = 1.0;
    this.expansionForce = 1.0;
    this.contractionForce = 0.0;
    this.targetRotationX = 0;
    this.targetRotationY = 0;
    this.group.rotation.set(0, 0, 0);
    this.updateMaterialSize();
    this.computeFormationPositions(this.currentMode, this.targetPositions);
  }
}

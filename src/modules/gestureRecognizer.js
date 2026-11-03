/**
 * WonderSnap - Gesture Recognizer Module
 * Robust geometric hand gesture recognition with scale normalization and hysteresis.
 */

export const GESTURES = {
  NONE: 'NONE',
  OPEN_PALM: 'OPEN_PALM',
  CLOSED_FIST: 'CLOSED_FIST',
  PINCH: 'PINCH',
  TWO_FINGERS: 'TWO_FINGERS',
  BOTH_HANDS: 'BOTH_HANDS'
};

export class GestureRecognizer {
  constructor() {
    this.currentGesture = GESTURES.NONE;
    this.gestureConfidence = 0;
    this.lastModeSwitchTime = 0;
    this.modeSwitchCooldown = 1200; // ms between two-finger gesture triggers

    // Smoothed continuous interaction values
    this.smoothedHandPosition = { x: 0.5, y: 0.5 };
    this.smoothedPinchDistance = 0.1;
    this.smoothedTwoHandDistance = 0.5;
    this.smoothingFactor = 0.25; // EMA alpha
  }

  /**
   * Calculate 3D Euclidean distance between two landmarks
   */
  dist(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = (p1.z || 0) - (p2.z || 0);
    return Math.hypot(dx, dy, dz);
  }

  /**
   * Analyzes landmarks of all detected hands
   * @param {Object} results MediaPipe results object
   * @returns {Object} Comprehensive gesture state and interaction parameters
   */
  recognize(results) {
    const multiLandmarks = results.multiHandLandmarks || [];
    const handCount = multiLandmarks.length;

    const state = {
      gesture: GESTURES.NONE,
      gestureName: 'No Hand Detected',
      handCount,
      // Continuous interaction parameters
      rotationX: 0,
      rotationY: 0,
      particleSpread: 1.0,
      contraction: 0.0,
      pinchFactor: 1.0,
      pinchDistance: 0.0,
      twoHandScale: 1.0,
      isPinching: false,
      triggerModeSwitch: false,
      handCenter: { x: 0.5, y: 0.5 }
    };

    if (handCount === 0) {
      this.currentGesture = GESTURES.NONE;
      return state;
    }

    // Process Primary Hand
    const hand1 = multiLandmarks[0];
    const handFeatures1 = this.analyzeHand(hand1);

    // Update smoothed position for 3D rotation & tilt
    // Center is (0.5, 0.5). Map to [-1, 1]
    const rawCenterX = handFeatures1.center.x;
    const rawCenterY = handFeatures1.center.y;

    this.smoothedHandPosition.x += (rawCenterX - this.smoothedHandPosition.x) * this.smoothingFactor;
    this.smoothedHandPosition.y += (rawCenterY - this.smoothedHandPosition.y) * this.smoothingFactor;

    state.handCenter = { ...this.smoothedHandPosition };
    // Movement rotation: X delta controls Y rotation (yaw), Y delta controls X rotation (pitch)
    // Note: because preview is mirrored, we invert X so moving right rotates right
    state.rotationY = (0.5 - this.smoothedHandPosition.x) * 3.5;
    state.rotationX = (this.smoothedHandPosition.y - 0.5) * 2.5;

    // Check Dual-Hand Gesture
    if (handCount >= 2) {
      const hand2 = multiLandmarks[1];
      const handFeatures2 = this.analyzeHand(hand2);

      const center1 = handFeatures1.center;
      const center2 = handFeatures2.center;
      const rawTwoHandDist = this.dist(center1, center2);

      this.smoothedTwoHandDistance += (rawTwoHandDist - this.smoothedTwoHandDistance) * this.smoothingFactor;

      // Base distance is ~0.4; distance variations scale the system
      const normalizedDualScale = Math.max(0.3, Math.min(2.8, this.smoothedTwoHandDistance / 0.4));
      state.twoHandScale = normalizedDualScale;

      // If both hands are active and moving relative to each other, prioritize dual-hand
      state.gesture = GESTURES.BOTH_HANDS;
      state.gestureName = `Dual Hands (Scale: ${normalizedDualScale.toFixed(2)}x)`;
      this.currentGesture = GESTURES.BOTH_HANDS;
      return state;
    }

    // Single Hand Gestures Detection
    const {
      isThumbExtended,
      isIndexExtended,
      isMiddleExtended,
      isRingExtended,
      isPinkyExtended,
      extendedCount,
      pinchDistanceNorm,
      isPinch
    } = handFeatures1;

    state.pinchDistance = pinchDistanceNorm;

    // 1. Pinch Gesture check (Thumb tip close to Index tip)
    if (isPinch) {
      state.gesture = GESTURES.PINCH;
      state.isPinching = true;

      this.smoothedPinchDistance += (pinchDistanceNorm - this.smoothedPinchDistance) * this.smoothingFactor;
      // Map normalized pinch distance (0.02 to 0.18) to zoom / size factor (0.3 to 2.5)
      const clampedPinch = Math.max(0.02, Math.min(0.20, this.smoothedPinchDistance));
      const pinchFactor = 0.3 + ((clampedPinch - 0.02) / 0.18) * 2.2;
      state.pinchFactor = pinchFactor;
      state.gestureName = `Pinch (Dist: ${pinchDistanceNorm.toFixed(2)})`;
      this.currentGesture = GESTURES.PINCH;
      return state;
    }

    // 2. Two-Finger Gesture (Index & Middle extended, Ring & Pinky curled)
    if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      state.gesture = GESTURES.TWO_FINGERS;
      state.gestureName = 'Two Fingers (Mode Shift)';

      const now = performance.now();
      if (now - this.lastModeSwitchTime > this.modeSwitchCooldown) {
        state.triggerModeSwitch = true;
        this.lastModeSwitchTime = now;
      }
      this.currentGesture = GESTURES.TWO_FINGERS;
      return state;
    }

    // 3. Open Palm (At least 4 or 5 extended fingers)
    if (extendedCount >= 4) {
      state.gesture = GESTURES.OPEN_PALM;
      state.gestureName = 'Open Palm (Expand)';
      state.particleSpread = 2.2; // Expand particles outward
      this.currentGesture = GESTURES.OPEN_PALM;
      return state;
    }

    // 4. Closed Fist (0 or 1 finger extended)
    if (extendedCount <= 1) {
      state.gesture = GESTURES.CLOSED_FIST;
      state.gestureName = 'Closed Fist (Attract)';
      state.contraction = 1.0; // Contract towards center
      this.currentGesture = GESTURES.CLOSED_FIST;
      return state;
    }

    // Default: tracking hand movement
    state.gesture = GESTURES.NONE;
    state.gestureName = 'Tracking Hand';
    this.currentGesture = GESTURES.NONE;
    return state;
  }

  /**
   * Deep analysis of single hand landmarks
   */
  analyzeHand(lm) {
    const wrist = lm[0];
    const thumbTip = lm[4];
    const indexMcp = lm[5];
    const indexPip = lm[6];
    const indexTip = lm[8];
    const middleMcp = lm[9];
    const middlePip = lm[10];
    const middleTip = lm[12];
    const ringMcp = lm[13];
    const ringPip = lm[14];
    const ringTip = lm[16];
    const pinkyMcp = lm[17];
    const pinkyPip = lm[18];
    const pinkyTip = lm[20];

    // Reference scale: distance between wrist and middle MCP
    const handScale = Math.max(0.01, this.dist(wrist, middleMcp));

    // Hand center: midpoint of wrist and middle MCP
    const center = {
      x: (wrist.x + middleMcp.x) * 0.5,
      y: (wrist.y + middleMcp.y) * 0.5,
      z: (wrist.z + middleMcp.z) * 0.5
    };

    // Finger extension checks based on distance to wrist relative to PIP
    // A finger is extended if distance from wrist to tip is clearly greater than distance from wrist to PIP
    const isIndexExtended = this.dist(wrist, indexTip) > this.dist(wrist, indexPip) * 1.15;
    const isMiddleExtended = this.dist(wrist, middleTip) > this.dist(wrist, middlePip) * 1.15;
    const isRingExtended = this.dist(wrist, ringTip) > this.dist(wrist, ringPip) * 1.15;
    const isPinkyExtended = this.dist(wrist, pinkyTip) > this.dist(wrist, pinkyPip) * 1.15;

    // Thumb extension: distance to pinky MCP or index MCP
    const thumbDistToPinky = this.dist(thumbTip, pinkyMcp);
    const isThumbExtended = thumbDistToPinky > handScale * 0.9;

    let extendedCount = 0;
    if (isIndexExtended) extendedCount++;
    if (isMiddleExtended) extendedCount++;
    if (isRingExtended) extendedCount++;
    if (isPinkyExtended) extendedCount++;
    if (isThumbExtended) extendedCount++;

    // Pinch calculation (thumb tip to index tip) normalized by handScale
    const rawPinchDist = this.dist(thumbTip, indexTip);
    const pinchDistanceNorm = rawPinchDist / handScale;
    // When normalized pinch distance is small (< 0.45)
    const isPinch = pinchDistanceNorm < 0.45;

    return {
      center,
      handScale,
      isThumbExtended,
      isIndexExtended,
      isMiddleExtended,
      isRingExtended,
      isPinkyExtended,
      extendedCount,
      pinchDistanceNorm,
      isPinch
    };
  }

  reset() {
    this.currentGesture = GESTURES.NONE;
    this.smoothedHandPosition = { x: 0.5, y: 0.5 };
    this.smoothedPinchDistance = 0.1;
    this.smoothedTwoHandDistance = 0.5;
  }
}

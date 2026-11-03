/**
 * WonderSnap - Hand Tracker Module
 * MediaPipe Hands integration with 21-landmark tracking and HUD skeleton rendering.
 */

// Standard MediaPipe Hands bone connections
export const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index finger
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle finger
  [9, 10], [10, 11], [11, 12],
  // Ring finger
  [13, 14], [14, 15], [15, 16],
  // Pinky finger
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm bridge knuckles
  [5, 9], [9, 13], [13, 17]
];

export class HandTracker {
  constructor(videoElement, canvasElement) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;

    this.hands = null;
    this.cameraHelper = null;
    this.isRunning = false;
    this.onResultsCallback = null;
    this.lastFrameTime = 0;
    this.rafId = null;
    this.isMirrored = true;
  }

  /**
   * Initializes MediaPipe Hands instance
   */
  async init() {
    // Ensure MediaPipe Hands is loaded on window
    if (!window.Hands) {
      await this.loadMediaPipeScript();
    }

    if (!window.Hands) {
      throw new Error('MediaPipe Hands library could not be loaded. Please check your internet connection.');
    }

    this.hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.65,
      minTrackingConfidence: 0.65
    });

    this.hands.onResults((results) => {
      this.handleResults(results);
    });
  }

  /**
   * Dynamically injects MediaPipe Hands scripts if not present
   */
  async loadMediaPipeScript() {
    const scripts = [
      'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'
    ];

    for (const src of scripts) {
      if (document.querySelector(`script[src="${src}"]`)) continue;
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.crossOrigin = 'anonymous';
        s.onload = resolve;
        s.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(s);
      });
    }
  }

  /**
   * Start processing video frames
   * @param {Function} callback callback receiving results
   */
  start(callback) {
    this.onResultsCallback = callback;
    this.isRunning = true;

    // Use requestVideoFrameCallback or requestAnimationFrame
    const processFrame = async () => {
      if (!this.isRunning) return;

      if (this.video && this.video.readyState >= 2 && !this.video.paused) {
        try {
          await this.hands.send({ image: this.video });
        } catch (err) {
          console.warn('MediaPipe send frame error:', err);
        }
      }

      this.rafId = requestAnimationFrame(processFrame);
    };

    this.rafId = requestAnimationFrame(processFrame);
  }

  /**
   * Stop tracker and clean up canvas
   */
  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Handle results from MediaPipe Hands
   */
  handleResults(results) {
    this.drawSkeleton(results);

    if (this.onResultsCallback) {
      this.onResultsCallback(results);
    }
  }

  /**
   * Draw high-tech neon skeleton on the 2D overlay canvas
   */
  drawSkeleton(results) {
    if (!this.ctx || !this.canvas) return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    this.ctx.save();
    this.ctx.clearRect(0, 0, width, height);

    // If mirrored, flip horizontally to match video mirror
    if (this.isMirrored) {
      this.ctx.translate(width, 0);
      this.ctx.scale(-1, 1);
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      results.multiHandLandmarks.forEach((landmarks, handIndex) => {
        const isPrimary = handIndex === 0;
        const strokeColor = isPrimary ? '#00f0ff' : '#ff007f';
        const nodeColor = isPrimary ? '#ffffff' : '#ffd1dc';
        const glowColor = isPrimary ? 'rgba(0, 240, 255, 0.6)' : 'rgba(255, 0, 127, 0.6)';

        // 1. Draw Bones
        this.ctx.beginPath();
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.shadowColor = glowColor;
        this.ctx.shadowBlur = 8;

        for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
          const start = landmarks[startIdx];
          const end = landmarks[endIdx];
          this.ctx.moveTo(start.x * width, start.y * height);
          this.ctx.lineTo(end.x * width, end.y * height);
        }
        this.ctx.stroke();

        // 2. Draw Landmark Joints
        this.ctx.shadowBlur = 6;
        landmarks.forEach((lm, idx) => {
          const x = lm.x * width;
          const y = lm.y * height;

          // Fingertips get special highlight
          const isFingertip = [4, 8, 12, 16, 20].includes(idx);
          const radius = isFingertip ? 5 : 3;

          this.ctx.beginPath();
          this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
          this.ctx.fillStyle = isFingertip ? strokeColor : nodeColor;
          this.ctx.fill();

          if (isFingertip) {
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius + 2, 0, 2 * Math.PI);
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
          }
        });
      });
    }

    this.ctx.restore();
  }

  setMirrored(mirrored) {
    this.isMirrored = mirrored;
  }
}

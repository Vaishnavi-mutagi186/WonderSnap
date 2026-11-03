/**
 * WonderSnap - Webcam Manager
 * Handles camera acquisition, permissions, life-cycle, and stream cleanup.
 */
export class WebcamManager {
  constructor(videoElement) {
    this.video = videoElement;
    this.stream = null;
    this.isActive = false;
    this.isInitializing = false;
    this.isMirrored = true;

    // Apply mirror style by default
    if (this.video) {
      this.video.style.transform = 'scaleX(-1)';
    }
  }

  /**
   * Request and start camera stream
   * @param {Object} options constraints
   * @returns {Promise<MediaStream>}
   */
  async start(options = {}) {
    if (this.isActive && this.stream) {
      return this.stream;
    }
    if (this.isInitializing) {
      throw new Error('Camera initialization already in progress.');
    }

    this.isInitializing = true;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam API (getUserMedia) is not supported by your browser.');
      }

      const constraints = {
        video: {
          width: { ideal: options.width || 640 },
          height: { ideal: options.height || 480 },
          facingMode: options.facingMode || 'user',
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.stream = stream;
      this.video.srcObject = stream;

      // Wait until metadata is loaded and video is playing
      await new Promise((resolve, reject) => {
        this.video.onloadedmetadata = () => {
          this.video.play()
            .then(resolve)
            .catch(reject);
        };
        this.video.onerror = (err) => reject(err);
      });

      this.isActive = true;
      this.isInitializing = false;
      return this.stream;
    } catch (err) {
      this.isInitializing = false;
      this.stop();

      let friendlyMessage = 'Could not access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        friendlyMessage = 'Camera permission was denied. Please allow camera access in your browser settings to use hand gestures.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        friendlyMessage = 'No camera device found on your system. Please connect a webcam.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        friendlyMessage = 'Camera is already in use by another application. Please close other camera apps.';
      } else if (err.message) {
        friendlyMessage = err.message;
      }

      const customError = new Error(friendlyMessage);
      customError.originalError = err;
      throw customError;
    }
  }

  /**
   * Safely stop the camera and release hardware
   */
  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping camera track:', e);
        }
      });
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
    this.isActive = false;
    this.isInitializing = false;
  }

  toggleMirror() {
    this.isMirrored = !this.isMirrored;
    if (this.video) {
      this.video.style.transform = this.isMirrored ? 'scaleX(-1)' : 'scaleX(1)';
    }
    return this.isMirrored;
  }
}

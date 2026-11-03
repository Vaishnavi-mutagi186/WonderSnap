# WonderSnap 
> **Interactive Gesture-Controlled 3D Visual Experience**  
> Control the digital world with your hands in real time using AI Computer Vision & WebGL.

---

##  Overview

**WonderSnap** is a high-performance, real-time interactive web application where users command stunning 3D particle effects using hand gestures captured by their webcam. Powered by **MediaPipe Hands**, **Three.js**, and hardware-accelerated **WebGL**, WonderSnap processes 21 hand landmarks locally inside the browser with zero server latency and complete user privacy.

---

##  Hand Gestures & Interactive Mechanics

| Gesture | Landmark Logic | 3D Visual & Audio Reaction |
| :--- | :--- | :--- |
| **🖐️ Open Palm** | All 5 fingers extended (`extendedCount >= 4`) | Triggers an expansive radial burst, spreading particles outward with dynamic whoosh audio. |
| **✊ Closed Fist** | All fingers curled into palm (`extendedCount <= 1`) | Creates a gravitational black-hole contraction, pulling particles tightly toward the center. |
| **👌 Pinch** | Distance between Thumb Tip (#4) & Index Tip (#8) | Modulates particle size and camera zoom dynamically in real time; glides synth filter cutoff. |
| **✌️ Two Fingers** | Index & Middle extended, Ring & Pinky curled | Cycles between 3D formations (Galaxy ➔ Fireworks ➔ Wave ➔ Heart ➔ Spiral) with harmonic chime. |
| **🔄 Hand Movement** | Normalized $(X, Y)$ hand coordinate translation | Rotates and tilts the 3D particle universe smoothly along the X and Y axes. |
| **👐 Dual Hands** | Distance between both detected wrists/centers | Expands or compresses the entire particle system based on the distance between hands. |

---

##  3D Visual Effects Modes

1. **Particle Galaxy**: 22,000+ luminous particles organized in 4 logarithmic spiral arms with a dense stellar core and celestial dust.
2. **Fireworks**: Dynamic bursting shells with velocity, gravity physics, and color shifts.
3. **Wave Effect**: 3D undulating mathematical terrain grid reacting like an organic liquid ocean.
4. **Heart Formation**: 3D parametric heart ($16\sin^3(t)$ cardioid) pulsating with a realistic biological heartbeat rhythm.
5. **Spiral Effect**: 3D double helix / logarithmic vortex twisting and undulating in 3D space.

---

##  Technology Stack

- **HTML5 & CSS3**: Glassmorphism, futuristic dark HUD, responsive grid & flexbox layouts.
- **MediaPipe Hands**: Real-time 21-landmark 3D hand tracking and multi-hand detection.
- **Three.js (WebGL)**: Hardware-accelerated GPU particle rendering, additive blending, custom canvas glow textures, ACESFilmic tone mapping.
- **Web Audio API**: Real-time synthesizer producing interactive drones, harmonic arpeggios, and filter-glide feedback.
- **Webcam API (`getUserMedia`)**: High-performance video stream acquisition with device cleanup and error trapping.
- **Vite**: Ultra-fast build tool and local development server.

---

##  Project Structure

```
WonderSnap/
├── index.html                  # Main HTML5 application shell & HUD
├── package.json                # Dependencies and npm run scripts
├── vite.config.js              # Vite server & bundler configuration
├── public/
│   └── favicon.svg             # Glowing SVG vector brand icon
└── src/
    ├── styles/
    │   └── main.css            # Cyber-glass styles, animations, responsive design
    ├── modules/
    │   ├── audio.js            # Web Audio API synthesizer for gesture feedback
    │   ├── webcam.js           # Webcam lifecycle, permission handling & mirror flip
    │   ├── handTracker.js      # MediaPipe Hands integration & 21-node neon skeleton
    │   ├── gestureRecognizer.js# Normalized geometric gesture recognition engine
    │   ├── particleSystem.js   # 3D Particle effects, morphing lerp & physics
    │   ├── scene.js            # Three.js scene, camera, renderer & RAF loop
    │   └── ui.js               # UI controls, sliders, HUD, modals & error toast
    └── main.js                 # Central orchestrator connecting vision to 3D
```

---

## 💻 How to Install and Run Using CMD (Command Prompt)

### 1. Prerequisites
- **Node.js**: Version 18.0 or later installed on your system.
- Check by opening Command Prompt (`cmd`) and typing:
  ```cmd
  node -v
  npm -v
  ```

### 2. Open Command Prompt in the Project Folder
```cmd
cd /d c:\Users\Admin\Desktop\WonderSnap
```

### 3. Install Dependencies
```cmd
npm install
```

### 4. Start the Local Development Server
```cmd
npm run dev
```

The terminal will display a local address (e.g. `http://localhost:3000` or `http://localhost:5173`). Open that URL in any modern browser (Google Chrome, Microsoft Edge, Brave, or Firefox).

### 5. Production Build (Optional)
To test or build the optimized static production bundle:
```cmd
npm run build
npm run preview
```

---

## 🔒 Browser Requirements & Permissions

1. **Webcam Access**: When prompted by your browser, click **"Allow"** to grant camera access.
2. **Local Processing**: Video frames never leave your computer; hand landmark analysis is executed entirely client-side using WebAssembly and WebGL.
3. **HTTPS / Localhost**: Browsers only permit webcam access on `localhost` or secure `https://` origins.
4. **Fallback Pointer Mode**: If no camera is connected or permission is denied, the application gracefully allows full mouse/touch orbital control, mode switching, and parameter adjustment.

# FileServe v2 🗂️

Local network file server with a React gallery UI, carousel viewer, and media streaming.

## Features
- 📁 Browse any folder / external drive on your PC
- 🎠 Full-screen carousel with image + video support
  - Keyboard ← → navigation, Escape to close
  - Thumbnail strip at the bottom
  - Touch swipe on mobile
  - Videos play inline with controls
- 🖼️ Image grid with hover overlay
- 🎬 Video cards with play button preview
- 🎵 Audio — opens in new tab
- 📂 Tab filters: All / Folders / Images / Videos / Audio / Docs / Other
- 🔍 Live filename search
- ⬇️ One-click downloads
- Grid ↔ List view toggle
- HTTP Range streaming for video seek

---

## Setup

### 1. Install Node.js
Download from https://nodejs.org (v18 LTS or newer)

### 2. Install dependencies
```
npm install
```

---

## Running

### Development mode (hot reload)
```
npm run dev -- "D:\"
```
> Opens Vite on http://localhost:3000, Express API on :3001

### Production mode (single server)
```
npm run build
npm start -- "D:\"
```
> Serves everything from http://localhost:3000
> Open the Network URL on any device on your Wi-Fi

---

## Sharing a specific drive / folder

Pass the path as the first argument:

```
# External drive (replace D: with your drive letter)
npm start -- "D:\"

# A specific folder
npm start -- "C:\Users\YourName\Pictures"

# Or set as env variable
set SHARE_DIR=D:\
npm start
```

Find your drive letter in **File Explorer → This PC → Devices and drives**.

---

## Notes
- Hidden files (starting with `.`) are not shown
- Video/audio streams with full seek support (HTTP Range)
- No authentication — use on a trusted home network only
- Press `Ctrl+C` to stop the server

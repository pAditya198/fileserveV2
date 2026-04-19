<div align="center">

# ⬡ FileServe v2

**Local network file server with a React gallery UI, carousel viewer, and media streaming.**

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com)

</div>

---

## ✨ Features

### 📁 Browsing

- Browse any folder or external drive on your PC
- Breadcrumb navigation synced to the browser URL — back/forward work
- Tab filters: All · Folders · Images · Videos · Audio · Docs · Other
- Live filename search / filter
- Grid ↔ List view toggle
- Recursive mode — show all files in a directory tree at once
- One-click downloads

### 🎠 Media

- Full-screen carousel for images and videos
  - Keyboard `←` `→` navigation, `Escape` to close
  - Touch swipe on mobile
  - Thumbnail strip at the bottom
  - Videos play inline with controls
  - "Show all media" toggle — expand from a single category to all images + videos
- HTTP Range streaming for smooth video seek
- Audio — opens in new tab

### ⚡ Performance

- **File index** — on startup the server walks the entire tree once into an in-memory index; all subsequent requests are served from memory with zero disk I/O
- **Persistent cache** — index is saved to the system temp directory, keyed to the shared path; on restart the cache loads instantly so the server is ready immediately
- **Incremental sync** — on restart with a warm cache, only entries whose `mtime` changed since the last save are updated — no full re-walk
- **Async walk** — the directory walk yields to the event loop after each directory so the server stays responsive while indexing
- **O(1) directory lookups** — a pre-built `dirChildren` map gives instant shallow listings without scanning the whole index
- **Virtual scroll** — image/video grids render only visible rows, keeping the browser fast for large directories
- **Server-side pagination** — the API returns pages of 200 items; the client loads more automatically on scroll

### 📦 Other

- Extract `.zip` archives directly from the UI — extracted folder is indexed immediately
- Mobile responsive layout
- Indexing splash screen with progress indicator on first load

---

## 🚀 Setup

### 1. Install Node.js

Download from [nodejs.org](https://nodejs.org) — **v18 LTS or newer**

### 2. Install dependencies

```bash
npm install
```

---

## ▶️ Running

### Development mode (hot reload)

```bash
npm run dev -- "D:\"
```

> Vite dev server on `http://localhost:5173`, Express API on `:3001`

### Production mode (single server)

```bash
npm run build
npm start -- "D:\"
```

> Serves everything from `http://localhost:3000`  
> Open the **Network URL** shown in the console on any device on the same Wi-Fi

---

## 📂 Sharing a specific drive / folder

Pass the path as the first CLI argument:

```bash
# External drive
npm start -- "D:\"

# A specific folder
npm start -- "C:\Users\YourName\Pictures"

# Or set as an environment variable
set SHARE_DIR=D:\
npm start
```

Find your drive letter in **File Explorer → This PC → Devices and drives**.

---

## 🔌 API

| Endpoint                                                   | Description                                    |
| ---------------------------------------------------------- | ---------------------------------------------- |
| `GET /api/status`                                          | `{ ready, indexing, total }` — index readiness |
| `GET /api/files?path=&recursive=&category=&offset=&limit=` | List directory contents                        |
| `POST /api/unzip`                                          | Extract a `.zip` file into a sibling folder    |
| `GET /files/*`                                             | Stream a file (supports HTTP Range)            |

The `category` parameter accepts a single value or a comma-separated list (e.g. `image,video`).

---

## 📝 Notes

- Hidden files (starting with `.`) are not shown
- No authentication — use on a **trusted home network** only
- The index cache is stored in the system temp folder (one file per unique shared path)
- Press `Ctrl+C` to stop the server

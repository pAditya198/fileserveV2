# FileServe v2

Local network file server with a React gallery UI, carousel viewer, and media streaming.

## Features

### Browsing

- Browse any folder / external drive on your PC
- Breadcrumb navigation synced to the browser URL (back/forward work)
- Tab filters: All / Folders / Images / Videos / Audio / Docs / Other
- Live filename search / filter
- Grid ↔ List view toggle
- Recursive mode — show all files in a directory tree at once
- One-click downloads

### Media

- Full-screen carousel for images and videos
  - Keyboard ← → navigation, Escape to close
  - Touch swipe on mobile
  - Thumbnail strip at the bottom
  - Videos play inline with controls
  - "Show all media" toggle — expand from a single category to all images + videos
- HTTP Range streaming for video seek
- Audio — opens in new tab

### Performance

- **File index** — on startup the server walks the entire tree once into an in-memory index. Subsequent requests are served from the index with no disk I/O
- **Persistent index cache** — the index is saved to a JSON file in the system temp directory, keyed to the shared path. On restart the cache is restored instantly so the server is ready before the full walk finishes
- **Async indexing** — the walk yields to the event loop after each directory, so `/api/status` and file requests remain responsive while the index is being built
- **O(1) directory lookups** — a pre-built `dirChildren` map gives instant shallow listings without scanning the whole index
- **Virtual scroll** — image/video grids with many items render only visible rows (+ a small overscan), keeping the browser fast for large directories
- **Server-side pagination** — the API returns pages of 200 items; the client loads more on scroll

### Other

- Unzip `.zip` archives directly from the UI into a sibling folder
- Mobile responsive layout

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

> Vite dev server on http://localhost:5173, Express API on :3001

### Production mode (single server)

```
npm run build
npm start -- "D:\"
```

> Serves everything from http://localhost:3000  
> Open the Network URL shown in the console on any device on the same Wi-Fi

---

## Sharing a specific drive / folder

Pass the path as the first argument:

```
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

## API

| Endpoint                                                   | Description                                    |
| ---------------------------------------------------------- | ---------------------------------------------- |
| `GET /api/status`                                          | `{ ready, indexing, total }` — index readiness |
| `GET /api/files?path=&recursive=&category=&offset=&limit=` | List directory contents                        |
| `POST /api/unzip`                                          | Extract a `.zip` file into a sibling folder    |
| `GET /files/*`                                             | Stream a file (supports HTTP Range)            |

The `category` parameter accepts a single value or a comma-separated list (e.g. `image,video`).

---

## Notes

- Hidden files (starting with `.`) are not shown
- No authentication — use on a trusted home network only
- The index cache is stored in the system temp folder (one file per shared path)
- Press `Ctrl+C` to stop the server

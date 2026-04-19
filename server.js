import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mime from "mime-types";
import os from "os";
import dotenv from "dotenv";
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === "production";

const ROOT_DIR = path.resolve(process.argv[2] || process.env.SHARE_DIR || ".");
const REAL_ROOT = fs.realpathSync(ROOT_DIR);
// ── Helpers ───────────────────────────────────────────────────────────────────
function getLocalIPs() {
  const result = [];
  for (const iface of Object.values(os.networkInterfaces())) {
    for (const alias of iface) {
      if (alias.family === "IPv4" && !alias.internal)
        result.push(alias.address);
    }
  }
  return result;
}

function categorize(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (
    [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".svg",
      ".bmp",
      ".avif",
      ".tiff",
    ].includes(ext)
  )
    return "image";
  if (
    [
      ".mp4",
      ".webm",
      ".mkv",
      ".avi",
      ".mov",
      ".wmv",
      ".m4v",
      ".ts",
      ".flv",
    ].includes(ext)
  )
    return "video";
  if (
    [
      ".mp3",
      ".wav",
      ".flac",
      ".ogg",
      ".aac",
      ".m4a",
      ".wma",
      ".opus",
      ".aiff",
    ].includes(ext)
  )
    return "audio";
  if (
    [
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      ".txt",
      ".md",
      ".csv",
      ".json",
      ".xml",
      ".zip",
      ".rar",
      ".7z",
      ".tar",
      ".gz",
    ].includes(ext)
  )
    return "document";
  return "other";
}

function safePath(reqPath) {
  const cleaned = reqPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const full = path.resolve(REAL_ROOT, cleaned);
  const real = fs.existsSync(full) ? fs.realpathSync(full) : full;
  return real.startsWith(REAL_ROOT) ? full : null;
}

function fmtSize(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// ── Static: serve built React app in production ───────────────────────────────
if (IS_PROD) {
  app.use(express.static(path.join(__dirname, "dist")));
}

// ── API ───────────────────────────────────────────────────────────────────────
app.get("/api/files", (req, res) => {
  const reqPath = req.query.path || "";
  const full = safePath(reqPath);

  if (!full) return res.status(403).json({ error: "Forbidden" });
  if (!fs.existsSync(full)) return res.status(404).json({ error: "Not found" });

  const stat = fs.statSync(full);
  if (!stat.isDirectory())
    return res.status(400).json({ error: "Not a directory" });

  let entries;
  try {
    entries = fs.readdirSync(full, { withFileTypes: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  const items = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const itemPath = path.join(full, entry.name);
    let size = 0,
      mtime = null;
    try {
      const s = fs.statSync(itemPath);
      size = s.size;
      mtime = s.mtime;
    } catch {}

    const relPath = (reqPath ? reqPath + "/" : "") + entry.name;
    items.push({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      size,
      sizeHuman: entry.isFile() ? fmtSize(size) : null,
      mtime,
      path: relPath.replace(/\\/g, "/"),
      category: entry.isDirectory() ? "folder" : categorize(entry.name),
      ext: path.extname(entry.name).toLowerCase(),
    });
  }

  items.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  const parts = reqPath ? reqPath.split("/").filter(Boolean) : [];
  const breadcrumb = [{ name: "Home", path: "" }];
  parts.forEach((p, i) =>
    breadcrumb.push({ name: p, path: parts.slice(0, i + 1).join("/") }),
  );

  res.json({ items, currentPath: reqPath, breadcrumb });
});

// ── File streaming ────────────────────────────────────────────────────────────
app.get("/files/*", (req, res) => {
  const reqPath = decodeURIComponent(req.params[0] || "");
  const full = safePath(reqPath);
  if (!full) return res.status(403).send("Forbidden");

  let stat;
  try {
    stat = fs.statSync(full);
  } catch {
    return res.status(404).send("Not found");
  }
  if (stat.isDirectory()) return res.status(400).send("Is a directory");

  const contentType = mime.lookup(full) || "application/octet-stream";
  const fileSize = stat.size;
  const range = req.headers.range;
  const download = req.query.dl === "1";

  const base = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-cache",
    ...(download
      ? {
          "Content-Disposition": `attachment; filename="${path.basename(full)}"`,
        }
      : {}),
  };

  if (range) {
    const [s, e] = range.replace(/bytes=/, "").split("-");
    const start = parseInt(s, 10);
    const end = e
      ? parseInt(e, 10)
      : Math.min(start + 10 * 1024 * 1024 - 1, fileSize - 1);
    res.writeHead(206, {
      ...base,
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Content-Length": end - start + 1,
    });
    fs.createReadStream(full, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { ...base, "Content-Length": fileSize });
    fs.createReadStream(full).pipe(res);
  }
});

// ── SPA fallback (production) ─────────────────────────────────────────────────
if (IS_PROD) {
  app.get("*", (req, res) =>
    res.sendFile(path.join(__dirname, "dist", "index.html")),
  );
}

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  const ips = getLocalIPs();
  console.log("\n╔═══════════════════════════════════════╗");
  console.log("║        FileServe v2  ⬡               ║");
  console.log("╠═══════════════════════════════════════╣");
  console.log(`║  Sharing:  ${ROOT_DIR.slice(0, 27).padEnd(27)}║`);
  console.log(`║  Local:    http://localhost:${PORT}       ║`);
  ips.forEach((ip) =>
    console.log(`║  Network:  http://${ip}:${PORT}`.padEnd(42) + "║"),
  );
  console.log("╚═══════════════════════════════════════╝\n");
});

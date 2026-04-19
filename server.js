import 'dotenv/config'
import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import mime from 'mime-types'
import os from 'os'
import crypto from 'crypto'

const require = createRequire(import.meta.url)
const AdmZip = require('adm-zip')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000
const IS_PROD = process.env.NODE_ENV === 'production'

app.use(express.json())

const ROOT_DIR = path.resolve(process.argv[2] || process.env.SHARE_DIR || '.')
const REAL_ROOT = fs.realpathSync(ROOT_DIR)
// Cache file is keyed to the shared directory so each share has its own index
const INDEX_CACHE_FILE = path.join(
  os.tmpdir(),
  `fileserve_${crypto.createHash('md5').update(REAL_ROOT).digest('hex').slice(0, 8)}.json`
)

console.log(`Sharing directory: ${REAL_ROOT}`, `\nIndex cache file: ${INDEX_CACHE_FILE}`)
// ── Helpers ───────────────────────────────────────────────────────────────────
function getLocalIPs() {
  const result = []
  for (const iface of Object.values(os.networkInterfaces())) {
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) result.push(alias.address)
    }
  }
  return result
}

function categorize(filename) {
  const ext = path.extname(filename).toLowerCase()
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.avif', '.tiff'].includes(ext)) return 'image'
  if (['.mp4', '.webm', '.mkv', '.avi', '.mov', '.wmv', '.m4v', '.ts', '.flv'].includes(ext)) return 'video'
  if (['.mp3', '.wav', '.flac', '.ogg', '.aac', '.m4a', '.wma', '.opus', '.aiff'].includes(ext)) return 'audio'
  if (['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.csv',
    '.json', '.xml', '.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) return 'document'
  return 'other'
}

function safePath(reqPath) {
  const cleaned = reqPath.replace(/\\/g, '/').replace(/^\/+/, '')
  const full = path.resolve(REAL_ROOT, cleaned)
  const real = fs.existsSync(full) ? fs.realpathSync(full) : full
  return real.startsWith(REAL_ROOT) ? full : null
}

function fmtSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

// ── Static: serve built React app in production ───────────────────────────────
if (IS_PROD) {
  app.use(express.static(path.join(__dirname, 'dist')))
}

// ── Recursive walk ────────────────────────────────────────────────────────────
function walkDir(fullDir, relBase, results = [], depth = 0) {
  if (depth > 10) return results
  let entries
  try { entries = fs.readdirSync(fullDir, { withFileTypes: true }) } catch { return results }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const itemFull = path.join(fullDir, entry.name)
    const relPath = (relBase ? relBase + '/' : '') + entry.name
    let size = 0, mtime = null
    try { const s = fs.statSync(itemFull); size = s.size; mtime = s.mtime } catch { }

    results.push({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      size,
      sizeHuman: entry.isFile() ? fmtSize(size) : null,
      mtime,
      path: relPath.replace(/\\/g, '/'),
      category: entry.isDirectory() ? 'folder' : categorize(entry.name),
      ext: path.extname(entry.name).toLowerCase(),
    })

    if (entry.isDirectory()) walkDir(itemFull, relPath, results, depth + 1)
  }
  return results
}

function makeCounts(items) {
  const c = { all: 0 }
  for (const i of items) {
    if (!i.isDirectory) c.all++
    c[i.category] = (c[i.category] || 0) + 1
  }
  return c
}

// ── File Index ────────────────────────────────────────────────────────────────
const fileIndex = new Map()    // relPath → entry
const dirChildren = new Map()  // dirPath → entry[] (pre-sorted, O(1) lookup)
let indexReady = false
let indexing = false

function getParentDir(relPath) {
  const i = relPath.lastIndexOf('/')
  return i === -1 ? '' : relPath.slice(0, i)
}

function buildDirChildren() {
  dirChildren.clear()
  dirChildren.set('', [])
  for (const entry of fileIndex.values()) {
    const parent = getParentDir(entry.path)
    let arr = dirChildren.get(parent)
    if (!arr) { arr = []; dirChildren.set(parent, arr) }
    arr.push(entry)
  }
  // Pre-sort each directory: folders first, then name
  for (const arr of dirChildren.values()) {
    arr.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
  }
}

// DFS over dirChildren — only touches entries in the target subtree
function collectFilesRecursive(rootPath) {
  const result = []
  const stack = [rootPath]
  while (stack.length) {
    const dir = stack.pop()
    for (const entry of dirChildren.get(dir) ?? []) {
      if (entry.isDirectory) stack.push(entry.path)
      else result.push(entry)
    }
  }
  return result
}

// Persist index so restarts are instant
function saveIndex() {
  try {
    fs.writeFileSync(
      INDEX_CACHE_FILE,
      JSON.stringify({ v: 1, root: REAL_ROOT, entries: [...fileIndex.values()] }),
      'utf8'
    )
  } catch (e) { console.warn('Failed to save index cache:', e.message) }
}

let saveTimer = null
function scheduleSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(saveIndex, 2000)
}

async function loadIndex() {
  try {
    if (!fs.existsSync(INDEX_CACHE_FILE)) return false
    const raw = await fs.promises.readFile(INDEX_CACHE_FILE, 'utf8')
    // Yield before the potentially heavy JSON.parse so the event loop stays free
    await new Promise(resolve => setImmediate(resolve))
    const data = JSON.parse(raw)
    if (data.v !== 1 || data.root !== REAL_ROOT) return false
    fileIndex.clear()
    for (const e of data.entries) fileIndex.set(e.path, e)
    buildDirChildren()
    indexReady = true
    console.log(`Index restored from cache: ${fileIndex.size} entries`)
    return true
  } catch (e) {
    console.warn('Failed to load index cache:', e.message)
    return false
  }
}

async function buildIndex() {
  indexing = true
  console.log('Building file index...')
  const t = Date.now()
  const all = await walkDirAsync(REAL_ROOT, '')
  fileIndex.clear()
  for (const entry of all) fileIndex.set(entry.path, entry)
  indexReady = true
  indexing = false
  console.log(`Index ready: ${fileIndex.size} entries in ${Date.now() - t}ms`)
  buildDirChildren()
  saveIndex()
}

const pendingChanges = new Set()
let rebuildTimer = null

function scheduleUpdate(relPathRaw) {
  const relPath = relPathRaw.replace(/\\/g, '/')
  if (path.basename(relPath).startsWith('.')) return
  pendingChanges.add(relPath)
  clearTimeout(rebuildTimer)
  rebuildTimer = setTimeout(flushChanges, 300)
}

async function flushChanges() {
  for (const relPath of pendingChanges) {
    const fullPath = path.join(REAL_ROOT, relPath)
    if (!fs.existsSync(fullPath)) {
      const prefix = relPath + '/'
      for (const key of fileIndex.keys()) {
        if (key === relPath || key.startsWith(prefix)) fileIndex.delete(key)
      }
    } else {
      const name = path.basename(relPath)
      try {
        const s = fs.statSync(fullPath)
        const isDir = s.isDirectory()
        fileIndex.set(relPath, {
          name, isDirectory: isDir, size: s.size,
          sizeHuman: !isDir ? fmtSize(s.size) : null,
          mtime: s.mtime, path: relPath,
          category: isDir ? 'folder' : categorize(name),
          ext: path.extname(name).toLowerCase(),
        })
        if (isDir) {
          const newEntries = await walkDirAsync(fullPath, relPath)
          for (const e of newEntries) fileIndex.set(e.path, e)
        }
      } catch { /* file disappeared */ }
    }
  }
  pendingChanges.clear()
  buildDirChildren()
  scheduleSave() // persist watcher-driven changes
}

function startWatcher() {
  try {
    fs.watch(REAL_ROOT, { recursive: true }, (_event, filename) => {
      if (filename) scheduleUpdate(filename)
    })
    console.log('File watcher active')
  } catch (e) {
    console.warn('File watcher unavailable:', e.message)
  }
}

// Await loadIndex first so buildIndex doesn't race and overwrite a valid cache restore
async function startup() {
  await loadIndex()
  buildIndex()   // fire-and-forget: runs in background, server is already listening
  startWatcher()
}
startup()

// ── API: status ─────────────────────────────────────────────────────────────────
app.get('/api/status', (_req, res) => {
  res.json({ ready: indexReady, indexing, total: fileIndex.size })
})

// ── API: list directory ───────────────────────────────────────────────────────
app.get('/api/files', (req, res) => {
  if (!indexReady) {
    return res.status(503).json({ error: 'Indexing in progress', indexing: true })
  }

  const reqPath = req.query.path || ''
  const recursive = req.query.recursive === 'true'
  // category can be a single value or comma-separated list e.g. "image,video"
  const categoryParam = req.query.category || 'all'
  const categories = categoryParam === 'all'
    ? null
    : categoryParam.split(',').map(c => c.trim()).filter(Boolean)
  const offset = Math.max(0, parseInt(req.query.offset) || 0)
  const limit = Math.min(2000, Math.max(1, parseInt(req.query.limit) || 200))

  // Security: validate the path is inside REAL_ROOT
  const full = safePath(reqPath)
  if (!full) return res.status(403).json({ error: 'Forbidden' })

  // Existence check against the index
  if (reqPath !== '' && !dirChildren.has(reqPath)) return res.status(404).json({ error: 'Not found' })

  const parts = reqPath ? reqPath.split('/').filter(Boolean) : []
  const breadcrumb = [{ name: 'Home', path: '' }]
  parts.forEach((p, i) => breadcrumb.push({ name: p, path: parts.slice(0, i + 1).join('/') }))

  if (recursive) {
    const allFiles = collectFilesRecursive(reqPath)
    allFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

    const counts = makeCounts(allFiles)
    const filtered = categories ? allFiles.filter(i => categories.includes(i.category)) : allFiles
    const total = filtered.length
    const items = filtered.slice(offset, offset + limit)

    return res.json({ items, counts, total, currentPath: reqPath, breadcrumb, recursive: true })
  }

  // Non-recursive: O(1) — dirChildren already sorted (folders first, then by name)
  const items = dirChildren.get(reqPath) ?? []

  const counts = makeCounts(items)
  const total = items.length
  const pagedItems = items.slice(offset, offset + limit)
  res.json({ items: pagedItems, counts, total, currentPath: reqPath, breadcrumb, recursive: false })
})

// ── API: unzip ────────────────────────────────────────────────────────────────
app.post('/api/unzip', (req, res) => {
  const { filePath } = req.body || {}
  if (!filePath) return res.status(400).json({ error: 'filePath is required' })

  const full = safePath(filePath)
  if (!full) return res.status(403).json({ error: 'Forbidden' })
  if (!fs.existsSync(full)) return res.status(404).json({ error: 'File not found' })

  const ext = path.extname(full).toLowerCase()
  if (ext !== '.zip') {
    return res.status(400).json({
      error: `Only .zip files are supported for extraction. Got: ${ext || '(no extension)'}`
    })
  }

  const dir = path.dirname(full)
  const baseName = path.basename(full, ext)

  // Find a non-colliding folder name
  let extractDir = path.join(dir, `${baseName}_extracted`)
  let counter = 1
  while (fs.existsSync(extractDir)) {
    extractDir = path.join(dir, `${baseName}_extracted_${counter++}`)
  }

  try {
    const zip = new AdmZip(full)
    zip.extractAllTo(extractDir, /* overwrite */ true)

    const relPath = path.relative(REAL_ROOT, extractDir).replace(/\\/g, '/')
    res.json({ extractedPath: relPath, folderName: path.basename(extractDir) })
  } catch (err) {
    res.status(500).json({ error: `Extraction failed: ${err.message}` })
  }
})

// ── File streaming ────────────────────────────────────────────────────────────
app.get('/files/*', (req, res) => {
  const reqPath = decodeURIComponent(req.params[0] || '')
  const full = safePath(reqPath)
  if (!full) return res.status(403).send('Forbidden')

  let stat
  try { stat = fs.statSync(full) } catch { return res.status(404).send('Not found') }
  if (stat.isDirectory()) return res.status(400).send('Is a directory')

  const contentType = mime.lookup(full) || 'application/octet-stream'
  const fileSize = stat.size
  const range = req.headers.range
  const download = req.query.dl === '1'

  const base = {
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache',
    ...(download ? { 'Content-Disposition': `attachment; filename="${path.basename(full)}"` } : {})
  }

  if (range) {
    const [s, e] = range.replace(/bytes=/, '').split('-')
    const start = parseInt(s, 10)
    const end = e ? parseInt(e, 10) : Math.min(start + 10 * 1024 * 1024 - 1, fileSize - 1)
    res.writeHead(206, { ...base, 'Content-Range': `bytes ${start}-${end}/${fileSize}`, 'Content-Length': end - start + 1 })
    fs.createReadStream(full, { start, end }).pipe(res)
  } else {
    res.writeHead(200, { ...base, 'Content-Length': fileSize })
    fs.createReadStream(full).pipe(res)
  }
})

// ── SPA fallback (production) ─────────────────────────────────────────────────
if (IS_PROD) {
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')))
}

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs()
  console.log('\n╔═══════════════════════════════════════╗')
  console.log('║        FileServe v2  ⬡               ║')
  console.log('╠═══════════════════════════════════════╣')
  console.log(`║  Sharing:  ${ROOT_DIR.slice(0, 27).padEnd(27)}║`)
  console.log(`║  Local:    http://localhost:${PORT}       ║`)
  ips.forEach(ip => console.log(`║  Network:  http://${ip}:${PORT}`.padEnd(42) + '║'))
  console.log('╚═══════════════════════════════════════╝\n')
})
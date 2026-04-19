import 'dotenv/config'
import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import mime from 'mime-types'
import os from 'os'

const require = createRequire(import.meta.url)
const AdmZip = require('adm-zip')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000
const IS_PROD = process.env.NODE_ENV === 'production'

app.use(express.json())

const ROOT_DIR = path.resolve(process.argv[2] || process.env.SHARE_DIR || '.')
const REAL_ROOT = fs.realpathSync(ROOT_DIR)

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

// ── API: list directory ───────────────────────────────────────────────────────
app.get('/api/files', (req, res) => {
  const reqPath = req.query.path || ''
  const recursive = req.query.recursive === 'true'
  // category can be a single value or comma-separated list e.g. "image,video"
  const categoryParam = req.query.category || 'all'
  const categories = categoryParam === 'all'
    ? null
    : categoryParam.split(',').map(c => c.trim()).filter(Boolean)
  const offset = Math.max(0, parseInt(req.query.offset) || 0)
  const limit = Math.min(2000, Math.max(1, parseInt(req.query.limit) || 200))
  const full = safePath(reqPath)

  if (!full) return res.status(403).json({ error: 'Forbidden' })
  if (!fs.existsSync(full)) return res.status(404).json({ error: 'Not found' })

  const stat = fs.statSync(full)
  if (!stat.isDirectory()) return res.status(400).json({ error: 'Not a directory' })

  const parts = reqPath ? reqPath.split('/').filter(Boolean) : []
  const breadcrumb = [{ name: 'Home', path: '' }]
  parts.forEach((p, i) => breadcrumb.push({ name: p, path: parts.slice(0, i + 1).join('/') }))

  if (recursive) {
    // Walk full tree — files only — then compute counts, then filter
    const allFiles = walkDir(full, reqPath).filter(i => !i.isDirectory)
    allFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

    const counts = makeCounts(allFiles)
    console.log(`Total files before category filter: ${counts.all}`, categories)
    const filtered = categories
      ? allFiles.filter(i => categories.includes(i.category))
      : allFiles

    console.log(`Total files after category filter: ${filtered.length} (category=${categoryParam})`)

    const total = filtered.length
    const items = filtered.slice(offset, offset + limit)
    console.log(`Recursive load: ${total} items (category=${categoryParam}, offset=${offset}, limit=${limit})`)

    return res.json({ items, counts, total, currentPath: reqPath, breadcrumb, recursive: true })
  }

  // Non-recursive: shallow read
  let entries
  try { entries = fs.readdirSync(full, { withFileTypes: true }) }
  catch (e) { return res.status(500).json({ error: e.message }) }

  const items = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const itemPath = path.join(full, entry.name)
    let size = 0, mtime = null
    try { const s = fs.statSync(itemPath); size = s.size; mtime = s.mtime } catch { }

    const relPath = (reqPath ? reqPath + '/' : '') + entry.name
    items.push({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      size,
      sizeHuman: entry.isFile() ? fmtSize(size) : null,
      mtime,
      path: relPath.replace(/\\/g, '/'),
      category: entry.isDirectory() ? 'folder' : categorize(entry.name),
      ext: path.extname(entry.name).toLowerCase(),
    })
  }

  items.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })

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
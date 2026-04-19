import { useMemo } from 'react'
import styles from './FileBrowser.module.css'

const TABS = [
  { key: 'all',      label: 'All',       emoji: null },
  { key: 'folder',   label: 'Folders',   emoji: '📁' },
  { key: 'image',    label: 'Images',    emoji: '🖼' },
  { key: 'video',    label: 'Videos',    emoji: '🎬' },
  { key: 'audio',    label: 'Audio',     emoji: '🎵' },
  { key: 'document', label: 'Docs',      emoji: '📄' },
  { key: 'other',    label: 'Other',     emoji: '📦' },
]

function fileIcon(item) {
  if (item.isDirectory) return '📁'
  const { category, ext } = item
  if (category === 'image') return '🖼'
  if (category === 'audio') return '🎵'
  if (category === 'video') return '🎬'
  if (ext === '.pdf')  return '📕'
  if (['.doc','.docx'].includes(ext)) return '📝'
  if (['.xls','.xlsx'].includes(ext)) return '📊'
  if (['.ppt','.pptx'].includes(ext)) return '📊'
  if (['.zip','.rar','.7z','.tar','.gz'].includes(ext)) return '🗜'
  if (['.txt','.md'].includes(ext)) return '📄'
  return '📦'
}

function encPath(p) { return p.split('/').map(encodeURIComponent).join('/') }

export default function FileBrowser({
  items, loading, error,
  activeTab, onTabChange,
  viewMode, onViewChange,
  search, onNavigate, onOpenCarousel,
}) {
  const counts = useMemo(() => {
    const c = { all: items.length }
    for (const item of items) c[item.category] = (c[item.category] || 0) + 1
    return c
  }, [items])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items
      .filter(i => activeTab === 'all' || i.category === activeTab)
      .filter(i => !q || i.name.toLowerCase().includes(q))
  }, [items, activeTab, search])

  function handleClick(item) {
    if (item.isDirectory) { onNavigate(item.path); return }
    if (item.category === 'image' || item.category === 'video') { onOpenCarousel(item); return }
    // For audio, open directly
    if (item.category === 'audio') { window.open(`/files/${encPath(item.path)}`, '_blank'); return }
  }

  if (loading) return (
    <div className={styles.centered}>
      <div className={styles.spinner} />
      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>Loading…</span>
    </div>
  )

  if (error) return (
    <div className={styles.centered}>
      <div className={styles.errorBox}>⚠ {error}</div>
    </div>
  )

  return (
    <div className={styles.root}>
      {/* Tabs + view toggle */}
      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ''}`}
              onClick={() => onTabChange(t.key)}
            >
              {t.emoji && <span>{t.emoji}</span>}
              {t.label}
              <span className={styles.count}>{counts[t.key] || 0}</span>
            </button>
          ))}
        </div>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
            onClick={() => onViewChange('grid')}
            title="Grid view"
          >
            <GridIcon />
          </button>
          <button
            className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
            onClick={() => onViewChange('list')}
            title="List view"
          >
            <ListIcon />
          </button>
        </div>
      </div>

      {/* Content */}
      <main className={styles.main}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>{search ? '🔍' : '📭'}</div>
            <p className={styles.emptyTitle}>{search ? 'No matches' : 'Empty folder'}</p>
            <p className={styles.emptyText}>
              {search ? `Nothing matches "${search}"` : 'This folder has no items'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <GridView items={filtered} activeTab={activeTab} onClickItem={handleClick} />
        ) : (
          <ListView items={filtered} onClickItem={handleClick} />
        )}
      </main>
    </div>
  )
}

// ── Grid View ─────────────────────────────────────────────────────────────────
const GROUPS = [
  { key: 'folder',   label: '📁 Folders' },
  { key: 'image',    label: '🖼 Images' },
  { key: 'video',    label: '🎬 Videos' },
  { key: 'audio',    label: '🎵 Audio' },
  { key: 'document', label: '📄 Documents' },
  { key: 'other',    label: '📦 Other' },
]

function GridView({ items, activeTab, onClickItem }) {
  const groups = activeTab === 'all'
    ? GROUPS.map(g => ({ ...g, items: items.filter(i => i.category === g.key) })).filter(g => g.items.length)
    : [{ key: activeTab, label: '', items }]

  return (
    <div className={styles.gridOuter}>
      {groups.map(g => (
        <div key={g.key}>
          {activeTab === 'all' && <div className={styles.sectionHeader}>{g.label} <span>{g.items.length}</span></div>}
          <div className={`${styles.grid} ${g.key === 'image' || g.key === 'video' ? styles.mediaGrid : ''}`}>
            {g.items.map(item => <GridCard key={item.path} item={item} onClick={onClickItem} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

function GridCard({ item, onClick }) {
  const isMedia = item.category === 'image' || item.category === 'video'
  const isImage = item.category === 'image'
  const isVideo = item.category === 'video'

  return (
    <div className={`${styles.card} ${isMedia ? styles.mediaCard : ''}`} onClick={() => onClick(item)}>
      {isImage ? (
        <div className={styles.cardThumbWrap}>
          <img
            className={styles.cardThumb}
            src={`/files/${encPath(item.path)}`}
            alt={item.name}
            loading="lazy"
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
          />
          <div className={styles.cardIconFallback} style={{ display: 'none' }}>{fileIcon(item)}</div>
        </div>
      ) : isVideo ? (
        <div className={styles.cardThumbWrap}>
          <div className={styles.videoThumb}>
            <div className={styles.playBtn}>▶</div>
            <span className={styles.videoExt}>{item.ext.slice(1).toUpperCase()}</span>
          </div>
        </div>
      ) : (
        <div className={styles.cardIconWrap}>{fileIcon(item)}</div>
      )}

      {!isMedia && (
        <div className={styles.cardInfo}>
          <div className={styles.cardName} title={item.name}>{item.name}</div>
          <div className={styles.cardMeta}>{item.sizeHuman || 'Folder'}</div>
        </div>
      )}

      {isMedia && (
        <div className={styles.mediaOverlay}>
          <div className={styles.mediaName}>{item.name}</div>
          <div className={styles.mediaActions}>
            <a
              className={styles.dlBtn}
              href={`/files/${encPath(item.path)}?dl=1`}
              download={item.name}
              onClick={e => e.stopPropagation()}
              title="Download"
            >
              <DownloadIcon />
            </a>
          </div>
        </div>
      )}

      {!isMedia && !item.isDirectory && (
        <a
          className={styles.cardDl}
          href={`/files/${encPath(item.path)}?dl=1`}
          download={item.name}
          onClick={e => e.stopPropagation()}
          title="Download"
        >
          <DownloadIcon />
        </a>
      )}
    </div>
  )
}

// ── List View ─────────────────────────────────────────────────────────────────
function ListView({ items, onClickItem }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Size</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={item.path} className={styles.row} onClick={() => onClickItem(item)}>
            <td>
              <div className={styles.rowName}>
                <span className={styles.rowIcon}>{fileIcon(item)}</span>
                <span>{item.name}</span>
              </div>
            </td>
            <td>
              <span className={`${styles.pill} ${styles['pill_' + item.category]}`}>
                {item.category}
              </span>
            </td>
            <td className={styles.rowSize}>{item.sizeHuman || '—'}</td>
            <td className={styles.rowAction}>
              {!item.isDirectory && (
                <a
                  className={styles.rowDl}
                  href={`/files/${encPath(item.path)}?dl=1`}
                  download={item.name}
                  onClick={e => e.stopPropagation()}
                >
                  <DownloadIcon /> Download
                </a>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function GridIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
}
function ListIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
}
function DownloadIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
}

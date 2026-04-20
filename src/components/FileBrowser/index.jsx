import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import styles from "./styles.module.css";
import Toggle from "../Toggle";
import { GridIcon, ListIcon, DownloadIcon } from "../../icons";

const TABS = [
	{ key: "all", label: "All", emoji: null },
	{ key: "folder", label: "Folders", emoji: "📁" },
	{ key: "image", label: "Images", emoji: "🖼" },
	{ key: "video", label: "Videos", emoji: "🎬" },
	{ key: "audio", label: "Audio", emoji: "🎵" },
	{ key: "document", label: "Docs", emoji: "📄" },
	{ key: "other", label: "Other", emoji: "📦" },
];

function fileIcon(item) {
	if (item.isDirectory) return "📁";
	const { category, ext } = item;
	if (category === "image") return "🖼";
	if (category === "audio") return "🎵";
	if (category === "video") return "🎬";
	if (ext === ".pdf") return "📕";
	if ([".doc", ".docx"].includes(ext)) return "📝";
	if ([".xls", ".xlsx"].includes(ext)) return "📊";
	if ([".ppt", ".pptx"].includes(ext)) return "📊";
	if ([".zip", ".rar", ".7z", ".tar", ".gz"].includes(ext)) return "🗜";
	if ([".txt", ".md"].includes(ext)) return "📄";
	return "📦";
}

function encPath(p) {
	return p.split("/").map(encodeURIComponent).join("/");
}

export default function FileBrowser({
	items,
	counts,
	loading,
	error,
	activeTab,
	onTabChange,
	viewMode,
	onViewChange,
	search,
	recursive,
	onRecursiveToggle,
	onNavigate,
	onOpenCarousel,
	onOpenViewer,
	hasMore,
	loadingMore,
	onLoadMore,
}) {
	// In recursive mode the server already filtered by category,
	// so we only need to apply search client-side.
	// In non-recursive mode we filter by tab AND search client-side.
	const filtered = useMemo(() => {
		const q = search.toLowerCase();
		return items
			.filter((i) =>
				recursive ? true : activeTab === "all" || i.category === activeTab,
			)
			.filter((i) => !q || i.name.toLowerCase().includes(q));
	}, [items, activeTab, search, recursive]);

	function handleClick(item) {
		if (item.isDirectory) {
			onNavigate(item.path);
			return;
		}
		if (item.category === "image" || item.category === "video") {
			onOpenCarousel(item);
			return;
		}
		// Audio, documents, and other — all go through FileViewer
		if (onOpenViewer) onOpenViewer(item);
	}

	// Sentinel for triggering more loads
	const sentinelRef = useRef(null);
	useEffect(() => {
		if (!onLoadMore || !hasMore) return;
		const el = sentinelRef.current;
		if (!el) return;
		const io = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) onLoadMore();
			},
			{ threshold: 0.1 },
		);
		io.observe(el);
		return () => io.disconnect();
	}, [onLoadMore, hasMore, filtered]); // re-attach when filtered list changes

	if (loading)
		return (
			<div className={styles.centered}>
				<div className={styles.spinner} />
				<span
					style={{
						fontFamily: "var(--mono)",
						fontSize: 12,
						color: "var(--muted)",
					}}
				>
					Loading…
				</span>
			</div>
		);

	if (error)
		return (
			<div className={styles.centered}>
				<div className={styles.errorBox}>⚠ {error}</div>
			</div>
		);

	return (
		<div className={styles.root}>
			{/* Tabs + view toggle */}
			<div className={styles.toolbar}>
				<div className={styles.tabs}>
					{TABS.map((t) => (
						<button
							key={t.key}
							className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ""}`}
							onClick={() => onTabChange(t.key)}
						>
							{t.emoji && <span>{t.emoji}</span>}
							{t.label}
							<span className={styles.count}>{counts[t.key] || 0}</span>
						</button>
					))}
				</div>
				<div className={styles.viewToggle}>
					<Toggle
						checked={!!recursive}
						onChange={onRecursiveToggle}
						label="All children"
						title="Show all files in subfolders recursively"
						size="sm"
					/>
					<div className={styles.divider} />
					<button
						className={`${styles.viewBtn} ${viewMode === "grid" ? styles.viewBtnActive : ""}`}
						onClick={() => onViewChange("grid")}
						title="Grid view"
					>
						<GridIcon />
					</button>
					<button
						className={`${styles.viewBtn} ${viewMode === "list" ? styles.viewBtnActive : ""}`}
						onClick={() => onViewChange("list")}
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
						<div className={styles.emptyIcon}>{search ? "🔍" : "📭"}</div>
						<p className={styles.emptyTitle}>
							{search ? "No matches" : "Empty folder"}
						</p>
						<p className={styles.emptyText}>
							{search
								? `Nothing matches "${search}"`
								: "This folder has no items"}
						</p>
					</div>
				) : viewMode === "grid" ? (
					<GridView
						items={filtered}
						activeTab={activeTab}
						onClickItem={handleClick}
					/>
				) : (
					<ListView items={filtered} onClickItem={handleClick} />
				)}
				{hasMore && <div ref={sentinelRef} className={styles.sentinel} />}
				{loadingMore && (
					<div className={styles.loadingMoreRow}>
						<div className={styles.spinner} />
					</div>
				)}
			</main>
		</div>
	);
}

// ── Grid View ─────────────────────────────────────────────────────────────────
const GROUPS = [
	{ key: "folder", label: "📁 Folders" },
	{ key: "image", label: "🖼 Images" },
	{ key: "video", label: "🎬 Videos" },
	{ key: "audio", label: "🎵 Audio" },
	{ key: "document", label: "📄 Documents" },
	{ key: "other", label: "📦 Other" },
];

function GridView({ items, activeTab, onClickItem }) {
	const groups =
		activeTab === "all"
			? GROUPS.map((g) => ({
					...g,
					items: items.filter((i) => i.category === g.key),
				})).filter((g) => g.items.length)
			: [{ key: activeTab, label: "", items }];

	return (
		<div className={styles.gridOuter}>
			{groups.map((g) => (
				<div key={g.key}>
					{activeTab === "all" && (
						<div className={styles.sectionHeader}>
							{g.label} <span>{g.items.length}</span>
						</div>
					)}
					{g.key === "image" || g.key === "video" ? (
						<VirtualMediaGrid items={g.items} onClickItem={onClickItem} />
					) : (
						<div className={styles.grid}>
							{g.items.map((item) => (
								<GridCard key={item.path} item={item} onClick={onClickItem} />
							))}
						</div>
					)}
				</div>
			))}
		</div>
	);
}

function GridCard({ item, onClick }) {
	const isMedia = item.category === "image" || item.category === "video";
	const isImage = item.category === "image";
	const isVideo = item.category === "video";

	return (
		<div
			className={`${styles.card} ${isMedia ? styles.mediaCard : ""}`}
			onClick={() => onClick(item)}
		>
			{isImage ? (
				<div className={styles.cardThumbWrap}>
					<img
						className={styles.cardThumb}
						src={`/files/${encPath(item.path)}`}
						alt={item.name}
						loading="lazy"
						onError={(e) => {
							e.target.style.display = "none";
							e.target.nextSibling.style.display = "flex";
						}}
					/>
					<div className={styles.cardIconFallback} style={{ display: "none" }}>
						{fileIcon(item)}
					</div>
				</div>
			) : isVideo ? (
				<div className={styles.cardThumbWrap}>
					<div className={styles.videoThumb}>
						<div className={styles.playBtn}>▶</div>
						<span className={styles.videoExt}>
							{item.ext.slice(1).toUpperCase()}
						</span>
					</div>
				</div>
			) : (
				<div className={styles.cardIconWrap}>{fileIcon(item)}</div>
			)}

			{!isMedia && (
				<div className={styles.cardInfo}>
					<div className={styles.cardName} title={item.name}>
						{item.name}
					</div>
					<div className={styles.cardMeta}>{item.sizeHuman || "Folder"}</div>
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
							onClick={(e) => e.stopPropagation()}
							title="Download"
						>
							<DownloadIcon size={12} strokeWidth={2.5} />
						</a>
					</div>
				</div>
			)}

			{!isMedia && !item.isDirectory && (
				<a
					className={styles.cardDl}
					href={`/files/${encPath(item.path)}?dl=1`}
					download={item.name}
					onClick={(e) => e.stopPropagation()}
					title="Download"
				>
					<DownloadIcon size={12} strokeWidth={2.5} />
				</a>
			)}
		</div>
	);
}

// ── Virtual Media Grid ───────────────────────────────────────────────────────
const MEDIA_MIN_COL = 200;
const GRID_GAP = 10;
const OVERSCAN_ROWS = 3;
const VIRTUAL_THRESHOLD = 40;

function VirtualMediaGrid({ items, onClickItem }) {
	const outerRef = useRef(null);
	const scrollElRef = useRef(null);
	const [range, setRange] = useState(() => ({
		startIdx: 0,
		endIdx: Math.min(items.length, VIRTUAL_THRESHOLD * 2),
		paddingTop: 0,
		paddingBottom: 0,
		cols: 4,
	}));

	const computeRange = useCallback(() => {
		const outer = outerRef.current;
		const scrollEl = scrollElRef.current;
		if (!outer || !scrollEl) return;

		const containerWidth = outer.getBoundingClientRect().width;
		if (containerWidth < 10) return;

		const cols = Math.max(
			1,
			Math.floor((containerWidth + GRID_GAP) / (MEDIA_MIN_COL + GRID_GAP)),
		);
		const cardWidth = (containerWidth - (cols - 1) * GRID_GAP) / cols;
		// 4:3 aspect-ratio thumb + gap between rows
		const rowH = Math.round(cardWidth * 0.75) + GRID_GAP;
		const rowCount = Math.ceil(items.length / cols);

		const { top: scrollTop, height: scrollH } =
			scrollEl.getBoundingClientRect();
		const outerTop = outer.getBoundingClientRect().top;
		// Positive value = grid top has scrolled above the scroll-container top
		const scrolledPast = scrollTop - outerTop;
		const startRow = Math.max(
			0,
			Math.floor(scrolledPast / rowH) - OVERSCAN_ROWS,
		);
		const endRow = Math.min(
			rowCount,
			startRow + Math.ceil(scrollH / rowH) + OVERSCAN_ROWS * 2,
		);

		setRange({
			startIdx: startRow * cols,
			endIdx: Math.min(items.length, endRow * cols),
			paddingTop: startRow * rowH,
			paddingBottom: Math.max(0, (rowCount - endRow) * rowH),
			cols,
		});
	}, [items.length]);

	// Find nearest scrollable ancestor, attach scroll + resize listeners
	useEffect(() => {
		const outer = outerRef.current;
		if (!outer) return;

		let scrollEl = outer.parentElement;
		while (scrollEl && scrollEl !== document.documentElement) {
			const ov = getComputedStyle(scrollEl).overflowY;
			if (ov === "auto" || ov === "scroll") break;
			scrollEl = scrollEl.parentElement;
		}
		if (!scrollEl) return;
		scrollElRef.current = scrollEl;

		const onScroll = () => computeRange();
		scrollEl.addEventListener("scroll", onScroll, { passive: true });

		const ro = new ResizeObserver(computeRange);
		ro.observe(outer);
		ro.observe(scrollEl);

		computeRange();

		return () => {
			scrollEl.removeEventListener("scroll", onScroll);
			ro.disconnect();
		};
	}, [computeRange]);

	// Re-compute when items change (e.g. search filter)
	useEffect(() => {
		computeRange();
	}, [items, computeRange]);

	const { startIdx, endIdx, paddingTop, paddingBottom, cols } = range;

	return (
		<div ref={outerRef}>
			{items.length <= VIRTUAL_THRESHOLD ? (
				<div className={`${styles.grid} ${styles.mediaGrid}`}>
					{items.map((item) => (
						<GridCard key={item.path} item={item} onClick={onClickItem} />
					))}
				</div>
			) : (
				<div style={{ paddingTop, paddingBottom }}>
					<div className={styles.virtualGrid} style={{ "--vcols": cols }}>
						{items.slice(startIdx, endIdx).map((item) => (
							<GridCard key={item.path} item={item} onClick={onClickItem} />
						))}
					</div>
				</div>
			)}
		</div>
	);
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
				{items.map((item) => (
					<tr
						key={item.path}
						className={styles.row}
						onClick={() => onClickItem(item)}
					>
						<td>
							<div className={styles.rowName}>
								<span className={styles.rowIcon}>{fileIcon(item)}</span>
								<span>{item.name}</span>
							</div>
						</td>
						<td>
							<span
								className={`${styles.pill} ${styles["pill_" + item.category]}`}
							>
								{item.category}
							</span>
						</td>
						<td className={styles.rowSize}>{item.sizeHuman || "—"}</td>
						<td className={styles.rowAction}>
							{!item.isDirectory && (
								<a
									className={styles.rowDl}
									href={`/files/${encPath(item.path)}?dl=1`}
									download={item.name}
									onClick={(e) => e.stopPropagation()}
								>
									<DownloadIcon /> Download
								</a>
							)}
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

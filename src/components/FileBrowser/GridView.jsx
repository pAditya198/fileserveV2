import { useState, useEffect, useRef, useCallback } from "react";
import { DownloadIcon } from "../../icons";
import { encPath } from "../../utils/encPath";
import { fileIcon } from "../../utils/fileIcon";
import styles from "./styles.module.css";

const GROUPS = [
	{ key: "folder", label: "📁 Folders" },
	{ key: "image", label: "🖼 Images" },
	{ key: "video", label: "🎬 Videos" },
	{ key: "audio", label: "🎵 Audio" },
	{ key: "document", label: "📄 Documents" },
	{ key: "other", label: "📦 Other" },
];

const MEDIA_MIN_COL = 200;
const GRID_GAP = 10;
const OVERSCAN_ROWS = 3;
const VIRTUAL_THRESHOLD = 40;

export function GridCard({ item, onClick }) {
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
		const rowH = Math.round(cardWidth * 0.75) + GRID_GAP;
		const rowCount = Math.ceil(items.length / cols);

		const { top: scrollTop, height: scrollH } =
			scrollEl.getBoundingClientRect();
		const outerTop = outer.getBoundingClientRect().top;
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

export default function GridView({ items, activeTab, onClickItem }) {
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

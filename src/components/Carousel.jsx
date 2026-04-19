import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./Carousel.module.css";
import Toggle from "./Toggle.jsx";

function encPath(p) {
	return p.split("/").map(encodeURIComponent).join("/");
}

const PREFETCH_AHEAD = 10;

export default function Carousel({
	items,
	startIndex,
	onClose,
	togglestate,
	toggleShowWithoutFilter,
	hasMore,
	onNearEnd,
}) {
	const [index, setIndex] = useState(startIndex);
	const [fading, setFading] = useState(false);
	const [dir, setDir] = useState(1); // 1 = forward, -1 = backward
	const videoRef = useRef(null);
	const thumbsRef = useRef(null);
	const touchX = useRef(null);
	const itemsLenRef = useRef(items.length);
	// Tracks the path of the item currently on screen so we can re-find it
	// when the items array is replaced (e.g. "All media" toggle refilters).
	const currentPathRef = useRef(items[startIndex]?.path ?? null);

	// Keep itemsLenRef current on every render (used in setTimeout)
	useEffect(() => {
		itemsLenRef.current = items.length;
	});

	// Update currentPathRef whenever the user navigates to a new item
	useEffect(() => {
		currentPathRef.current = items[index]?.path ?? null;
	}, [index]); // eslint-disable-line

	// When the items array is replaced (toggle / filter change), keep showing
	// the same item by finding its path in the new list.
	useEffect(() => {
		const path = currentPathRef.current;
		if (!path) return;
		const newIdx = items.findIndex((i) => i.path === path);
		if (newIdx !== -1) setIndex(newIdx);
	}, [items]); // eslint-disable-line

	const current = items[index];

	// Scroll active thumbnail into view
	useEffect(() => {
		if (!thumbsRef.current) return;
		const active = thumbsRef.current.querySelector('[data-active="true"]');
		if (active)
			active.scrollIntoView({
				behavior: "smooth",
				inline: "center",
				block: "nearest",
			});
	}, [index]);

	const navigate = useCallback(
		(direction) => {
			if (fading) return;
			if (videoRef.current) {
				videoRef.current.pause();
			}
			// Prefetch next page when navigating forward near the end
			if (
				direction === 1 &&
				hasMore &&
				onNearEnd &&
				index >= items.length - PREFETCH_AHEAD
			) {
				onNearEnd();
			}
			setDir(direction);
			setFading(true);
			setTimeout(() => {
				const len = itemsLenRef.current;
				setIndex((i) => {
					const next = i + direction;
					// When more pages exist, don't wrap forward past the last item
					if (next >= len) return hasMore ? len - 1 : 0;
					if (next < 0) return len - 1;
					return next;
				});
				setFading(false);
			}, 220);
		},
		[fading, index, hasMore, onNearEnd],
	);

	const jumpTo = useCallback(
		(i) => {
			if (i === index || fading) return;
			if (videoRef.current) {
				videoRef.current.pause();
			}
			setDir(i > index ? 1 : -1);
			setFading(true);
			setTimeout(() => {
				setIndex(i);
				setFading(false);
			}, 220);
		},
		[index, fading],
	);

	// Keyboard
	useEffect(() => {
		const handler = (e) => {
			if (e.key === "ArrowLeft") navigate(-1);
			if (e.key === "ArrowRight") navigate(1);
			if (e.key === "Escape") onClose();
			if (e.key === " " && videoRef.current) {
				e.preventDefault();
				videoRef.current.paused
					? videoRef.current.play()
					: videoRef.current.pause();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [navigate, onClose]);

	// Touch swipe
	const onTouchStart = (e) => {
		touchX.current = e.touches[0].clientX;
	};
	const onTouchEnd = (e) => {
		if (touchX.current === null) return;
		const diff = touchX.current - e.changedTouches[0].clientX;
		if (Math.abs(diff) > 50) navigate(diff > 0 ? 1 : -1);
		touchX.current = null;
	};

	const isVideo = current?.category === "video";
	const isImage = current?.category === "image";

	return (
		<div
			className={styles.overlay}
			onTouchStart={onTouchStart}
			onTouchEnd={onTouchEnd}
		>
			{/* Top bar */}
			<div className={styles.topBar}>
				<div className={styles.fileName}>{current?.name}</div>
				<div className={styles.counter}>
					{index + 1} / {items.length}
					{hasMore ? "+" : ""}
				</div>
				{toggleShowWithoutFilter !== undefined && (
					<Toggle
						checked={!!togglestate}
						onChange={() => toggleShowWithoutFilter(index)}
						label="All media"
						title="Show all images & videos regardless of active tab filter"
						size="sm"
					/>
				)}
				<div className={styles.topActions}>
					<a
						className={styles.topBtn}
						href={`/files/${encPath(current?.path)}`}
						download={current?.name}
						title="Download"
					>
						<DownloadIcon />
					</a>
					<button
						className={styles.topBtn}
						onClick={onClose}
						title="Close (Esc)"
					>
						<CloseIcon />
					</button>
				</div>
			</div>

			{/* Main stage */}
			<div className={styles.stage}>
				{/* Left arrow */}
				{items.length > 1 && (
					<button
						className={`${styles.arrow} ${styles.arrowLeft}`}
						onClick={() => navigate(-1)}
						aria-label="Previous"
					>
						<ChevronLeft />
					</button>
				)}

				{/* Media content */}
				<div
					className={`${styles.mediaWrap} ${fading ? (dir > 0 ? styles.fadeOutLeft : styles.fadeOutRight) : styles.fadeIn}`}
				>
					{isImage && (
						<img
							className={styles.img}
							src={`/files/${encPath(current.path)}`}
							alt={current.name}
							draggable={false}
						/>
					)}
					{isVideo && (
						<video
							key={current.path}
							ref={videoRef}
							className={styles.video}
							src={`/files/${encPath(current.path)}`}
							controls
							autoPlay
							preload="metadata"
						/>
					)}
				</div>

				{/* Right arrow */}
				{items.length > 1 && (
					<button
						className={`${styles.arrow} ${styles.arrowRight}`}
						onClick={() => navigate(1)}
						aria-label="Next"
					>
						<ChevronRight />
					</button>
				)}
			</div>

			{/* Thumbnail strip */}
			{items.length > 1 && (
				<div className={styles.thumbStrip} ref={thumbsRef}>
					{items.map((item, i) => (
						<div
							key={item.path}
							className={`${styles.thumb} ${i === index ? styles.thumbActive : ""}`}
							data-active={i === index}
							onClick={() => jumpTo(i)}
						>
							{item.category === "image" ? (
								<img
									src={`/files/${encPath(item.path)}`}
									alt={item.name}
									loading="lazy"
									draggable={false}
								/>
							) : (
								<div className={styles.thumbVideo}>▶</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function DownloadIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		>
			<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
			<polyline points="7 10 12 15 17 10" />
			<line x1="12" y1="15" x2="12" y2="3" />
		</svg>
	);
}
function CloseIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		>
			<line x1="18" y1="6" x2="6" y2="18" />
			<line x1="6" y1="6" x2="18" y2="18" />
		</svg>
	);
}
function ChevronLeft() {
	return (
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
		>
			<polyline points="15 18 9 12 15 6" />
		</svg>
	);
}
function ChevronRight() {
	return (
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
		>
			<polyline points="9 18 15 12 9 6" />
		</svg>
	);
}

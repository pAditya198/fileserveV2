import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./styles.module.css";
import TopBar from "./TopBar";
import MediaStage from "./MediaStage";
import ThumbnailStrip from "./ThumbnailStrip";

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
			<TopBar
				current={current}
				index={index}
				itemCount={items.length}
				hasMore={hasMore}
				togglestate={togglestate}
				toggleShowWithoutFilter={toggleShowWithoutFilter}
				onClose={onClose}
			/>

			<MediaStage
				current={current}
				isImage={isImage}
				isVideo={isVideo}
				fading={fading}
				dir={dir}
				videoRef={videoRef}
				navigate={navigate}
				itemsLength={items.length}
			/>

			<ThumbnailStrip
				items={items}
				index={index}
				jumpTo={jumpTo}
				thumbsRef={thumbsRef}
			/>
		</div>
	);
}

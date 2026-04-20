import { useMemo, useRef, useEffect } from "react";
import styles from "./styles.module.css";
import Toolbar from "./Toolbar";
import GridView from "./GridView";
import ListView from "./ListView";
import EmptyState from "./EmptyState";

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
	}, [onLoadMore, hasMore, filtered]);

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
			<Toolbar
				activeTab={activeTab}
				onTabChange={onTabChange}
				counts={counts}
				recursive={recursive}
				onRecursiveToggle={onRecursiveToggle}
				viewMode={viewMode}
				onViewChange={onViewChange}
			/>

			<main className={styles.main}>
				{filtered.length === 0 ? (
					<EmptyState search={search} />
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

import { useState, useEffect, useCallback, useRef } from "react";
import Header from "./components/Header.jsx";
import FileBrowser from "./components/FileBrowser.jsx";
import Carousel from "./components/Carousel.jsx";
import FileViewer from "./components/FileViewer.jsx";

const PAGE_SIZE = 200;

function getPathFromUrl() {
	return new URLSearchParams(window.location.search).get("path") || "";
}

export default function App() {
	const [currentPath, setCurrentPath] = useState(getPathFromUrl);
	const [items, setItems] = useState([]);
	const [counts, setCounts] = useState({});
	const [breadcrumb, setBreadcrumb] = useState([{ name: "Home", path: "" }]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [activeTab, setActiveTab] = useState("all");
	const [viewMode, setViewMode] = useState("grid");
	const [search, setSearch] = useState("");
	const [recursive, setRecursive] = useState(false);

	// Carousel
	const [carousel, setCarousel] = useState({
		open: false,
		items: [],
		index: 0,
	});
	const [showWithoutFilter, setShowWithoutFilter] = useState(false);

	// FileViewer
	const [viewerItem, setViewerItem] = useState(null);

	// Pagination
	const [hasMore, setHasMore] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	// Stable refs so loadMore callback never goes stale
	const hasMoreRef = useRef(false);
	const loadingMoreRef = useRef(false);
	const currentPathRef = useRef("");
	const recursiveRef = useRef(false);
	const activeTabRef = useRef("all");
	const itemsLenRef = useRef(0);

	// Avoid double-load on mount for the tab-change effect
	const hasMounted = useRef(false);
	const isInitialLoad = useRef(true);

	// ── Core loader ─────────────────────────────────────────────────────────────
	// opts: { recursive?: bool, category?: string }
	// When recursive is on, category is passed to the server so it filters there.
	// When recursive is off, category is omitted — client does the filtering.
	const loadDir = useCallback(
		async (dirPath, opts = {}) => {
			const useRecursive =
				opts.recursive !== undefined ? opts.recursive : recursive;
			// In recursive mode use the passed category or the currently active tab
			const useCategory = useRecursive
				? opts.category !== undefined
					? opts.category
					: activeTab
				: null;

			setLoading(true);
			setError(null);
			setSearch("");

			try {
				let url = `/api/files?path=${encodeURIComponent(dirPath)}&recursive=${useRecursive}&offset=0&limit=${PAGE_SIZE}`;
				if (useCategory && useCategory !== "all")
					url += `&category=${encodeURIComponent(useCategory)}`;

				const res = await fetch(url);
				const data = await res.json();
				if (data.error) throw new Error(data.error);

				setItems(data.items);
				setCounts(data.counts || {});
				setBreadcrumb(data.breadcrumb);
				setCurrentPath(dirPath);
				currentPathRef.current = dirPath;
				const more = data.items.length < (data.total ?? data.items.length);
				setHasMore(more);
				hasMoreRef.current = more;
				itemsLenRef.current = data.items.length;

				// Sync URL
				if (!opts.skipHistory) {
					const newUrl = new URL(window.location.href);
					if (dirPath) {
						newUrl.searchParams.set("path", dirPath);
					} else {
						newUrl.searchParams.delete("path");
					}
					if (isInitialLoad.current) {
						window.history.replaceState({ path: dirPath }, "", newUrl);
						isInitialLoad.current = false;
					} else {
						window.history.pushState({ path: dirPath }, "", newUrl);
					}
				}
			} catch (e) {
				setError(e.message);
			} finally {
				setLoading(false);
			}
		},
		[recursive, activeTab],
	);

	// Initial load — use path from URL if present
	useEffect(() => {
		loadDir(getPathFromUrl());
	}, []); // eslint-disable-line

	// Keep refs in sync with state for use in loadMore
	useEffect(() => {
		recursiveRef.current = recursive;
	}, [recursive]);
	useEffect(() => {
		activeTabRef.current = activeTab;
	}, [activeTab]);

	// Browser back / forward
	useEffect(() => {
		const handlePopState = (e) => {
			const path = e.state?.path ?? getPathFromUrl();
			loadDir(path, { skipHistory: true });
		};
		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, [loadDir]);

	// ── Load more (pagination) ───────────────────────────────────────────────────
	const loadMore = useCallback(async () => {
		if (loadingMoreRef.current || !hasMoreRef.current) return;
		loadingMoreRef.current = true;
		setLoadingMore(true);
		try {
			const dirPath = currentPathRef.current;
			const useRecursive = recursiveRef.current;
			const tab = activeTabRef.current;
			const offset = itemsLenRef.current;
			const useCategory = useRecursive && tab !== "all" ? tab : null;

			let url = `/api/files?path=${encodeURIComponent(dirPath)}&recursive=${useRecursive}&offset=${offset}&limit=${PAGE_SIZE}`;
			if (useCategory) url += `&category=${encodeURIComponent(useCategory)}`;

			const res = await fetch(url);
			const data = await res.json();
			if (data.error) throw new Error(data.error);

			setItems((prev) => {
				const next = [...prev, ...data.items];
				itemsLenRef.current = next.length;
				const more = next.length < (data.total ?? next.length);
				hasMoreRef.current = more;
				setHasMore(more);
				return next;
			});
		} catch {
			// silently ignore load-more errors
		} finally {
			loadingMoreRef.current = false;
			setLoadingMore(false);
		}
	}, []);

	// Reload when tab changes IF recursive is active (server needs to re-filter)
	useEffect(() => {
		if (!hasMounted.current) {
			hasMounted.current = true;
			return;
		}
		if (recursive)
			loadDir(currentPath, { recursive: true, category: activeTab });
	}, [activeTab]); // eslint-disable-line

	// ── Toggles ─────────────────────────────────────────────────────────────────
	const handleRecursiveToggle = useCallback(
		(val) => {
			setRecursive(val);
			loadDir(currentPath, {
				recursive: val,
				category: val ? activeTab : null,
			});
		},
		[currentPath, activeTab, loadDir],
	);

	const handleTabChange = useCallback((tab) => {
		setActiveTab(tab);
		// If recursive, the useEffect above handles the reload.
		// If not recursive, client-side filter — no reload needed.
	}, []);

	// ── Carousel ─────────────────────────────────────────────────────────────────
	// When loadMore appends items, mirror new media entries into the open carousel
	useEffect(() => {
		if (!carousel.open) return;
		const filterCategory =
			activeTab === "all" || showWithoutFilter
				? ["image", "video"]
				: [activeTab];
		const allMedia = items.filter(
			(i) => i.category && filterCategory.includes(i.category),
		);
		if (allMedia.length > carousel.items.length) {
			setCarousel((c) => ({ ...c, items: allMedia }));
		}
	}, [items]); // eslint-disable-line

	const openCarousel = useCallback(
		(clickedItem) => {
			const filterCategory =
				activeTab === "all" || showWithoutFilter
					? ["image", "video"]
					: [activeTab];
			const mediaItems = items.filter(
				(i) => i.category && filterCategory.includes(i.category),
			);
			const startIndex = mediaItems.findIndex(
				(i) => i.path === clickedItem.path,
			);
			setCarousel({
				open: true,
				items: mediaItems,
				index: Math.max(0, startIndex),
			});
		},
		[items, activeTab, showWithoutFilter],
	);

	const closeCarousel = useCallback(
		() => setCarousel((c) => ({ ...c, open: false })),
		[],
	);

	const resetCarousel = useCallback(
		(prevItemIndex, nextWithoutFilter) => {
			const clickedItem = carousel.items[prevItemIndex];
			const filterCategory =
				activeTab === "all" || nextWithoutFilter
					? ["image", "video"]
					: [activeTab];
			const mediaItems = items.filter(
				(i) => i.category && filterCategory.includes(i.category),
			);
			const startIndex = mediaItems.findIndex(
				(i) => i.path === clickedItem.path,
			);
			setCarousel({
				open: true,
				items: mediaItems,
				index: Math.max(0, startIndex),
			});
		},
		[items, activeTab, carousel],
	);

	const handleToggleShowWithoutFilter = useCallback(
		async (currentIndex) => {
			const next = !showWithoutFilter;
			setShowWithoutFilter(next);

			if (next && recursive && activeTab !== "all") {
				// Recursive + single-category tab: items only has one category.
				// Fetch images and videos in parallel (server accepts one category at a
				// time) then merge so the carousel can show all media.
				const clickedItem = carousel.items[currentIndex];
				try {
					const base =
						`/api/files?path=${encodeURIComponent(currentPath)}` +
						`&recursive=true&offset=0&limit=${PAGE_SIZE}&category=image,video`;
					const data = await fetch(base).then((r) => r.json());
					if (data.error) throw new Error(data.error);
					const allMedia = data.items || [];
					const startIndex = allMedia.findIndex(
						(i) => i.path === clickedItem?.path,
					);
					setCarousel({
						open: true,
						items: allMedia,
						index: Math.max(0, startIndex),
					});
				} catch {
					// fall back to what's already loaded
					resetCarousel(currentIndex, next);
				}
			} else {
				resetCarousel(currentIndex, next);
			}
		},
		[
			showWithoutFilter,
			recursive,
			activeTab,
			currentPath,
			carousel,
			resetCarousel,
		],
	);

	// ── FileViewer ───────────────────────────────────────────────────────────────
	const openViewer = useCallback((item) => setViewerItem(item), []);
	const closeViewer = useCallback(() => setViewerItem(null), []);

	// ── Unzip ────────────────────────────────────────────────────────────────────
	const handleUnzip = useCallback(
		async (item) => {
			const res = await fetch("/api/unzip", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ filePath: item.path }),
			});
			const data = await res.json();
			if (data.error) throw new Error(data.error);
			// Close viewer and navigate into the extracted folder
			setViewerItem(null);
			loadDir(data.extractedPath);
			return data;
		},
		[loadDir],
	);

	return (
		<>
			<Header
				breadcrumb={breadcrumb}
				onNavigate={loadDir}
				search={search}
				onSearch={setSearch}
			/>
			<FileBrowser
				items={items}
				counts={counts}
				loading={loading}
				error={error}
				activeTab={activeTab}
				onTabChange={handleTabChange}
				viewMode={viewMode}
				onViewChange={setViewMode}
				search={search}
				recursive={recursive}
				onRecursiveToggle={handleRecursiveToggle}
				onNavigate={loadDir}
				onOpenCarousel={openCarousel}
				onOpenViewer={openViewer}
				hasMore={hasMore}
				loadingMore={loadingMore}
				onLoadMore={loadMore}
			/>
			{carousel.open && (
				<Carousel
					items={carousel.items}
					startIndex={carousel.index}
					onClose={closeCarousel}
					togglestate={showWithoutFilter}
					toggleShowWithoutFilter={handleToggleShowWithoutFilter}
					hasMore={hasMore}
					onNearEnd={loadMore}
				/>
			)}
			{viewerItem && (
				<FileViewer
					item={viewerItem}
					onClose={closeViewer}
					onUnzip={handleUnzip}
				/>
			)}
		</>
	);
}

import { useState, useEffect, useCallback, useRef } from "react";
import Header from "./components/Header.jsx";
import FileBrowser from "./components/FileBrowser.jsx";
import Carousel from "./components/Carousel.jsx";
import FileViewer from "./components/FileViewer.jsx";

export default function App() {
	const [currentPath, setCurrentPath] = useState("");
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

	// Avoid double-load on mount for the tab-change effect
	const hasMounted = useRef(false);

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
				let url = `/api/files?path=${encodeURIComponent(dirPath)}&recursive=${useRecursive}`;
				if (useCategory && useCategory !== "all")
					url += `&category=${encodeURIComponent(useCategory)}`;

				const res = await fetch(url);
				const data = await res.json();
				if (data.error) throw new Error(data.error);

				setItems(data.items);
				setCounts(data.counts || {});
				setBreadcrumb(data.breadcrumb);
				setCurrentPath(dirPath);
			} catch (e) {
				setError(e.message);
			} finally {
				setLoading(false);
			}
		},
		[recursive, activeTab],
	);

	// Initial load
	useEffect(() => {
		loadDir("");
	}, []); // eslint-disable-line

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
		(currentIndex) => {
			setShowWithoutFilter((prev) => {
				const next = !prev;
				resetCarousel(currentIndex, next);
				return next;
			});
		},
		[resetCarousel],
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
			/>
			{carousel.open && (
				<Carousel
					items={carousel.items}
					startIndex={carousel.index}
					onClose={closeCarousel}
					togglestate={showWithoutFilter}
					toggleShowWithoutFilter={handleToggleShowWithoutFilter}
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

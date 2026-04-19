import { useState, useEffect, useCallback } from "react";
import Header from "./components/Header.jsx";
import FileBrowser from "./components/FileBrowser.jsx";
import Carousel from "./components/Carousel.jsx";
import FileViewer from "./components/FileViewer.jsx";

export default function App() {
	const [currentPath, setCurrentPath] = useState("");
	const [items, setItems] = useState([]);
	const [breadcrumb, setBreadcrumb] = useState([{ name: "Home", path: "" }]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [activeTab, setActiveTab] = useState("all");
	const [viewMode, setViewMode] = useState("grid");
	const [search, setSearch] = useState("");
	const [recursive, setRecursive] = useState(false);

	// Carousel state
	const [carousel, setCarousel] = useState({
		open: false,
		items: [],
		index: 0,
	});
	const [showWithoutFilter, setShowWithoutFilter] = useState(false);

	// FileViewer state
	const [viewerItem, setViewerItem] = useState(null);

	// Load directory
	const loadDir = useCallback(
		async (dirPath, isRecursive) => {
			const useRecursive = isRecursive !== undefined ? isRecursive : recursive;
			setLoading(true);
			setError(null);
			setSearch("");
			try {
				const url = `/api/files?path=${encodeURIComponent(dirPath)}&recursive=${useRecursive}`;
				const res = await fetch(url);
				const data = await res.json();
				if (data.error) throw new Error(data.error);
				setItems(data.items);
				setBreadcrumb(data.breadcrumb);
				setCurrentPath(dirPath);
			} catch (e) {
				setError(e.message);
			} finally {
				setLoading(false);
			}
		},
		[recursive],
	);

	useEffect(() => {
		loadDir("");
	}, []); // eslint-disable-line

	const handleRecursiveToggle = useCallback(
		(val) => {
			setRecursive(val);
			loadDir(currentPath, val);
		},
		[currentPath, loadDir],
	);

	// Carousel
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

	const closeCarousel = useCallback(() => {
		setCarousel((c) => ({ ...c, open: false }));
	}, []);

	const resetCarousel = useCallback(
		(prevItemIndex, nextShowWithoutFilter) => {
			const clickedItem = carousel.items[prevItemIndex];
			const filterCategory =
				activeTab === "all" || nextShowWithoutFilter
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

	// FileViewer
	const openViewer = useCallback((item) => setViewerItem(item), []);
	const closeViewer = useCallback(() => setViewerItem(null), []);

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
				loading={loading}
				error={error}
				activeTab={activeTab}
				onTabChange={setActiveTab}
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
			{viewerItem && <FileViewer item={viewerItem} onClose={closeViewer} />}
		</>
	);
}

import { useState, useEffect, useCallback } from "react";
import Header from "./components/Header.jsx";
import FileBrowser from "./components/FileBrowser.jsx";
import Carousel from "./components/Carousel.jsx";

export default function App() {
  const [currentPath, setCurrentPath] = useState("");
  const [items, setItems] = useState([]);
  const [breadcrumb, setBreadcrumb] = useState([{ name: "Home", path: "" }]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [search, setSearch] = useState("");
  const [carousel, setCarousel] = useState({
    open: false,
    items: [],
    index: 0,
  });
  const [showWithoutFilter, setShowWithoutFilter] = useState(true);

  const loadDir = useCallback(async (dirPath) => {
    setLoading(true);
    setError(null);
    setSearch("");
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(dirPath)}`);
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
  }, []);

  useEffect(() => {
    loadDir("");
  }, [loadDir]);

  const resetCarousel = useCallback(
    (prevItemIndex, showWithoutFilter) => {
      const clickedItem = carousel.items[prevItemIndex];
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
    [items, activeTab, carousel],
  );

  // Build the media items list (images + videos) for carousel
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
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearch("");
  };

  const closeCarousel = useCallback(() => {
    setCarousel((c) => ({ ...c, open: false }));
  }, []);

  const handleToggleShowWithoutFilter = (index) => {
    setShowWithoutFilter((prev) => {
      resetCarousel(index, !prev);
      return !prev;
    });
  };

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
        onTabChange={handleTabChange}
        viewMode={viewMode}
        onViewChange={setViewMode}
        search={search}
        onNavigate={loadDir}
        onOpenCarousel={openCarousel}
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
    </>
  );
}

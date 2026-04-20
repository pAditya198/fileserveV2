import Toggle from "../Toggle";
import { GridIcon, ListIcon } from "../../icons";
import styles from "./styles.module.css";

const TABS = [
	{ key: "all", label: "All", emoji: null },
	{ key: "folder", label: "Folders", emoji: "📁" },
	{ key: "image", label: "Images", emoji: "🖼" },
	{ key: "video", label: "Videos", emoji: "🎬" },
	{ key: "audio", label: "Audio", emoji: "🎵" },
	{ key: "document", label: "Docs", emoji: "📄" },
	{ key: "other", label: "Other", emoji: "📦" },
];

export default function Toolbar({
	activeTab,
	onTabChange,
	counts,
	recursive,
	onRecursiveToggle,
	viewMode,
	onViewChange,
}) {
	return (
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
	);
}

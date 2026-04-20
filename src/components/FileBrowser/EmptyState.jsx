import styles from "./styles.module.css";

export default function EmptyState({ search }) {
	return (
		<div className={styles.empty}>
			<div className={styles.emptyIcon}>{search ? "🔍" : "📭"}</div>
			<p className={styles.emptyTitle}>
				{search ? "No matches" : "Empty folder"}
			</p>
			<p className={styles.emptyText}>
				{search ? `Nothing matches "${search}"` : "This folder has no items"}
			</p>
		</div>
	);
}

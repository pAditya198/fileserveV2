import styles from "./styles.module.css";
import { SearchIcon } from "../../icons";

export default function Header({ breadcrumb, onNavigate, search, onSearch }) {
	return (
		<header className={styles.header}>
			<div className={styles.logo}>
				<span className={styles.logoMark}>⬡</span>
				<span className={styles.logoText}>FileServe</span>
			</div>

			<nav className={styles.breadcrumb}>
				{breadcrumb.map((crumb, i) => {
					const isLast = i === breadcrumb.length - 1;
					return (
						<span key={crumb.path} className={styles.crumbGroup}>
							{i > 0 && <span className={styles.sep}>/</span>}
							<button
								className={`${styles.crumb} ${isLast ? styles.crumbActive : ""}`}
								onClick={() => !isLast && onNavigate(crumb.path)}
								disabled={isLast}
							>
								{crumb.name}
							</button>
						</span>
					);
				})}
			</nav>

			<div className={styles.searchWrap}>
				<SearchIcon className={styles.searchIcon} />
				<input
					type="text"
					className={styles.search}
					placeholder="Filter files…"
					value={search}
					onChange={(e) => onSearch(e.target.value)}
				/>
				{search && (
					<button className={styles.clearBtn} onClick={() => onSearch("")}>
						✕
					</button>
				)}
			</div>
		</header>
	);
}

import Toggle from "../Toggle";
import { DownloadIcon, CloseIcon } from "../../icons";
import { encPath } from "../../utils/encPath";
import styles from "./styles.module.css";

export default function TopBar({
	current,
	index,
	itemCount,
	hasMore,
	togglestate,
	toggleShowWithoutFilter,
	onClose,
}) {
	return (
		<div className={styles.topBar}>
			<div className={styles.fileName}>{current?.name}</div>
			<div className={styles.counter}>
				{index + 1} / {itemCount}
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
				<button className={styles.topBtn} onClick={onClose} title="Close (Esc)">
					<CloseIcon />
				</button>
			</div>
		</div>
	);
}

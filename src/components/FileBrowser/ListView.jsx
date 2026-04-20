import { DownloadIcon } from "../../icons";
import { encPath } from "../../utils/encPath";
import { fileIcon } from "../../utils/fileIcon";
import styles from "./styles.module.css";

export default function ListView({ items, onClickItem }) {
	return (
		<table className={styles.table}>
			<thead>
				<tr>
					<th>Name</th>
					<th>Type</th>
					<th>Size</th>
					<th />
				</tr>
			</thead>
			<tbody>
				{items.map((item) => (
					<tr
						key={item.path}
						className={styles.row}
						onClick={() => onClickItem(item)}
					>
						<td>
							<div className={styles.rowName}>
								<span className={styles.rowIcon}>{fileIcon(item)}</span>
								<span>{item.name}</span>
							</div>
						</td>
						<td>
							<span
								className={`${styles.pill} ${styles["pill_" + item.category]}`}
							>
								{item.category}
							</span>
						</td>
						<td className={styles.rowSize}>{item.sizeHuman || "—"}</td>
						<td className={styles.rowAction}>
							{!item.isDirectory && (
								<a
									className={styles.rowDl}
									href={`/files/${encPath(item.path)}?dl=1`}
									download={item.name}
									onClick={(e) => e.stopPropagation()}
								>
									<DownloadIcon /> Download
								</a>
							)}
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

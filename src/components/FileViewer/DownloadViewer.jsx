import { DownloadIcon } from "../../icons";
import { fileIcon } from "../../utils/fileIcon";
import styles from "./styles.module.css";

export default function DownloadViewer({ item, fileUrl }) {
	return (
		<div className={styles.unsupported}>
			<div className={styles.unsupportedIcon}>{fileIcon(item)}</div>
			<h3>Preview not available</h3>
			<p>This file type can't be displayed in the browser.</p>
			<a
				className={`${styles.btn} ${styles.btnPrimary}`}
				href={`${fileUrl}?dl=1`}
				download={item.name}
			>
				<DownloadIcon /> Download file
			</a>
		</div>
	);
}

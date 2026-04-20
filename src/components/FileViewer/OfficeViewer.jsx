import { DownloadIcon } from "../../icons";
import { fileIcon } from "../../utils/fileIcon";
import styles from "./styles.module.css";

export default function OfficeViewer({ item, fileUrl }) {
	return (
		<div className={styles.unsupported}>
			<div className={styles.unsupportedIcon}>{fileIcon(item)}</div>
			<h3>Office files can't be previewed in the browser</h3>
			<p>Download the file to open it in your Office application.</p>
			<a
				className={`${styles.btn} ${styles.btnPrimary}`}
				href={`${fileUrl}?dl=1`}
				download={item.name}
			>
				<DownloadIcon /> Download {item.ext.slice(1).toUpperCase()}
			</a>
		</div>
	);
}

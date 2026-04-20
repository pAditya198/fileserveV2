import { DownloadIcon } from "../../icons";
import { fileIcon } from "../../utils/fileIcon";
import styles from "./styles.module.css";

export default function ViewerHeader({ item, fileUrl, onClose }) {
	return (
		<div className={styles.header}>
			<div className={styles.fileInfo}>
				<span className={styles.fileIcon}>{fileIcon(item)}</span>
				<div>
					<div className={styles.fileName}>{item.name}</div>
					<div className={styles.fileMeta}>
						{item.sizeHuman} · {item.ext.slice(1).toUpperCase()}
					</div>
				</div>
			</div>
			<div className={styles.actions}>
				<a
					className={styles.btn}
					href={`${fileUrl}?dl=1`}
					download={item.name}
					title="Download"
				>
					<DownloadIcon /> Download
				</a>
				<button
					className={styles.closeBtn}
					onClick={onClose}
					title="Close (Esc)"
				>
					✕
				</button>
			</div>
		</div>
	);
}

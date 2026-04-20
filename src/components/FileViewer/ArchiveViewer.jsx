import { DownloadIcon, ExtractIcon } from "../../icons";
import { fileIcon } from "../../utils/fileIcon";
import styles from "./styles.module.css";

export default function ArchiveViewer({
	item,
	fileUrl,
	canExtract,
	extractState,
	extractError,
	extractedName,
	onExtract,
}) {
	return (
		<div className={styles.unsupported}>
			<div className={styles.unsupportedIcon}>{fileIcon(item)}</div>
			<h3>{item.name}</h3>
			<p className={styles.archiveSub}>
				{item.sizeHuman} · {item.ext.slice(1).toUpperCase()} archive
			</p>

			{canExtract && extractState === "idle" && (
				<div className={styles.extractRow}>
					<button
						className={`${styles.btn} ${styles.btnExtract}`}
						onClick={onExtract}
					>
						<ExtractIcon /> Extract here
					</button>
					<span className={styles.extractHint}>
						Creates a <code>{item.name.replace(/\.zip$/i, "")}_extracted</code>{" "}
						folder next to this file
					</span>
				</div>
			)}

			{canExtract && extractState === "loading" && (
				<div className={styles.extractStatus}>
					<div className={styles.spinner} />
					<span>Extracting…</span>
				</div>
			)}

			{canExtract && extractState === "done" && (
				<div className={`${styles.extractStatus} ${styles.extractDone}`}>
					✓ Extracted to <strong>{extractedName}</strong> — navigating there…
				</div>
			)}

			{canExtract && extractState === "error" && (
				<div className={styles.extractStatus}>
					<div className={styles.errorMsg}>⚠ {extractError}</div>
					<button
						className={`${styles.btn} ${styles.btnExtract}`}
						onClick={onExtract}
					>
						<ExtractIcon /> Retry
					</button>
				</div>
			)}

			{!canExtract && (
				<p className={styles.extractUnsupported}>
					Only <code>.zip</code> files can be extracted. For{" "}
					<code>{item.ext}</code> files, download and use your system's archive
					tool.
				</p>
			)}

			<a
				className={styles.btn}
				href={`${fileUrl}?dl=1`}
				download={item.name}
				style={{ marginTop: 8 }}
			>
				<DownloadIcon /> Download archive
			</a>
		</div>
	);
}

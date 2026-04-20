import { useState, useEffect } from "react";
import styles from "./styles.module.css";
import { DownloadIcon, ExtractIcon } from "../../icons";

function encPath(p) {
	return p.split("/").map(encodeURIComponent).join("/");
}

const TEXT_EXTS = new Set([
	".txt",
	".md",
	".json",
	".xml",
	".csv",
	".js",
	".jsx",
	".ts",
	".tsx",
	".css",
	".html",
	".yml",
	".yaml",
	".log",
	".sh",
	".bat",
	".env",
	".ini",
	".toml",
]);
const PDF_EXT = ".pdf";
const OFFICE_EXTS = new Set([
	".doc",
	".docx",
	".xls",
	".xlsx",
	".ppt",
	".pptx",
]);
const ARCHIVE_EXTS = new Set([".zip", ".rar", ".7z", ".tar", ".gz"]);
const AUDIO_EXTS = new Set([
	".mp3",
	".wav",
	".flac",
	".ogg",
	".aac",
	".m4a",
	".wma",
	".opus",
	".aiff",
]);
const ZIP_ONLY = new Set([".zip"]); // only .zip can be extracted via adm-zip

function viewerType(ext) {
	if (ext === PDF_EXT) return "pdf";
	if (AUDIO_EXTS.has(ext)) return "audio";
	if (TEXT_EXTS.has(ext)) return "text";
	if (OFFICE_EXTS.has(ext)) return "office";
	if (ARCHIVE_EXTS.has(ext)) return "archive";
	return "download";
}

// Extract states: 'idle' | 'loading' | 'done' | 'error'
export default function FileViewer({ item, onClose, onUnzip }) {
	const [textContent, setTextContent] = useState(null);
	const [textError, setTextError] = useState(null);
	const [textLoading, setTextLoading] = useState(false);
	const [extractState, setExtractState] = useState("idle"); // archive extract
	const [extractError, setExtractError] = useState(null);
	const [extractedName, setExtractedName] = useState(null);

	const type = viewerType(item.ext);
	const fileUrl = `/files/${encPath(item.path)}`;

	// Fetch text content
	useEffect(() => {
		if (type !== "text") return;
		setTextLoading(true);
		fetch(fileUrl)
			.then((r) => r.text())
			.then((t) => {
				setTextContent(t);
				setTextLoading(false);
			})
			.catch((e) => {
				setTextError(e.message);
				setTextLoading(false);
			});
	}, [fileUrl, type]);

	// Keyboard: Escape closes
	useEffect(() => {
		const h = (e) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", h);
		return () => window.removeEventListener("keydown", h);
	}, [onClose]);

	async function handleExtract() {
		if (!onUnzip || extractState === "loading") return;
		setExtractState("loading");
		setExtractError(null);
		try {
			const data = await onUnzip(item);
			setExtractedName(data.folderName);
			setExtractState("done");
			// onUnzip already navigates — modal will close via onClose from App
		} catch (e) {
			setExtractError(e.message);
			setExtractState("error");
		}
	}

	const canExtract = ZIP_ONLY.has(item.ext) && !!onUnzip;

	return (
		<div
			className={styles.overlay}
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div className={styles.modal}>
				{/* Header */}
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

				{/* Body */}
				<div className={styles.body}>
					{/* ── PDF ── */}
					{type === "pdf" && (
						<iframe
							className={styles.pdfFrame}
							src={fileUrl}
							title={item.name}
						/>
					)}

					{/* ── Audio ── */}
					{type === "audio" && (
						<div className={styles.audioWrap}>
							<div className={styles.audioArt}>
								<div className={styles.audioWave}>
									{Array.from({ length: 28 }).map((_, i) => (
										<div
											key={i}
											className={styles.audioBar}
											style={{ animationDelay: `${(i * 0.07).toFixed(2)}s` }}
										/>
									))}
								</div>
								<span className={styles.audioEmoji}>🎵</span>
							</div>
							<div className={styles.audioMeta}>
								<div className={styles.audioTitle}>{item.name}</div>
								<div className={styles.audioSub}>
									{item.ext.slice(1).toUpperCase()} · {item.sizeHuman}
								</div>
							</div>
							<audio
								className={styles.audioPlayer}
								src={fileUrl}
								controls
								autoPlay
								preload="metadata"
							/>
						</div>
					)}

					{/* ── Text / Code ── */}
					{type === "text" &&
						(textLoading ? (
							<div className={styles.centered}>
								<div className={styles.spinner} />
							</div>
						) : textError ? (
							<div className={styles.errorMsg}>⚠ {textError}</div>
						) : (
							<pre className={styles.textContent}>{textContent}</pre>
						))}

					{/* ── Office ── */}
					{type === "office" && (
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
					)}

					{/* ── Archive ── */}
					{type === "archive" && (
						<div className={styles.unsupported}>
							<div className={styles.unsupportedIcon}>{fileIcon(item)}</div>
							<h3>{item.name}</h3>
							<p className={styles.archiveSub}>
								{item.sizeHuman} · {item.ext.slice(1).toUpperCase()} archive
							</p>

							{/* Extract action — only for .zip */}
							{canExtract && extractState === "idle" && (
								<div className={styles.extractRow}>
									<button
										className={`${styles.btn} ${styles.btnExtract}`}
										onClick={handleExtract}
									>
										<ExtractIcon /> Extract here
									</button>
									<span className={styles.extractHint}>
										Creates a{" "}
										<code>{item.name.replace(/\.zip$/i, "")}_extracted</code>{" "}
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
								<div
									className={`${styles.extractStatus} ${styles.extractDone}`}
								>
									✓ Extracted to <strong>{extractedName}</strong> — navigating
									there…
								</div>
							)}

							{canExtract && extractState === "error" && (
								<div className={styles.extractStatus}>
									<div className={styles.errorMsg}>⚠ {extractError}</div>
									<button
										className={`${styles.btn} ${styles.btnExtract}`}
										onClick={handleExtract}
									>
										<ExtractIcon /> Retry
									</button>
								</div>
							)}

							{!canExtract && (
								<p className={styles.extractUnsupported}>
									Only <code>.zip</code> files can be extracted. For{" "}
									<code>{item.ext}</code> files, download and use your system's
									archive tool.
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
					)}

					{/* ── Unknown / fallback ── */}
					{type === "download" && (
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
					)}
				</div>
			</div>
		</div>
	);
}

function fileIcon(item) {
	const ext = item.ext;
	if (AUDIO_EXTS.has(ext)) return "🎵";
	if (ext === ".pdf") return "📕";
	if ([".doc", ".docx"].includes(ext)) return "📝";
	if ([".xls", ".xlsx"].includes(ext)) return "📊";
	if ([".ppt", ".pptx"].includes(ext)) return "📊";
	if ([".zip", ".rar", ".7z", ".tar", ".gz"].includes(ext)) return "🗜";
	if ([".txt", ".md"].includes(ext)) return "📄";
	if ([".json", ".xml", ".csv"].includes(ext)) return "🗒";
	return "📦";
}

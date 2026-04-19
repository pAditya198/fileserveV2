import { useState, useEffect } from "react";
import styles from "./FileViewer.module.css";

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

function viewerType(ext) {
	if (ext === PDF_EXT) return "pdf";
	if (AUDIO_EXTS.has(ext)) return "audio";
	if (TEXT_EXTS.has(ext)) return "text";
	if (OFFICE_EXTS.has(ext)) return "office";
	if (ARCHIVE_EXTS.has(ext)) return "archive";
	return "download";
}

export default function FileViewer({ item, onClose }) {
	const [textContent, setTextContent] = useState(null);
	const [textError, setTextError] = useState(null);
	const [loading, setLoading] = useState(false);

	const type = viewerType(item.ext);
	const fileUrl = `/files/${encPath(item.path)}`;

	useEffect(() => {
		if (type !== "text") return;
		setLoading(true);
		fetch(fileUrl)
			.then((r) => r.text())
			.then((t) => {
				setTextContent(t);
				setLoading(false);
			})
			.catch((e) => {
				setTextError(e.message);
				setLoading(false);
			});
	}, [fileUrl, type]);

	// Close on Escape
	useEffect(() => {
		const h = (e) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", h);
		return () => window.removeEventListener("keydown", h);
	}, [onClose]);

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
						<button className={styles.closeBtn} onClick={onClose} title="Close">
							✕
						</button>
					</div>
				</div>

				{/* Body */}
				<div className={styles.body}>
					{type === "pdf" && (
						<iframe
							className={styles.pdfFrame}
							src={fileUrl}
							title={item.name}
						/>
					)}

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
					{loading ? (
						<div className={styles.centered}>
							<div className={styles.spinner} />
						</div>
					) : textError ? (
						<div className={styles.errorMsg}>⚠ {textError}</div>
					) : (
						<pre className={styles.textContent}>{textContent}</pre>
					)}

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

					{type === "archive" && (
						<div className={styles.unsupported}>
							<div className={styles.unsupportedIcon}>{fileIcon(item)}</div>
							<h3>Archive preview not supported</h3>
							<p>Download and extract this archive to view its contents.</p>
							<a
								className={`${styles.btn} ${styles.btnPrimary}`}
								href={`${fileUrl}?dl=1`}
								download={item.name}
							>
								<DownloadIcon /> Download {item.name}
							</a>
						</div>
					)}

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

function DownloadIcon() {
	return (
		<svg
			width="13"
			height="13"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
		>
			<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
			<polyline points="7 10 12 15 17 10" />
			<line x1="12" y1="15" x2="12" y2="3" />
		</svg>
	);
}

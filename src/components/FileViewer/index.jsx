import { useState, useEffect } from "react";
import styles from "./styles.module.css";
import { encPath } from "../../utils/encPath";
import ViewerHeader from "./ViewerHeader";
import PdfViewer from "./PdfViewer";
import AudioViewer from "./AudioViewer";
import TextViewer from "./TextViewer";
import OfficeViewer from "./OfficeViewer";
import ArchiveViewer from "./ArchiveViewer";
import DownloadViewer from "./DownloadViewer";

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
const ZIP_ONLY = new Set([".zip"]);

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
	const [extractState, setExtractState] = useState("idle");
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
				<ViewerHeader item={item} fileUrl={fileUrl} onClose={onClose} />

				<div className={styles.body}>
					{type === "pdf" && <PdfViewer fileUrl={fileUrl} item={item} />}

					{type === "audio" && <AudioViewer item={item} fileUrl={fileUrl} />}

					{type === "text" && (
						<TextViewer
							textLoading={textLoading}
							textError={textError}
							textContent={textContent}
						/>
					)}

					{type === "office" && <OfficeViewer item={item} fileUrl={fileUrl} />}

					{type === "archive" && (
						<ArchiveViewer
							item={item}
							fileUrl={fileUrl}
							canExtract={canExtract}
							extractState={extractState}
							extractError={extractError}
							extractedName={extractedName}
							onExtract={handleExtract}
						/>
					)}

					{type === "download" && (
						<DownloadViewer item={item} fileUrl={fileUrl} />
					)}
				</div>
			</div>
		</div>
	);
}

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

export function fileIcon(item) {
  if (item.isDirectory) return "📁";
  const { category, ext } = item;
  if (category === "image") return "🖼";
  if (category === "video") return "🎬";
  if (category === "audio" || AUDIO_EXTS.has(ext)) return "🎵";
  if (ext === ".pdf") return "📕";
  if ([".doc", ".docx"].includes(ext)) return "📝";
  if ([".xls", ".xlsx"].includes(ext)) return "📊";
  if ([".ppt", ".pptx"].includes(ext)) return "📊";
  if ([".zip", ".rar", ".7z", ".tar", ".gz"].includes(ext)) return "🗜";
  if ([".txt", ".md"].includes(ext)) return "📄";
  if ([".json", ".xml", ".csv"].includes(ext)) return "🗒";
  return "📦";
}

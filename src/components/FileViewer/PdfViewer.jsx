import styles from "./styles.module.css";

export default function PdfViewer({ fileUrl, item }) {
	return <iframe className={styles.pdfFrame} src={fileUrl} title={item.name} />;
}

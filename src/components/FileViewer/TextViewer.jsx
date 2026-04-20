import styles from "./styles.module.css";

export default function TextViewer({ textLoading, textError, textContent }) {
	if (textLoading) {
		return (
			<div className={styles.centered}>
				<div className={styles.spinner} />
			</div>
		);
	}
	if (textError) {
		return <div className={styles.errorMsg}>⚠ {textError}</div>;
	}
	return <pre className={styles.textContent}>{textContent}</pre>;
}

import styles from "./styles.module.css";

/**
 * Toggle  –  reusable pill-style toggle switch
 *
 * Props:
 *   checked   boolean
 *   onChange  (checked: boolean) => void
 *   label     string   — text shown to the right of the pill
 *   title     string   — tooltip (optional)
 *   size      'sm' | 'md'  (default 'md')
 *   disabled  boolean
 */
export default function Toggle({
	checked,
	onChange,
	label,
	title,
	size = "md",
	disabled = false,
}) {
	return (
		<label
			className={`${styles.wrap} ${styles["size_" + size]} ${disabled ? styles.disabled : ""}`}
			title={title}
		>
			<span className={`${styles.track} ${checked ? styles.trackOn : ""}`}>
				<span className={`${styles.thumb} ${checked ? styles.thumbOn : ""}`} />
			</span>
			<input
				type="checkbox"
				className={styles.input}
				checked={checked}
				disabled={disabled}
				onChange={(e) => onChange(e.target.checked)}
			/>
			{label && <span className={styles.label}>{label}</span>}
		</label>
	);
}

import styles from "./styles.module.css";

export default function AudioViewer({ item, fileUrl }) {
	return (
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
	);
}

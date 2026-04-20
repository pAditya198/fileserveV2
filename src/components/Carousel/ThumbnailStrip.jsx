import { encPath } from "../../utils/encPath";
import styles from "./styles.module.css";

export default function ThumbnailStrip({ items, index, jumpTo, thumbsRef }) {
	if (items.length <= 1) return null;

	return (
		<div className={styles.thumbStrip} ref={thumbsRef}>
			{items.map((item, i) => (
				<div
					key={item.path}
					className={`${styles.thumb} ${i === index ? styles.thumbActive : ""}`}
					data-active={i === index}
					onClick={() => jumpTo(i)}
				>
					{item.category === "image" ? (
						<img
							src={`/files/${encPath(item.path)}`}
							alt={item.name}
							loading="lazy"
							draggable={false}
						/>
					) : (
						<div className={styles.thumbVideo}>▶</div>
					)}
				</div>
			))}
		</div>
	);
}

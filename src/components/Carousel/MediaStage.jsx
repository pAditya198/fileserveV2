import { ChevronLeft, ChevronRight } from "../../icons";
import { encPath } from "../../utils/encPath";
import styles from "./styles.module.css";

export default function MediaStage({
	current,
	isImage,
	isVideo,
	fading,
	dir,
	videoRef,
	navigate,
	itemsLength,
}) {
	return (
		<div className={styles.stage}>
			{itemsLength > 1 && (
				<button
					className={`${styles.arrow} ${styles.arrowLeft}`}
					onClick={() => navigate(-1)}
					aria-label="Previous"
				>
					<ChevronLeft />
				</button>
			)}

			<div
				className={`${styles.mediaWrap} ${fading ? (dir > 0 ? styles.fadeOutLeft : styles.fadeOutRight) : styles.fadeIn}`}
			>
				{isImage && (
					<img
						className={styles.img}
						src={`/files/${encPath(current.path)}`}
						alt={current.name}
						draggable={false}
					/>
				)}
				{isVideo && (
					<video
						key={current.path}
						ref={videoRef}
						className={styles.video}
						src={`/files/${encPath(current.path)}`}
						controls
						autoPlay
						preload="metadata"
					/>
				)}
			</div>

			{itemsLength > 1 && (
				<button
					className={`${styles.arrow} ${styles.arrowRight}`}
					onClick={() => navigate(1)}
					aria-label="Next"
				>
					<ChevronRight />
				</button>
			)}
		</div>
	);
}

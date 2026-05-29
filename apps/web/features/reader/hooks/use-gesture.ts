import type {
	PointerEvent as ReactPointerEvent,
	WheelEvent as ReactWheelEvent,
} from "react";
import { useCallback, useRef } from "react";
import type { GestureMode } from "../types";

/** Accumulated deltaY required before triggering a page change via scroll. */
const SCROLL_DELTA_THRESHOLD = 100;

type UseGestureOptions = {
	readonly mode: GestureMode;
	readonly onNext: () => void;
	readonly onPrev: () => void;
	readonly threshold?: number;
};

type GestureHandlers = {
	/** @example `(e) => { e.currentTarget.setPointerCapture(e.pointerId); handlers.onPointerDown(e); }` */
	readonly onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
	readonly onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
	readonly onPointerUp: () => void;
	readonly onWheel: (e: ReactWheelEvent<HTMLDivElement>) => void;
};

function useGesture({
	mode,
	onNext,
	onPrev,
	threshold = 50,
}: UseGestureOptions): GestureHandlers {
	const startRef = useRef<{ x: number; y: number } | null>(null);
	const lastRef = useRef<{ x: number; y: number } | null>(null);
	const wheelAccumRef = useRef(0);

	// TODO: Production should wrap onPointerDown to call
	//   e.currentTarget.setPointerCapture(e.pointerId)
	// so that onPointerUp fires even if the pointer leaves the element mid-swipe.

	const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
		startRef.current = { x: e.clientX, y: e.clientY };
		lastRef.current = { x: e.clientX, y: e.clientY };
	}, []);

	const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
		lastRef.current = { x: e.clientX, y: e.clientY };
	}, []);

	const onPointerUp = useCallback(() => {
		if (!startRef.current || !lastRef.current) return;
		const dx = lastRef.current.x - startRef.current.x;
		const dy = lastRef.current.y - startRef.current.y;

		if (mode === "horizontal") {
			if (dx < -threshold) onNext();
			else if (dx > threshold) onPrev();
		} else if (mode === "vertical") {
			if (dy < -threshold) onNext();
			else if (dy > threshold) onPrev();
		}
		// scroll mode handled by onWheel

		startRef.current = null;
		lastRef.current = null;
	}, [mode, threshold, onNext, onPrev]);

	const onWheel = useCallback(
		(e: ReactWheelEvent<HTMLDivElement>) => {
			if (mode !== "scroll") return;

			// Reset accumulator on direction change for responsive scrolling
			if (
				wheelAccumRef.current !== 0 &&
				Math.sign(e.deltaY) !== Math.sign(wheelAccumRef.current)
			) {
				wheelAccumRef.current = 0;
			}

			wheelAccumRef.current += e.deltaY;

			if (wheelAccumRef.current > SCROLL_DELTA_THRESHOLD) {
				wheelAccumRef.current = 0;
				onNext();
			} else if (wheelAccumRef.current < -SCROLL_DELTA_THRESHOLD) {
				wheelAccumRef.current = 0;
				onPrev();
			}
		},
		[mode, onNext, onPrev],
	);

	return { onPointerDown, onPointerMove, onPointerUp, onWheel };
}

export type { GestureHandlers, UseGestureOptions };
export { useGesture };

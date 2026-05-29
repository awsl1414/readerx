// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import type {
	PointerEvent as ReactPointerEvent,
	WheelEvent as ReactWheelEvent,
} from "react";
import { describe, expect, it, vi } from "vitest";
import { useGesture } from "@/features/reader/hooks/use-gesture";

function makePointerEvent(
	clientX: number,
	clientY: number,
): ReactPointerEvent<HTMLDivElement> {
	return {
		clientX,
		clientY,
	} as ReactPointerEvent<HTMLDivElement>;
}

function makeWheelEvent(deltaY: number): ReactWheelEvent<HTMLDivElement> {
	return { deltaY } as ReactWheelEvent<HTMLDivElement>;
}

describe("useGesture", () => {
	it("returns handlers for horizontal mode", () => {
		const onNext = vi.fn();
		const onPrev = vi.fn();
		const { result } = renderHook(() =>
			useGesture({ mode: "horizontal", onNext, onPrev }),
		);
		expect(result.current.onPointerDown).toBeDefined();
		expect(result.current.onPointerMove).toBeDefined();
		expect(result.current.onPointerUp).toBeDefined();
	});

	it("triggers onNext on sufficient right-to-left swipe", () => {
		const onNext = vi.fn();
		const onPrev = vi.fn();
		const { result } = renderHook(() =>
			useGesture({ mode: "horizontal", onNext, onPrev }),
		);

		act(() => {
			result.current.onPointerDown(makePointerEvent(300, 400));
		});
		act(() => {
			result.current.onPointerMove(makePointerEvent(100, 400));
		});
		act(() => {
			result.current.onPointerUp();
		});

		expect(onNext).toHaveBeenCalledOnce();
		expect(onPrev).not.toHaveBeenCalled();
	});

	it("triggers onPrev on sufficient left-to-right swipe", () => {
		const onNext = vi.fn();
		const onPrev = vi.fn();
		const { result } = renderHook(() =>
			useGesture({ mode: "horizontal", onNext, onPrev }),
		);

		act(() => {
			result.current.onPointerDown(makePointerEvent(100, 400));
		});
		act(() => {
			result.current.onPointerMove(makePointerEvent(300, 400));
		});
		act(() => {
			result.current.onPointerUp();
		});

		expect(onPrev).toHaveBeenCalledOnce();
		expect(onNext).not.toHaveBeenCalled();
	});

	it("does not trigger on small swipe", () => {
		const onNext = vi.fn();
		const onPrev = vi.fn();
		const { result } = renderHook(() =>
			useGesture({ mode: "horizontal", onNext, onPrev }),
		);

		act(() => {
			result.current.onPointerDown(makePointerEvent(200, 400));
		});
		act(() => {
			result.current.onPointerMove(makePointerEvent(220, 400));
		});
		act(() => {
			result.current.onPointerUp();
		});

		expect(onNext).not.toHaveBeenCalled();
		expect(onPrev).not.toHaveBeenCalled();
	});

	describe("vertical mode", () => {
		it("triggers onNext on upward (bottom-to-top) swipe", () => {
			const onNext = vi.fn();
			const onPrev = vi.fn();
			const { result } = renderHook(() =>
				useGesture({ mode: "vertical", onNext, onPrev }),
			);

			act(() => {
				result.current.onPointerDown(makePointerEvent(400, 300));
			});
			act(() => {
				result.current.onPointerMove(makePointerEvent(400, 100));
			});
			act(() => {
				result.current.onPointerUp();
			});

			expect(onNext).toHaveBeenCalledOnce();
			expect(onPrev).not.toHaveBeenCalled();
		});

		it("triggers onPrev on downward (top-to-bottom) swipe", () => {
			const onNext = vi.fn();
			const onPrev = vi.fn();
			const { result } = renderHook(() =>
				useGesture({ mode: "vertical", onNext, onPrev }),
			);

			act(() => {
				result.current.onPointerDown(makePointerEvent(400, 100));
			});
			act(() => {
				result.current.onPointerMove(makePointerEvent(400, 300));
			});
			act(() => {
				result.current.onPointerUp();
			});

			expect(onPrev).toHaveBeenCalledOnce();
			expect(onNext).not.toHaveBeenCalled();
		});

		it("does not trigger on small vertical swipes below threshold", () => {
			const onNext = vi.fn();
			const onPrev = vi.fn();
			const { result } = renderHook(() =>
				useGesture({ mode: "vertical", onNext, onPrev }),
			);

			act(() => {
				result.current.onPointerDown(makePointerEvent(400, 200));
			});
			act(() => {
				result.current.onPointerMove(makePointerEvent(400, 220));
			});
			act(() => {
				result.current.onPointerUp();
			});

			expect(onNext).not.toHaveBeenCalled();
			expect(onPrev).not.toHaveBeenCalled();
		});
	});

	describe("edge cases", () => {
		it("onPointerUp without prior onPointerDown does nothing", () => {
			const onNext = vi.fn();
			const onPrev = vi.fn();
			const { result } = renderHook(() =>
				useGesture({ mode: "horizontal", onNext, onPrev }),
			);

			act(() => {
				result.current.onPointerUp();
			});

			expect(onNext).not.toHaveBeenCalled();
			expect(onPrev).not.toHaveBeenCalled();
		});

		it("ignores pointer events in scroll mode for page navigation", () => {
			const onNext = vi.fn();
			const onPrev = vi.fn();
			const { result } = renderHook(() =>
				useGesture({ mode: "scroll", onNext, onPrev }),
			);

			act(() => {
				result.current.onPointerDown(makePointerEvent(300, 400));
			});
			act(() => {
				result.current.onPointerMove(makePointerEvent(100, 400));
			});
			act(() => {
				result.current.onPointerUp();
			});

			expect(onNext).not.toHaveBeenCalled();
			expect(onPrev).not.toHaveBeenCalled();
		});
	});

	describe("scroll debounce", () => {
		it("does not trigger on small scroll increments", () => {
			const onNext = vi.fn();
			const onPrev = vi.fn();
			const { result } = renderHook(() =>
				useGesture({ mode: "scroll", onNext, onPrev }),
			);

			for (let i = 0; i < 10; i++) {
				act(() => {
					result.current.onWheel(makeWheelEvent(5));
				});
			}

			expect(onNext).not.toHaveBeenCalled();
			expect(onPrev).not.toHaveBeenCalled();
		});

		it("triggers onNext after accumulated downward scroll exceeds threshold", () => {
			const onNext = vi.fn();
			const onPrev = vi.fn();
			const { result } = renderHook(() =>
				useGesture({ mode: "scroll", onNext, onPrev }),
			);

			act(() => {
				result.current.onWheel(makeWheelEvent(60));
			});
			expect(onNext).not.toHaveBeenCalled();

			act(() => {
				result.current.onWheel(makeWheelEvent(60));
			});
			expect(onNext).toHaveBeenCalledOnce();
			expect(onPrev).not.toHaveBeenCalled();
		});

		it("triggers onPrev after accumulated upward scroll exceeds threshold", () => {
			const onNext = vi.fn();
			const onPrev = vi.fn();
			const { result } = renderHook(() =>
				useGesture({ mode: "scroll", onNext, onPrev }),
			);

			act(() => {
				result.current.onWheel(makeWheelEvent(-60));
			});
			expect(onPrev).not.toHaveBeenCalled();

			act(() => {
				result.current.onWheel(makeWheelEvent(-60));
			});
			expect(onPrev).toHaveBeenCalledOnce();
			expect(onNext).not.toHaveBeenCalled();
		});

		it("resets accumulator after triggering", () => {
			const onNext = vi.fn();
			const onPrev = vi.fn();
			const { result } = renderHook(() =>
				useGesture({ mode: "scroll", onNext, onPrev }),
			);

			// First trigger
			act(() => {
				result.current.onWheel(makeWheelEvent(150));
			});
			expect(onNext).toHaveBeenCalledOnce();

			// Accumulator reset — small scroll should not trigger again
			act(() => {
				result.current.onWheel(makeWheelEvent(50));
			});
			expect(onNext).toHaveBeenCalledOnce();

			// Second trigger after enough accumulation
			act(() => {
				result.current.onWheel(makeWheelEvent(60));
			});
			expect(onNext).toHaveBeenCalledTimes(2);
		});

		it("ignores wheel events when not in scroll mode", () => {
			const onNext = vi.fn();
			const onPrev = vi.fn();
			const { result } = renderHook(() =>
				useGesture({ mode: "horizontal", onNext, onPrev }),
			);

			act(() => {
				result.current.onWheel(makeWheelEvent(200));
			});

			expect(onNext).not.toHaveBeenCalled();
			expect(onPrev).not.toHaveBeenCalled();
		});
	});
});

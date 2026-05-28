// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGesture } from "@/features/reader/hooks/use-gesture";

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
			result.current.onPointerDown({ clientX: 300, clientY: 400 } as PointerEvent);
		});
		act(() => {
			result.current.onPointerMove({ clientX: 100, clientY: 400 } as PointerEvent);
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
			result.current.onPointerDown({ clientX: 100, clientY: 400 } as PointerEvent);
		});
		act(() => {
			result.current.onPointerMove({ clientX: 300, clientY: 400 } as PointerEvent);
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
			result.current.onPointerDown({ clientX: 200, clientY: 400 } as PointerEvent);
		});
		act(() => {
			result.current.onPointerMove({ clientX: 220, clientY: 400 } as PointerEvent);
		});
		act(() => {
			result.current.onPointerUp();
		});

		expect(onNext).not.toHaveBeenCalled();
		expect(onPrev).not.toHaveBeenCalled();
	});
});

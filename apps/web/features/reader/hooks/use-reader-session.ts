import { useState, useEffect, useCallback, useRef } from "react";
import { ReaderSession } from "../session";
import type { AtmospherePreset, ReaderState, SessionDeps } from "../types";

type UseReaderSessionReturn = {
	readonly session: ReaderSession | null;
	readonly state: ReaderState | null;
	readonly open: (bookId: string) => Promise<void>;
	readonly close: () => void;
	readonly setAtmosphere: (preset: AtmospherePreset) => void;
};

function useReaderSession(deps: SessionDeps): UseReaderSessionReturn {
	const [session, setSession] = useState<ReaderSession | null>(null);
	const [state, setState] = useState<ReaderState | null>(null);
	const sessionRef = useRef<ReaderSession | null>(null);
	const depsRef = useRef(deps);
	depsRef.current = deps;

	const open = useCallback(async (bookId: string) => {
		const s = await ReaderSession.open(bookId, depsRef.current);
		sessionRef.current = s;
		setSession(s);
		setState({
			currentPage: s.currentPage,
			pageCount: s.pageCount,
			currentChapter: s.currentChapter,
			chapters: s.chapters,
			atmosphere: s.atmosphere,
			isLoading: s.isLoading,
		});
		s.onStateChange((newState) => setState(newState));
	}, []);

	const close = useCallback(() => {
		sessionRef.current?.dispose();
		sessionRef.current = null;
		setSession(null);
		setState(null);
	}, []);

	const setAtmosphere = useCallback((preset: AtmospherePreset) => {
		sessionRef.current?.setAtmosphere(preset);
	}, []);

	useEffect(() => {
		return () => {
			sessionRef.current?.dispose();
		};
	}, []);

	return { session, state, open, close, setAtmosphere };
}

export { useReaderSession };
export type { UseReaderSessionReturn };

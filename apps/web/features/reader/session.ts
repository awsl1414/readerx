import type {
	Document,
	RenderPage,
	RenderResult,
} from "@readerx/reader-engine";
import { ContentProcessor, fetchAndParse } from "@readerx/reader-engine";
import { ATMOSPHERE_PRESETS } from "./atmosphere";
import { RenderScheduler } from "./render-scheduler";
import type {
	AtmospherePreset,
	CachedChapter,
	ChapterInfo,
	ReaderState,
	ReadingAtmosphere,
	SessionDeps,
} from "./types";

class ReaderSession {
	private readonly deps: SessionDeps;
	private readonly scheduler: RenderScheduler;
	private readonly chapterCache = new Map<number, CachedChapter>();
	private readonly listeners = new Set<(state: ReaderState) => void>();
	private readonly prefetchQueue = new Set<number>();

	private _currentPage = 0;
	private _currentChapter = 0;
	private _atmosphere: ReadingAtmosphere;
	private _chapters: readonly ChapterInfo[] = [];
	private _renderResult: RenderResult | null = null;
	private _bookUrl = "";
	private _disposed = false;

	private constructor(deps: SessionDeps) {
		this.deps = deps;
		this._atmosphere = ATMOSPHERE_PRESETS.novel as ReadingAtmosphere;
		this.scheduler = new RenderScheduler((result) => {
			this._renderResult = result;
			this.notify();
		});
	}

	static async open(bookId: string, deps: SessionDeps): Promise<ReaderSession> {
		const session = new ReaderSession(deps);
		const book = await deps.bookRepo.get(bookId);
		if (!book) throw new Error(`Book not found: ${bookId}`);
		session._bookUrl = bookId;

		const chapters = await deps.chapterRepo.getByBook(bookId);
		session._chapters = chapters.map((c) => ({
			index: c.index,
			title: c.title,
			isVolume: c.isVolume ?? false,
		}));

		await session.loadChapter(book.durChapterIndex ?? 0);
		session._currentPage = book.durChapterPos ?? 0;
		session.notify();
		session.prefetchAdjacent();
		return session;
	}

	get currentPage(): number {
		return this._currentPage;
	}

	get currentChapter(): number {
		return this._currentChapter;
	}

	get pageCount(): number {
		return this._renderResult?.totalPages ?? 0;
	}

	get chapters(): readonly ChapterInfo[] {
		return this._chapters;
	}

	get atmosphere(): ReadingAtmosphere {
		return this._atmosphere;
	}

	get isLoading(): boolean {
		return this._renderResult === null;
	}

	getPage(pageIndex: number): RenderPage | undefined {
		return this._renderResult?.pages[pageIndex];
	}

	nextPage(): number {
		if (this._currentPage < this.pageCount - 1) {
			this._currentPage++;
			this.notify();
		}
		return this._currentPage;
	}

	prevPage(): number {
		if (this._currentPage > 0) {
			this._currentPage--;
			this.notify();
		}
		return this._currentPage;
	}

	async jumpToChapter(chapterIndex: number): Promise<void> {
		if (chapterIndex < 0 || chapterIndex >= this._chapters.length) return;
		await this.loadChapter(chapterIndex);
		this._currentPage = 0;
		this.notify();
		this.prefetchAdjacent();
	}

	setAtmosphere(preset: AtmospherePreset): void {
		this._atmosphere = ATMOSPHERE_PRESETS[preset] as ReadingAtmosphere;
		const cached = this.chapterCache.get(this._currentChapter);
		if (cached) {
			this.scheduler.invalidate(
				cached.document,
				this._atmosphere,
				this.deps.viewport,
			);
		}
	}

	onStateChange(callback: (state: ReaderState) => void): () => void {
		this.listeners.add(callback);
		return () => {
			this.listeners.delete(callback);
		};
	}

	dispose(): void {
		if (this._disposed) return;
		this._disposed = true;
		this.deps.bookRepo.updateProgress(
			this._bookUrl,
			this._currentChapter,
			this._currentPage,
		);
		this.listeners.clear();
		this.chapterCache.clear();
	}

	private async loadChapter(index: number, activate = true): Promise<void> {
		const cached = this.chapterCache.get(index);
		if (cached) {
			if (activate) {
				this._currentChapter = index;
				this._renderResult = cached.renderResult;
			}
			return;
		}

		const chapter = await this.deps.chapterRepo.getByIndex(
			this._bookUrl,
			index,
		);
		if (!chapter) throw new Error(`Chapter not found: ${index}`);

		const source = await this.deps.sourceRepo.get("");
		const rule = source?.ruleContent ?? "";

		const pipelineResult = await fetchAndParse({
			rule,
			url: chapter.resourceUrl,
		} as never);
		const doc = ContentProcessor.process(
			pipelineResult as Document,
		) as Document;

		// Save the active render state before invalidation (prefetch must not clobber it)
		const savedResult = this._renderResult;
		this.scheduler.invalidate(doc, this._atmosphere, this.deps.viewport);
		// Since scheduler is synchronous, result is available immediately
		if (this._renderResult) {
			this.chapterCache.set(index, {
				document: doc,
				renderResult: this._renderResult,
			});
		}

		if (activate) {
			this._currentChapter = index;
		} else {
			// Restore the active chapter's render result
			this._renderResult = savedResult;
		}

		// Evict distant chapters (LRU: keep closest)
		this.evictDistantChapters();
	}

	private prefetchAdjacent(): void {
		const indices = [this._currentChapter - 1, this._currentChapter + 1];
		for (const idx of indices) {
			if (idx < 0 || idx >= this._chapters.length) continue;
			if (this.chapterCache.has(idx)) continue;
			if (this.prefetchQueue.has(idx)) continue;
			this.prefetchQueue.add(idx);
			this.loadChapter(idx, false)
				.catch(() => {})
				.finally(() => {
					this.prefetchQueue.delete(idx);
				});
		}
	}

	private evictDistantChapters(): void {
		if (this.chapterCache.size <= 5) return;
		const keys = [...this.chapterCache.keys()].sort(
			(a, b) =>
				Math.abs(a - this._currentChapter) - Math.abs(b - this._currentChapter),
		);
		while (this.chapterCache.size > 5) {
			const farthest = keys.pop();
			if (farthest !== undefined) this.chapterCache.delete(farthest);
		}
	}

	private notify(): void {
		if (this._disposed) return;
		const state: ReaderState = {
			currentPage: this._currentPage,
			pageCount: this.pageCount,
			currentChapter: this._currentChapter,
			chapters: this._chapters,
			atmosphere: this._atmosphere,
			isLoading: this._renderResult === null,
		};
		for (const listener of this.listeners) {
			listener(state);
		}
	}
}

export { ReaderSession };

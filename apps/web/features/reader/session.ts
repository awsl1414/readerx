import type {
	PipelineConfig,
	PipelineDeps,
	RenderPage,
	RenderResult,
} from "@readerx/reader-engine";
import {
	ContentProcessor,
	fetchAndParse,
	PretextLayouter,
} from "@readerx/reader-engine";
import type { ContentModule } from "@readerx/rule-engine";
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
	private static readonly MAX_CACHE_SIZE = 5;

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
	private _origin = "";
	private _disposed = false;
	private _isPrefetching = false;

	private constructor(deps: SessionDeps) {
		this.deps = deps;
		this._atmosphere = ATMOSPHERE_PRESETS.novel;
		this.scheduler = new RenderScheduler((result) => {
			if (!this._isPrefetching) {
				this._renderResult = result;
				this.notify();
			}
		});
	}

	/** Read the current viewport directly from the browser at call time.
	 *  Falls back to a sensible default during SSR or non-browser environments. */
	private getViewport(): { width: number; height: number } {
		if (typeof window !== "undefined") {
			return { width: window.innerWidth, height: window.innerHeight };
		}
		return { width: 1024, height: 768 };
	}

	static async open(bookId: string, deps: SessionDeps): Promise<ReaderSession> {
		const session = new ReaderSession(deps);
		session.scheduler.setLayouter(new PretextLayouter());
		const book = await deps.bookRepo.get(bookId);
		if (!book) throw new Error(`Book not found: ${bookId}`);
		session._bookUrl = bookId;
		session._origin = book.origin;

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
		this._atmosphere = ATMOSPHERE_PRESETS[preset];
		const cached = this.chapterCache.get(this._currentChapter);
		if (cached) {
			this.scheduler.invalidate(
				cached.document,
				this._atmosphere,
				this.getViewport(),
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
		this.deps.bookRepo
			.updateProgress(this._bookUrl, this._currentChapter, this._currentPage)
			.catch((err: unknown) => {
				console.warn("Failed to save reading progress:", err);
			});
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

		const source = await this.deps.sourceRepo.get(this._origin);
		if (!source?.ruleContent) {
			throw new Error(`No content rule found for source: ${this._origin}`);
		}
		const contentModule: ContentModule = {
			rules: {
				text: [
					{ type: "extract", engine: "css", selector: source.ruleContent },
				],
			},
		};

		const pipelineDeps: PipelineDeps = {
			httpFetcher: this.deps.httpFetcher,
			...(this.deps.jsExecutor ? { jsExecutor: this.deps.jsExecutor } : {}),
		};
		const pipelineConfig: PipelineConfig = {
			contentModule,
			url: chapter.resourceUrl,
		};

		const pipelineResult = await fetchAndParse(pipelineDeps, pipelineConfig);
		const doc = new ContentProcessor().process(pipelineResult);

		this._isPrefetching = !activate;
		const newResult = this.scheduler.invalidate(
			doc,
			this._atmosphere,
			this.getViewport(),
		);
		this._isPrefetching = false;

		if (activate) {
			this._currentChapter = index;
			// _renderResult was already set by the onResult callback inside
			// scheduler.invalidate — no manual restore needed
		}

		if (newResult) {
			this.chapterCache.set(index, { document: doc, renderResult: newResult });
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
				.catch((err: unknown) => {
					console.warn(`Prefetch chapter ${idx} failed:`, err);
				})
				.finally(() => {
					this.prefetchQueue.delete(idx);
				});
		}
	}

	private evictDistantChapters(): void {
		if (this.chapterCache.size <= ReaderSession.MAX_CACHE_SIZE) return;
		const keys = [...this.chapterCache.keys()].sort(
			(a, b) =>
				Math.abs(a - this._currentChapter) - Math.abs(b - this._currentChapter),
		);
		while (this.chapterCache.size > ReaderSession.MAX_CACHE_SIZE) {
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

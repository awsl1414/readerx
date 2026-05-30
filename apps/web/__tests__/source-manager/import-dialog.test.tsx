// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImportDialog } from "@/features/source-manager/components/import-dialog";
import zhMessages from "@/messages/zh.json";

const { mockRepo } = vi.hoisted(() => {
	const mockRepo = {
		saveBatch: vi.fn(async () => undefined),
		search: vi.fn(async () => []),
		getAll: vi.fn(async () => []),
		save: vi.fn(async () => undefined),
		enable: vi.fn(async () => undefined),
		delete: vi.fn(async () => undefined),
		deleteBatch: vi.fn(async () => undefined),
	};

	return { mockRepo };
});

vi.mock("@readerx/persistence", () => {
	return {
		BookSourceRepository: class {
			saveBatch = mockRepo.saveBatch;
			search = mockRepo.search;
			getAll = mockRepo.getAll;
			save = mockRepo.save;
			enable = mockRepo.enable;
			delete = mockRepo.delete;
			deleteBatch = mockRepo.deleteBatch;
		},
		db: { bookSources: {} },
	};
});

afterEach(cleanup);

function createWrapper() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return ({ children }: { children: ReactNode }) => (
		<NextIntlClientProvider locale="zh" messages={zhMessages}>
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		</NextIntlClientProvider>
	);
}

describe("ImportDialog", () => {
	it("renders when open", () => {
		render(<ImportDialog open={true} onClose={() => {}} />, {
			wrapper: createWrapper(),
		});
		expect(screen.getByRole("heading", { name: "导入书源" })).toBeTruthy();
	});

	it("does not render when closed", () => {
		render(<ImportDialog open={false} onClose={() => {}} />, {
			wrapper: createWrapper(),
		});
		expect(screen.queryByRole("heading", { name: "导入书源" })).toBeNull();
	});

	it("renders three tab buttons", () => {
		render(<ImportDialog open={true} onClose={() => {}} />, {
			wrapper: createWrapper(),
		});
		expect(screen.getByText("URL 导入")).toBeTruthy();
		expect(screen.getByText("文件导入")).toBeTruthy();
		expect(screen.getByText("粘贴导入")).toBeTruthy();
	});
});

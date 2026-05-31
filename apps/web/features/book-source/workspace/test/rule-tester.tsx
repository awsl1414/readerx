"use client";

import type { SourceModuleType } from "@readerx/schemas";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

const MODULE_TYPE_OPTIONS: { label: string; value: SourceModuleType }[] = [
	{ label: "Search", value: "search" },
	{ label: "Explore", value: "explore" },
	{ label: "Detail", value: "detail" },
	{ label: "TOC", value: "toc" },
	{ label: "Content", value: "content" },
];

type RuleTesterProps = {
	readonly disabled?: boolean;
};

function RuleTester({ disabled }: RuleTesterProps) {
	const [selectedType, setSelectedType] = useState<SourceModuleType>("search");
	const [keyword, setKeyword] = useState("");
	const [url, setUrl] = useState("");

	return (
		<div className="flex flex-col gap-3 p-4">
			<h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
				规则测试
			</h4>

			<div className="flex flex-col gap-2">
				<div className="flex flex-col gap-1.5">
					<Label>模块类型</Label>
					<Select
						value={selectedType}
						onValueChange={(v) => setSelectedType(v as SourceModuleType)}
						disabled={disabled ?? false}
					>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{MODULE_TYPE_OPTIONS.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="test-keyword">关键字</Label>
					<Input
						id="test-keyword"
						value={keyword}
						onChange={(e) => setKeyword(e.target.value)}
						placeholder="搜索关键字..."
						disabled={disabled}
					/>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="test-url">URL</Label>
					<Input
						id="test-url"
						value={url}
						onChange={(e) => setUrl(e.target.value)}
						placeholder="测试 URL..."
						disabled={disabled}
					/>
				</div>

				<Button disabled className="w-fit text-xs">
					运行测试
				</Button>

				<p className="text-xs text-muted-foreground">
					运行时尚未实现
				</p>
			</div>
		</div>
	);
}

export { RuleTester };

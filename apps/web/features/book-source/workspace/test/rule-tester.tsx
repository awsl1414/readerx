"use client";

import type { SourceModuleType } from "@readerx/schemas";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const MODULE_TYPE_KEYS: { key: string; value: SourceModuleType }[] = [
	{ key: "moduleSearch", value: "search" },
	{ key: "moduleExplore", value: "explore" },
	{ key: "moduleDetail", value: "detail" },
	{ key: "moduleToc", value: "toc" },
	{ key: "moduleContent", value: "content" },
];

type RuleTesterProps = {
	readonly disabled?: boolean;
};

function RuleTester({ disabled }: RuleTesterProps) {
	const t = useTranslations("sourceManager");
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
					<Label>{t("fieldType")}</Label>
					<Select
						value={selectedType}
						onValueChange={(v) => setSelectedType(v as SourceModuleType)}
						disabled={disabled ?? false}
					>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{MODULE_TYPE_KEYS.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{t(opt.key)}
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
					{t("testRun")}
				</Button>

				<p className="text-xs text-muted-foreground">
					{t("testNotImplemented")}
				</p>
			</div>
		</div>
	);
}

export { RuleTester };

"use client";

import { AlertCircle, Check, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { ImportResult } from "../types";

type ImportResultReportProps = {
	readonly result: ImportResult;
};

function ImportResultReport({ result }: ImportResultReportProps) {
	const t = useTranslations("sourceManager");
	const { success, warnings, failures } = result;

	return (
		<div className="space-y-3 text-sm">
			<div className="flex items-center gap-2">
				<Badge variant="secondary">
					<Check className="size-3" />
					{t("importSuccess", { count: success.length })}
				</Badge>
				{warnings.length > 0 && (
					<Badge variant="outline">
						<AlertCircle className="size-3" />
						{t("importSkipped", { count: warnings.length })}
					</Badge>
				)}
				{failures.length > 0 && (
					<Badge variant="destructive">
						<XCircle className="size-3" />
						{t("importFailed", { count: failures.length })}
					</Badge>
				)}
			</div>

			{success.length > 0 && (
				<div className="space-y-0.5">
					{success.map((s) => (
						<div
							key={s.bookSourceUrl}
							className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400"
						>
							<Check className="size-3 shrink-0" />
							{s.bookSourceName}
						</div>
					))}
				</div>
			)}

			{warnings.length > 0 && (
				<div className="space-y-0.5">
					{warnings.map((w) => (
						<div key={w.source.bookSourceUrl}>
							<div className="flex items-center gap-1.5 text-sm text-yellow-600 dark:text-yellow-400">
								<AlertCircle className="size-3 shrink-0" />
								{w.source.bookSourceName}
							</div>
							<ul className="ml-5 list-disc text-xs text-muted-foreground">
								{w.reasons.map((r) => (
									<li key={r}>{r}</li>
								))}
							</ul>
						</div>
					))}
				</div>
			)}

			{failures.length > 0 && (
				<div className="space-y-0.5">
					{/* index is acceptable as key: failures is a stable list from import results */}
					{failures.map((f, index) => (
						<div key={index}>
							<div className="flex items-center gap-1.5 text-sm text-destructive">
								<XCircle className="size-3 shrink-0" />
								{typeof f.raw.bookSourceName === "string"
									? f.raw.bookSourceName
									: "未知书源"}
							</div>
							<ul className="ml-5 list-disc text-xs text-muted-foreground">
								{f.reasons.map((r) => (
									<li key={r}>{r}</li>
								))}
							</ul>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export { ImportResultReport };

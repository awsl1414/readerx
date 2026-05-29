"use client";

import type { ImportResult } from "../types";

type ImportResultReportProps = {
	readonly result: ImportResult;
};

function ImportResultReport({ result }: ImportResultReportProps) {
	const { success, warnings, failures } = result;

	return (
		<div style={{ fontSize: "0.875rem", lineHeight: 1.6 }}>
			<p>
				导入完成: {success.length} 成功 / {warnings.length} 警告 /{" "}
				{failures.length} 失败
			</p>

			{success.length > 0 && (
				<div style={{ marginTop: 8 }}>
					{success.map((s) => (
						<div key={s.bookSourceUrl} style={{ color: "oklch(0.7 0.15 150)" }}>
							✓ {s.bookSourceName}
						</div>
					))}
				</div>
			)}

			{warnings.length > 0 && (
				<div style={{ marginTop: 8 }}>
					{warnings.map((w) => (
						<div key={w.source.bookSourceUrl} style={{ color: "oklch(0.75 0.15 85)" }}>
							⚠ {w.source.bookSourceName}
							<ul style={{ margin: "2px 0 4px 16px" }}>
								{w.reasons.map((r) => (
									<li key={r}>{r}</li>
								))}
							</ul>
						</div>
					))}
				</div>
			)}

			{failures.length > 0 && (
				<div style={{ marginTop: 8 }}>
					{failures.map((f, i) => (
						<div key={`fail-${i}`} style={{ color: "oklch(0.7 0.2 25)" }}>
							✗{" "}
							{typeof f.raw.bookSourceName === "string"
								? f.raw.bookSourceName
								: "未知书源"}{" "}
							(校验失败)
							<ul style={{ margin: "2px 0 4px 16px" }}>
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

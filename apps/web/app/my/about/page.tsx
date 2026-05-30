import { BookOpen, ExternalLink, Heart } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import pkg from "@/package.json";

export default async function AboutPage() {
	const t = await getTranslations("about");

	return (
		<div className="mx-auto max-w-lg space-y-6">
			{/* Hero */}
			<div className="flex flex-col items-center gap-3 py-4">
				<BookOpen className="size-16 text-primary" />
				<div className="flex items-center gap-2">
					<h1 className="text-2xl font-semibold">ReaderX</h1>
					<Badge variant="secondary">
						{t("version", { version: pkg.version })}
					</Badge>
				</div>
				<p className="text-sm text-muted-foreground">{t("description")}</p>
			</div>

			{/* About ReaderX */}
			<div>
				<h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("aboutReaderX")}
				</h2>
				<div className="divide-y divide-border rounded-lg border border-border bg-surface-1">
					<div className="px-4 py-3 text-sm text-muted-foreground">
						{t("aboutDescription")}
					</div>
				</div>
			</div>

			{/* License */}
			<div>
				<h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("license")}
				</h2>
				<div className="divide-y divide-border rounded-lg border border-border bg-surface-1">
					<div className="flex items-center gap-3 px-4 py-3 text-sm">
						<span className="flex-1">{t("licenseType")}</span>
					</div>
				</div>
			</div>

			{/* GitHub */}
			<div>
				<h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("github")}
				</h2>
				<div className="divide-y divide-border rounded-lg border border-border bg-surface-1">
					<a
						href="https://github.com/awsl1414/readerx"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-2 first:rounded-t-lg last:rounded-b-lg"
					>
						<ExternalLink className="size-4 text-muted-foreground" />
						<span className="flex-1">GitHub</span>
						<span className="text-muted-foreground">↗</span>
					</a>
				</div>
			</div>

			{/* Acknowledgements */}
			<div>
				<h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("acknowledgements")}
				</h2>
				<div className="divide-y divide-border rounded-lg border border-border bg-surface-1">
					<a
						href="https://github.com/gedoor/legado"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-2 first:rounded-t-lg last:rounded-b-lg"
					>
						<Heart className="size-4 text-muted-foreground" />
						<div className="flex-1">
							<span>{t("thanksLegado")}</span>
							<p className="text-xs text-muted-foreground">
								{t("thanksLegadoDesc")}
							</p>
						</div>
						<span className="text-muted-foreground">↗</span>
					</a>
				</div>
			</div>

			{/* Copyright */}
			<p className="pb-8 text-center text-xs text-muted-foreground">
				{t("copyright")} · {t("basedOn")}
			</p>
		</div>
	);
}

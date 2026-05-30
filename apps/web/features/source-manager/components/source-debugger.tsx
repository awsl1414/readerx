"use client";

import type { BookSourceRecord } from "@readerx/persistence";
import { Play, RotateCcw, Square, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSourceDebug } from "../hooks/use-source-debug";
import { useSourceManagerStore } from "../store";
import { DebugConsole } from "./debug-console";
import { DebugPipeline } from "./debug-pipeline";
import { DebugResultViewer } from "./debug-result-viewer";

type SourceDebuggerProps = {
	readonly source: BookSourceRecord;
};

function SourceDebugger({ source: _source }: SourceDebuggerProps) {
	const t = useTranslations("sourceManager");
	const { stages, logs, isRunning, runPipeline, abort, reset } =
		useSourceDebug();
	const setDebuggerOpen = useSourceManagerStore((s) => s.setDebuggerOpen);
	const [testUrl, setTestUrl] = useState("");
	const [activeTab, setActiveTab] = useState("pipeline");

	const lastStage = stages[stages.length - 1];

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="flex items-center justify-between px-3 py-2">
				<span className="text-sm font-medium">{t("debug")}</span>
				<Button
					variant="ghost"
					size="icon"
					className="size-6"
					onClick={() => setDebuggerOpen(false)}
				>
					<X className="size-3.5" />
				</Button>
			</div>

			<Separator />

			{/* URL input */}
			<div className="flex flex-col gap-2 px-3 py-2">
				<Input
					type="url"
					placeholder="URL..."
					value={testUrl}
					onChange={(e) => setTestUrl(e.target.value)}
					className="h-8 text-xs"
				/>
				<div className="flex gap-2">
					<Button
						size="sm"
						variant={isRunning ? "secondary" : "default"}
						onClick={() => {
							void runPipeline(testUrl);
						}}
						disabled={isRunning || !testUrl.trim()}
						className="flex-1 text-xs"
					>
						{isRunning
							? t("debugRunning")
							: [t("debugRun"), <Play className="size-3" key="icon" />]}
					</Button>
					{isRunning && (
						<Button
							variant="destructive"
							size="sm"
							onClick={abort}
							className="text-xs"
						>
							<Square className="size-3" />
							{t("debugStop")}
						</Button>
					)}
					<Button
						variant="outline"
						size="sm"
						onClick={reset}
						className="text-xs"
					>
						<RotateCcw className="size-3" />
						{t("debugReset")}
					</Button>
				</div>
			</div>

			<Separator />

			{/* Tab switch */}
			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className="flex flex-1 flex-col"
			>
				<TabsList className="mx-3 mt-2">
					<TabsTrigger value="pipeline" className="text-xs">
						Pipeline
					</TabsTrigger>
					<TabsTrigger value="console" className="text-xs">
						Console
					</TabsTrigger>
				</TabsList>

				<TabsContent value="pipeline" className="mt-0 flex-1 overflow-y-auto">
					<ScrollArea className="h-full">
						<DebugPipeline stages={stages} />
						{lastStage && (
							<div className="px-3 py-2">
								<DebugResultViewer
									result={lastStage.result}
									error={lastStage.error}
								/>
							</div>
						)}
					</ScrollArea>
				</TabsContent>

				<TabsContent value="console" className="mt-0 flex-1 overflow-y-auto">
					<DebugConsole logs={logs} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

export { SourceDebugger };

"use client";

import type { SourceModuleType } from "@readerx/schemas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";

const MODULE_TYPE_KEYS: Record<SourceModuleType, string> = {
	search: "moduleSearch",
	explore: "moduleExplore",
	detail: "moduleDetail",
	toc: "moduleToc",
	content: "moduleContent",
};

const ALL_MODULE_TYPES: SourceModuleType[] = [
	"search",
	"explore",
	"detail",
	"toc",
	"content",
];

type ModuleNavigatorProps = {
	readonly modules: readonly { readonly type: SourceModuleType }[];
	readonly selectedIndex: number | null;
	readonly onSelect: (index: number) => void;
	readonly onAdd: (type: SourceModuleType) => void;
	readonly onRemove: (index: number) => void;
};

function ModuleNavigator({
	modules,
	selectedIndex,
	onSelect,
	onAdd,
	onRemove,
}: ModuleNavigatorProps) {
	const t = useTranslations("sourceManager");

	return (
		<div className="flex items-center gap-1 overflow-x-auto border-b border-border px-3 py-2">
			{modules.map((mod, i) => {
				const isActive = i === selectedIndex;
				const label = t(MODULE_TYPE_KEYS[mod.type]);
				return (
					<div key={`module-${i}-${mod.type}`} className="relative flex items-center">
						<Button
							variant={isActive ? "default" : "ghost"}
							size="sm"
							className="h-7 text-xs gap-1 px-2"
							onClick={() => onSelect(i)}
						>
							{label}
						</Button>
						<button
							type="button"
							className="text-muted-foreground hover:text-destructive absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-background"
							onClick={(e) => {
								e.stopPropagation();
								onRemove(i);
							}}
							aria-label={t("removeModule")}
						>
							<XIcon className="size-2.5" />
						</button>
					</div>
				);
			})}

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="sm" className="h-7 px-1.5">
						<PlusIcon className="size-3.5" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					{ALL_MODULE_TYPES.map((type) => (
						<DropdownMenuItem
							key={type}
							onClick={() => onAdd(type)}
						>
							{t(MODULE_TYPE_KEYS[type])}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

export { ModuleNavigator, MODULE_TYPE_KEYS };

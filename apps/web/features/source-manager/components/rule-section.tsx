"use client";

import { ChevronRight } from "lucide-react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/cn";

type RuleSectionProps = {
	readonly title: string;
	readonly sectionKey: string;
	readonly expanded: boolean;
	readonly onToggle: (sectionKey: string) => void;
	readonly children: React.ReactNode;
};

function RuleSection({
	title,
	sectionKey,
	expanded,
	onToggle,
	children,
}: RuleSectionProps) {
	return (
		<Collapsible
			open={expanded}
			onOpenChange={() => onToggle(sectionKey)}
			className="border-b border-border"
		>
			<CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-foreground/85 hover:bg-surface-1 transition-colors">
				<ChevronRight
					className={cn(
						"size-4 shrink-0 transition-transform duration-150",
						expanded && "rotate-90",
					)}
				/>
				{title}
			</CollapsibleTrigger>
			<CollapsibleContent className="px-4 pb-4">{children}</CollapsibleContent>
		</Collapsible>
	);
}

export { RuleSection };

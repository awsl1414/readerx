import { SourceWorkspace } from "@/features/source-manager/components/source-workspace";

export default function SourcesPage() {
	return (
		// Negative margins counteract AppShell's <main> padding (px-4 pb-20 / md:px-6 md:pb-6 / lg:px-8)
		// Height accounts for the sticky header (h-11 = 2.75rem)
		<div className="-m-4 -mb-20 md:-m-6 md:-mb-6 lg:-m-8 h-[calc(100dvh-2.75rem)]">
			<SourceWorkspace />
		</div>
	);
}

"use client";

import { XIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type TagInputProps = {
	readonly tags: readonly string[];
	readonly onChange: (tags: string[]) => void;
	readonly placeholder?: string;
	readonly disabled?: boolean;
	readonly className?: string;
};

function TagInput({
	tags,
	onChange,
	placeholder = "Add tag...",
	disabled,
	className,
}: TagInputProps) {
	const [inputValue, setInputValue] = useState("");

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			addTag();
		}
		if (e.key === "Backspace" && !inputValue && tags.length > 0) {
			removeTag(tags.length - 1);
		}
	};

	const addTag = () => {
		const tag = inputValue.trim();
		if (tag && !tags.includes(tag)) {
			onChange([...tags, tag]);
		}
		setInputValue("");
	};

	const removeTag = (index: number) => {
		onChange(tags.filter((_, i) => i !== index));
	};

	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			<div className="border-input bg-transparent flex min-h-8 flex-wrap items-center gap-1 rounded-lg border px-2 py-1">
				{tags.map((tag, index) => (
					<span
						key={`tag-${tag}`}
						className="bg-muted text-foreground inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs"
					>
						{tag}
						<Button
							variant="ghost"
							size="icon-sm"
							className="text-muted-foreground hover:text-destructive size-3.5"
							onClick={() => removeTag(index)}
							disabled={disabled}
							aria-label={`Remove tag ${tag}`}
						>
							<XIcon className="size-2.5" />
						</Button>
					</span>
				))}
				<Input
					value={inputValue}
					onChange={(e) => setInputValue(e.target.value)}
					onKeyDown={handleKeyDown}
					onBlur={addTag}
					placeholder={tags.length === 0 ? placeholder : ""}
					className="h-5 min-w-[80px] flex-1 border-0 px-0 py-0 text-xs shadow-none focus-visible:ring-0"
					disabled={disabled}
				/>
			</div>
		</div>
	);
}

export type { TagInputProps };
export { TagInput };

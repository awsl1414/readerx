"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

type FormFieldProps = {
	readonly id: string;
	readonly label: string;
	readonly type: "text" | "textarea" | "switch" | "select";
	readonly value: unknown;
	readonly onChange: (value: unknown) => void;
	readonly placeholder?: string;
	readonly required?: boolean;
	readonly monospace?: boolean;
	readonly disabled?: boolean;
	readonly options?: readonly {
		readonly label: string;
		readonly value: string;
	}[];
	readonly className?: string;
	readonly description?: string;
};

function FormField({
	id,
	label,
	type,
	value,
	onChange,
	placeholder,
	required,
	monospace,
	disabled,
	options,
	className,
	description,
}: FormFieldProps) {
	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			{type === "switch" ? (
				<div className="flex items-center gap-2">
					<Switch
						id={id}
						checked={Boolean(value)}
						onCheckedChange={(checked: boolean) => onChange(checked)}
						disabled={disabled}
						size="sm"
					/>
					<div className="flex flex-col">
						<Label htmlFor={id} className="cursor-pointer">
							{label}
						</Label>
						{description && (
							<p className="text-muted-foreground text-xs">{description}</p>
						)}
					</div>
				</div>
			) : (
				<>
					<Label htmlFor={id}>
						{label}
						{required && <span className="text-destructive ml-0.5">*</span>}
					</Label>
					{description && (
						<p className="text-muted-foreground text-xs">{description}</p>
					)}
					{renderInput()}
				</>
			)}
		</div>
	);

	function renderInput(): ReactNode {
		switch (type) {
			case "text":
				return (
					<Input
						id={id}
						value={String(value ?? "")}
						onChange={(e) => onChange(e.target.value)}
						placeholder={placeholder}
						required={required}
						disabled={disabled}
					/>
				);
			case "textarea":
				return (
					<Textarea
						id={id}
						value={String(value ?? "")}
						onChange={(e) => onChange(e.target.value)}
						placeholder={placeholder}
						required={required}
						disabled={disabled}
						className={cn(monospace && "font-mono text-xs")}
					/>
				);
			case "select":
				return (
					<Select
						value={String(value ?? "")}
						onValueChange={(v) => onChange(v)}
						disabled={disabled ?? false}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder={placeholder} />
						</SelectTrigger>
						<SelectContent>
							{options?.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				);
			default:
				return null;
		}
	}
}

export type { FormFieldProps };
export { FormField };

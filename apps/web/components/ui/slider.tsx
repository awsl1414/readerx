"use client";

import { Slider as SliderPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/cn";

function Slider({
	className,
	defaultValue,
	value,
	min = 0,
	max = 100,
	...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
	const _values = React.useMemo(
		() =>
			Array.isArray(value)
				? value
				: Array.isArray(defaultValue)
					? defaultValue
					: [min, max],
		[value, defaultValue, min, max],
	);

	const conditionalProps = {
		...(defaultValue !== undefined ? { defaultValue } : {}),
		...(value !== undefined ? { value } : {}),
	};

	return (
		<SliderPrimitive.Root
			data-slot="slider"
			{...conditionalProps}
			min={min}
			max={max}
			className={cn(
				"relative flex w-full touch-none items-center select-none",
				"data-[disabled]:opacity-50",
				className,
			)}
			{...props}
		>
			<SliderPrimitive.Track
				data-slot="slider-track"
				className="bg-muted relative h-1.5 w-full grow rounded-full"
			>
				<SliderPrimitive.Range
					data-slot="slider-range"
					className="bg-primary absolute h-full rounded-full"
				/>
			</SliderPrimitive.Track>
			{_values.map((val, index) => (
				<SliderPrimitive.Thumb
					data-slot="slider-thumb"
					key={`thumb-${val}`}
					className="border-primary bg-background ring-ring/50 block size-4 rounded-full border-2 shadow-sm transition-colors focus-visible:ring-4 focus-visible:outline-none disabled:pointer-events-none"
				/>
			))}
		</SliderPrimitive.Root>
	);
}

export { Slider };

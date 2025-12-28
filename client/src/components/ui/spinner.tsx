import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const spinnerVariants = cva(
	"inline-flex shrink-0 animate-spin rounded-full border-[3px] border-muted-foreground/30 border-t-primary",
	{
		variants: {
			size: {
				sm: "h-4 w-4",
				md: "h-5 w-5",
				lg: "h-6 w-6",
			},
		},
		defaultVariants: {
			size: "md",
		},
	},
);

type SpinnerProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof spinnerVariants>;

export function Spinner({ className, size, ...props }: SpinnerProps) {
	return (
		<span
			role="status"
			aria-live="polite"
			className={cn(spinnerVariants({ size }), className)}
			{...props}
		/>
	);
}

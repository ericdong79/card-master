import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type ReviewPageShellProps = {
	backPath: string;
	backLabel: string;
	error: string | null;
	loading: boolean;
	loadingLabel: string;
	isComplete: boolean;
	hasCurrentCard: boolean;
	summary: ReactNode;
	children: ReactNode;
};

export function ReviewPageShell({
	backPath,
	backLabel,
	error,
	loading,
	loadingLabel,
	isComplete,
	hasCurrentCard,
	summary,
	children,
}: ReviewPageShellProps) {
	return (
		<div className="min-h-dvh bg-muted/20">
			<header className="border-b bg-background/80 backdrop-blur">
				<div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
					<Button variant="ghost" size="sm" asChild>
						<Link to={backPath}>{backLabel}</Link>
					</Button>
				</div>
			</header>

			<main className="mx-auto max-w-3xl px-6 py-8">
				{error ? (
					<div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						{error}
					</div>
				) : null}

				{loading ? (
					<div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
						<Spinner />
						<span>{loadingLabel}</span>
					</div>
				) : isComplete || !hasCurrentCard ? (
					summary
				) : (
					children
				)}
			</main>
		</div>
	);
}

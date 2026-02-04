import { Link, Navigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ReviewCard } from "@/features/review/components/review-card";
import { ReviewSummary } from "@/features/review/components/review-summary";
import { useReviewSession } from "@/features/review/hooks/use-review-session";

export function PackReviewPage() {
	const { cardPackId } = useParams<{ cardPackId: string }>();
	const session = useReviewSession(cardPackId);

	if (!cardPackId) {
		return <Navigate to="/" replace />;
	}

	const current = session.currentCard;

	return (
		<div className="min-h-screen bg-muted/20">
			{/* Minimal header */}
			<header className="border-b bg-background/80 backdrop-blur">
				<div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
					<Button variant="ghost" size="sm" asChild>
						<Link to={`/pack/${cardPackId}/cards`}>← Back</Link>
					</Button>
				</div>
			</header>

			<main className="mx-auto max-w-3xl px-6 py-8">
				{session.error ? (
					<div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						{session.error}
					</div>
				) : null}

				{session.loading ? (
					<div className="flex items-center justify-center gap-2 text-muted-foreground py-12">
						<Spinner />
						<span>Loading review queue...</span>
					</div>
				) : session.isComplete || !current ? (
					<ReviewSummary
						packName={session.cardPack?.name ?? null}
						totalReviewed={session.totalReviewed}
					/>
				) : (
					<ReviewCard
						mode="sm2"
						card={current}
						packName={session.cardPack?.name}
						learnedCount={session.completedCount}
						totalCards={session.totalCards}
						onGrade={session.handleGrade}
						isProcessing={session.grading}
					/>
				)}
			</main>
		</div>
	);
}

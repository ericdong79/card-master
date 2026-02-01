import { Link, Navigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

	// Calculate remaining count based on session state
	const remainingCount = session.isComplete
		? 0
		: session.cards.filter((c) => c.id !== current?.id).length + (current ? 1 : 0);

	return (
		<div className="min-h-screen bg-muted/20">
			<header className="border-b bg-background/80 backdrop-blur">
				<div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Link to="/" className="underline underline-offset-4">
								Card packs
							</Link>
							<span>/</span>
							<Link to={`/pack/${cardPackId}/cards`} className="underline underline-offset-4">
								{session.cardPack?.name ?? "Cards"}
							</Link>
							<span>/</span>
							<span className="text-foreground">Review</span>
						</div>
						<h1 className="text-2xl font-semibold">Review</h1>
						<p className="text-sm text-muted-foreground">
							Study due cards for today.
						</p>
					</div>
					<Button variant="outline" asChild>
						<Link to={`/pack/${cardPackId}/cards`}>Back to cards</Link>
					</Button>
				</div>
			</header>

			<main className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8">
				{session.error ? (
					<div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						{session.error}
					</div>
				) : null}

				{session.loading ? (
					<div className="flex items-center gap-2 text-muted-foreground">
						<Spinner />
						<span>Loading review queue...</span>
					</div>
				) : session.isComplete || !current ? (
					<ReviewSummary
						packName={session.cardPack?.name ?? null}
						totalReviewed={session.totalReviewed}
					/>
				) : (
					<>
						<Card>
							<CardHeader className="pb-4">
								<CardTitle className="text-xl">{session.cardPack?.name ?? "Card pack"}</CardTitle>
								<CardDescription>
									Reviewing cards • {session.totalReviewed} completed
								</CardDescription>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">
									Learning cards will reappear until you graduate them.
								</p>
							</CardContent>
						</Card>
						<ReviewCard
							card={current}
							queuePosition={{
								index: session.totalReviewed,
								total: session.totalReviewed + remainingCount,
							}}
							onGrade={session.handleGrade}
							grading={session.grading}
						/>
					</>
				)}
			</main>
		</div>
	);
}

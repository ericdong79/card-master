import { Link, Navigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { QuickReviewCard } from "@/features/review/components/quick-review-card";
import { ReviewSummary } from "@/features/review/components/review-summary";
import { useQuickReview } from "@/features/review/hooks/use-quick-review";

export function QuickReviewPage() {
	const { cardPackId } = useParams<{ cardPackId: string }>();
	const session = useQuickReview(cardPackId);

	if (!cardPackId) {
		return <Navigate to="/" replace />;
	}

	const current = session.currentCard;

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
							<span className="text-foreground">Quick Review</span>
						</div>
						<h1 className="text-2xl font-semibold">Quick Review</h1>
						<p className="text-sm text-muted-foreground">
							Quick self-test mode. Does not affect study schedule.
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" asChild>
							<Link to={`/pack/${cardPackId}/review`}>Normal Review</Link>
						</Button>
						<Button variant="outline" asChild>
							<Link to={`/pack/${cardPackId}/cards`}>Back to cards</Link>
						</Button>
					</div>
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
						<span>Loading cards...</span>
					</div>
				) : session.isComplete || !current ? (
					<ReviewSummary
						packName={session.cardPack?.name ?? null}
						totalReviewed={session.position.total}
						mode="quick"
						forgotCards={session.forgotCards}
					/>
				) : (
					<>
						<Card>
							<CardHeader className="pb-4">
								<CardTitle className="text-xl">{session.cardPack?.name ?? "Card pack"}</CardTitle>
								<CardDescription>
									Quick Review • {session.position.current} / {session.totalCards} cards
								</CardDescription>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">
									Test yourself without affecting your study schedule.
									Cards you forgot will be shown again immediately.
								</p>
							</CardContent>
						</Card>
						<QuickReviewCard
							card={current}
							queuePosition={session.position}
							onReview={session.handleReview}
							reviewing={session.reviewing}
							forgotCount={session.forgotCards.length}
						/>
					</>
				)}
			</main>
		</div>
	);
}

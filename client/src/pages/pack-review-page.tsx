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
		return <Navigate to="/protected" replace />;
	}

	if (session.userLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-muted/20">
				<div className="flex items-center gap-2 text-muted-foreground">
					<Spinner />
					<span>Loading your account...</span>
				</div>
			</div>
		);
	}

	if (!session.userId || session.userError) {
		return <Navigate to="/login" replace />;
	}

	const current = session.queue[0] ?? null;

	return (
		<div className="min-h-screen bg-muted/20">
			<header className="border-b bg-background/80 backdrop-blur">
				<div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Link to="/protected" className="underline underline-offset-4">
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
				) : session.queue.length === 0 ? (
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
									{session.queue.length} due card{session.queue.length === 1 ? "" : "s"} remaining
								</CardDescription>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">
									Work through today&apos;s due cards. Grades update scheduling state in real time.
								</p>
							</CardContent>
						</Card>
						{current ? (
							<ReviewCard
								card={current}
								queuePosition={{ index: 0, total: session.queue.length }}
								onGrade={session.handleGrade}
								grading={session.grading}
							/>
						) : null}
					</>
				)}
			</main>
		</div>
	);
}

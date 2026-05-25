import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
	getMasteryPresentationEnabled,
	getMasteryThemePreference,
} from "@/features/mastery";
import { useProfile } from "@/features/profile/profile-context";
import { MasteryToast } from "@/features/review/components/mastery-toast";
import { Spinner } from "@/components/ui/spinner";
import { ReviewCard } from "@/features/review/components/review-card";
import { ReviewSummary } from "@/features/review/components/review-summary";
import { useReviewSession } from "@/features/review/hooks/use-review-session";

export function PackReviewPage() {
	const { t } = useTranslation();
	const { cardPackId } = useParams<{ cardPackId: string }>();
	const navigate = useNavigate();
	const { currentProfile } = useProfile();
	const session = useReviewSession(cardPackId);
	const [toastFeedback, setToastFeedback] = useState<typeof session.lastMasteryFeedback>(null);
	const masteryEnabled = currentProfile
		? getMasteryPresentationEnabled(currentProfile.id)
		: false;
	const masteryThemeId = currentProfile
		? getMasteryThemePreference(currentProfile.id)
		: null;

	useEffect(() => {
		if (!session.lastMasteryFeedback || !masteryEnabled) return;
		setToastFeedback(session.lastMasteryFeedback);
		const timer = window.setTimeout(() => {
			setToastFeedback(null);
		}, 2800);
		return () => window.clearTimeout(timer);
	}, [session.lastMasteryFeedback, masteryEnabled]);

	useEffect(() => {
		if (!cardPackId) return;
		if (session.loading || session.error) return;
		if (!session.isComplete) return;
		if (session.totalReviewed > 0) return;
		if (session.cards.length === 0) return;
		if (session.totalCards > 0) return;
		navigate(`/pack/${cardPackId}/quick-review`, { replace: true });
	}, [
		cardPackId,
		navigate,
		session.cards.length,
		session.error,
		session.isComplete,
		session.loading,
		session.totalCards,
		session.totalReviewed,
	]);

	if (!cardPackId) {
		return <Navigate to="/" replace />;
	}

	const current = session.currentCard;

	return (
		<div className="min-h-dvh bg-muted/20">
			{/* Minimal header */}
			<header className="border-b bg-background/80 backdrop-blur">
				<div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
					<Button variant="ghost" size="sm" asChild>
						<Link to={`/pack/${cardPackId}/cards`}>{t("review.back")}</Link>
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
						<span>{t("review.loadingQueue")}</span>
					</div>
				) : session.isComplete || !current ? (
					<ReviewSummary
						packName={session.cardPack?.name ?? null}
						totalReviewed={session.totalReviewed}
						backToCardsPath={`/pack/${cardPackId}/cards`}
					/>
				) : (
					<ReviewCard
						key={current.id}
						mode="sm2"
						card={current}
						packName={session.cardPack?.name}
						packType={session.cardPack?.type}
						learnedCount={session.completedCount}
						totalCards={session.totalCards}
						onGrade={session.handleGrade}
						onSkip={session.handleSkip}
						isProcessing={session.grading}
						state={session.currentCardState}
						params={session.params}
					/>
				)}
			</main>
			{masteryEnabled && toastFeedback ? (
				<MasteryToast feedback={toastFeedback} themeId={masteryThemeId} />
			) : null}
		</div>
	);
}

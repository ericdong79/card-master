import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import {
	getMasteryPresentationEnabled,
	getMasteryThemePreference,
} from "@/features/mastery";
import { useProfile } from "@/features/profile/profile-context";
import { MasteryToast } from "@/features/review/components/mastery-toast";
import { ReviewCard } from "@/features/review/components/review-card";
import { ReviewPageShell } from "@/features/review/components/review-page-shell";
import { ReviewSummary } from "@/features/review/components/review-summary";
import { useMasteryToast } from "@/features/review/hooks/use-mastery-toast";
import { useReviewSession } from "@/features/review/hooks/use-review-session";

export function PackReviewPage() {
	const { t } = useTranslation();
	const { cardPackId } = useParams<{ cardPackId: string }>();
	const navigate = useNavigate();
	const { currentProfile } = useProfile();
	const session = useReviewSession(cardPackId);
	const masteryEnabled = currentProfile
		? getMasteryPresentationEnabled(currentProfile.id)
		: false;
	const masteryThemeId = currentProfile
		? getMasteryThemePreference(currentProfile.id)
		: null;
	const toastFeedback = useMasteryToast(
		session.lastMasteryFeedback,
		masteryEnabled,
	);

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
		<>
			<ReviewPageShell
				backPath={`/pack/${cardPackId}/cards`}
				backLabel={t("review.back")}
				error={session.error}
				loading={session.loading}
				loadingLabel={t("review.loadingQueue")}
				isComplete={session.isComplete}
				hasCurrentCard={Boolean(current)}
				summary={
					<ReviewSummary
						packName={session.cardPack?.name ?? null}
						totalReviewed={session.totalReviewed}
						backToCardsPath={`/pack/${cardPackId}/cards`}
					/>
				}
			>
				{current ? (
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
				) : null}
			</ReviewPageShell>
			{masteryEnabled && toastFeedback ? (
				<MasteryToast feedback={toastFeedback} themeId={masteryThemeId} />
			) : null}
		</>
	);
}

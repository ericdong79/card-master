import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import { ReviewCard } from "@/features/review/components/review-card";
import { ReviewPageShell } from "@/features/review/components/review-page-shell";
import { ReviewSummary } from "@/features/review/components/review-summary";
import { useQuickReview } from "@/features/review/hooks/use-quick-review";

export function QuickReviewPage() {
	const { t } = useTranslation();
	const { cardPackId } = useParams<{ cardPackId: string }>();
	const session = useQuickReview(cardPackId);

	if (!cardPackId) {
		return <Navigate to="/" replace />;
	}

	const current = session.currentCard;

	return (
		<ReviewPageShell
			backPath={`/pack/${cardPackId}/cards`}
			backLabel={t("review.back")}
			error={session.error}
			loading={session.loading}
			loadingLabel={t("common.loadingCards")}
			isComplete={session.isComplete}
			hasCurrentCard={Boolean(current)}
			summary={
				<ReviewSummary
					packName={session.cardPack?.name ?? null}
					totalReviewed={session.position.total}
					backToCardsPath={`/pack/${cardPackId}/cards`}
					mode="quick"
					forgotCards={session.forgotCards}
				/>
			}
		>
			{current ? (
				<ReviewCard
					key={current.id}
					mode="simple"
					card={current}
					packName={session.cardPack?.name}
					packType={session.cardPack?.type}
					learnedCount={session.learnedCount}
					totalCards={session.totalCards}
					onReview={session.handleReview}
					onSkip={session.skipCurrent}
					isProcessing={session.reviewing}
				/>
			) : null}
		</ReviewPageShell>
	);
}

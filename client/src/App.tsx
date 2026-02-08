import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/app-shell";
import { Spinner } from "@/components/ui/spinner";
import { HomePage } from "@/pages/home-page";
import { PackCardsPage } from "@/pages/pack-cards-page";
import { PackReviewPage } from "@/pages/pack-review-page";
import { PreferencesPage } from "@/pages/preferences-page";
import { QuickReviewPage } from "@/pages/quick-review-page";

const QuickStartPage = lazy(() => import("@/pages/quick-start-page"));
const QuickStartFirstStepsPage = lazy(
	() => import("@/pages/quick-start/first-steps-page"),
);
const QuickStartWorkflowPage = lazy(
	() => import("@/pages/quick-start/workflow-page"),
);
const QuickStartMemoryCurvePage = lazy(
	() => import("@/pages/quick-start/memory-curve-page"),
);
const QuickStartFaqPage = lazy(() => import("@/pages/quick-start/faq-page"));

function RouteFallback() {
	return (
		<div className="flex min-h-[40vh] items-center justify-center">
			<Spinner size="lg" />
		</div>
	);
}

function App() {
	return (
		<Routes>
			<Route element={<AppShell />}>
				<Route path="/" element={<HomePage />} />
				<Route path="/pack/:cardPackId/cards" element={<PackCardsPage />} />
				<Route path="/pack/:cardPackId/review" element={<PackReviewPage />} />
				<Route path="/pack/:cardPackId/quick-review" element={<QuickReviewPage />} />
				<Route
					path="/quick-start"
					element={
						<Suspense fallback={<RouteFallback />}>
							<QuickStartPage />
						</Suspense>
					}
				>
					<Route index element={<Navigate to="first-steps" replace />} />
					<Route
						path="first-steps"
						element={
							<Suspense fallback={<RouteFallback />}>
								<QuickStartFirstStepsPage />
							</Suspense>
						}
					/>
					<Route
						path="workflow"
						element={
							<Suspense fallback={<RouteFallback />}>
								<QuickStartWorkflowPage />
							</Suspense>
						}
					/>
					<Route
						path="memory-curve"
						element={
							<Suspense fallback={<RouteFallback />}>
								<QuickStartMemoryCurvePage />
							</Suspense>
						}
					/>
					<Route
						path="faq"
						element={
							<Suspense fallback={<RouteFallback />}>
								<QuickStartFaqPage />
							</Suspense>
						}
					/>
				</Route>
				<Route path="/preferences" element={<PreferencesPage />} />
				<Route path="*" element={<Navigate to="/" replace />} />
			</Route>
		</Routes>
	);
}

export default App;

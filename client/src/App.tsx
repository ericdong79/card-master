import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/app-shell";
import { Spinner } from "@/components/ui/spinner";
const HomePage = lazy(() =>
	import("@/pages/home-page").then((module) => ({ default: module.HomePage })),
);
const PackCardsPage = lazy(() =>
	import("@/pages/pack-cards-page").then((module) => ({
		default: module.PackCardsPage,
	})),
);
const PackReviewPage = lazy(() =>
	import("@/pages/pack-review-page").then((module) => ({
		default: module.PackReviewPage,
	})),
);
const QuickReviewPage = lazy(() =>
	import("@/pages/quick-review-page").then((module) => ({
		default: module.QuickReviewPage,
	})),
);
const PreferencesPage = lazy(() =>
	import("@/pages/preferences-page").then((module) => ({
		default: module.PreferencesPage,
	})),
);

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
				<Route
					path="/"
					element={
						<Suspense fallback={<RouteFallback />}>
							<HomePage />
						</Suspense>
					}
				/>
				<Route
					path="/pack/:cardPackId/cards"
					element={
						<Suspense fallback={<RouteFallback />}>
							<PackCardsPage />
						</Suspense>
					}
				/>
				<Route
					path="/pack/:cardPackId/review"
					element={
						<Suspense fallback={<RouteFallback />}>
							<PackReviewPage />
						</Suspense>
					}
				/>
				<Route
					path="/pack/:cardPackId/quick-review"
					element={
						<Suspense fallback={<RouteFallback />}>
							<QuickReviewPage />
						</Suspense>
					}
				/>
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
				<Route
					path="/preferences"
					element={
						<Suspense fallback={<RouteFallback />}>
							<PreferencesPage />
						</Suspense>
					}
				/>
				<Route path="*" element={<Navigate to="/" replace />} />
			</Route>
		</Routes>
	);
}

export default App;

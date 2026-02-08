import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/app-shell";
import { HomePage } from "@/pages/home-page";
import { PackCardsPage } from "@/pages/pack-cards-page";
import { PackReviewPage } from "@/pages/pack-review-page";
import { PreferencesPage } from "@/pages/preferences-page";
import { QuickReviewPage } from "@/pages/quick-review-page";
import { QuickStartPage } from "@/pages/quick-start-page";

function App() {
	return (
		<Routes>
			<Route element={<AppShell />}>
				<Route path="/" element={<HomePage />} />
				<Route path="/pack/:cardPackId/cards" element={<PackCardsPage />} />
				<Route path="/pack/:cardPackId/review" element={<PackReviewPage />} />
				<Route path="/pack/:cardPackId/quick-review" element={<QuickReviewPage />} />
				<Route path="/quick-start" element={<QuickStartPage />} />
				<Route path="/preferences" element={<PreferencesPage />} />
				<Route path="*" element={<Navigate to="/" replace />} />
			</Route>
		</Routes>
	);
}

export default App;

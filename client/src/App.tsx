import { Navigate, Route, Routes } from "react-router-dom";

import { HomePage } from "@/pages/home-page";
import { PackCardsPage } from "@/pages/pack-cards-page";
import { PackReviewPage } from "@/pages/pack-review-page";
import { QuickReviewPage } from "@/pages/quick-review-page";

function App() {
	return (
		<Routes>
			<Route path="/" element={<HomePage />} />
			<Route path="/pack/:cardPackId/cards" element={<PackCardsPage />} />
			<Route path="/pack/:cardPackId/review" element={<PackReviewPage />} />
			<Route path="/pack/:cardPackId/quick-review" element={<QuickReviewPage />} />
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}

export default App;

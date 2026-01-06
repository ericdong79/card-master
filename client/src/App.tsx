import { Navigate, Route, Routes } from "react-router-dom";

import { HomePage } from "@/pages/home-page";
import { PackCardsPage } from "@/pages/pack-cards-page";
import { PackReviewPage } from "@/pages/pack-review-page";

function App() {
	return (
		<Routes>
			<Route path="/" element={<HomePage />} />
			<Route path="/pack/:cardPackId/cards" element={<PackCardsPage />} />
			<Route path="/pack/:cardPackId/review" element={<PackReviewPage />} />
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}

export default App;

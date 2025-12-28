import { useEffect } from "react";
import { supabase } from "./utils/supabase";

function App() {
	useEffect(() => {
		async function getTodos() {
			const { data: cards } = await supabase.from("card").select();

			console.log(cards);
		}

		getTodos();
	}, []);

	return <div></div>;
}
export default App;

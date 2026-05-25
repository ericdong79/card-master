export const FIRESTORE_IN_FILTER_LIMIT = 10;

export function chunkFirestoreInValues(values: string[]): string[][] {
	const uniqueValues = Array.from(new Set(values)).filter(
		(value) => value.length > 0,
	);
	const chunks: string[][] = [];
	for (
		let index = 0;
		index < uniqueValues.length;
		index += FIRESTORE_IN_FILTER_LIMIT
	) {
		chunks.push(uniqueValues.slice(index, index + FIRESTORE_IN_FILTER_LIMIT));
	}
	return chunks;
}

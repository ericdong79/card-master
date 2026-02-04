type PackCardsErrorProps = {
	message: string;
};

export function PackCardsError({ message }: PackCardsErrorProps) {
	return (
		<div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
			{message}
		</div>
	);
}

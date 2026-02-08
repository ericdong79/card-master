import { cn } from "@/lib/utils";

type HanziPracticeGridProps = {
	answerText: string;
	pinyinSyllables?: string[];
	size?: "medium" | "large";
	className?: string;
};

const HANZI_FONT_FAMILY =
	'"STKaiti", "KaiTi", "Kaiti SC", "Noto Serif SC", serif';

function getCharacters(answerText: string): string[] {
	return Array.from(answerText).filter((char) => char.trim().length > 0);
}

export function HanziPracticeGrid({
	answerText,
	pinyinSyllables,
	size = "medium",
	className,
}: HanziPracticeGridProps) {
	const characters = getCharacters(answerText);
	const showPinyin = Boolean(pinyinSyllables?.length);

	if (!characters.length) return null;

	const itemWidth = size === "large" ? "w-[5.25rem]" : "w-16";
	const cellSize = size === "large" ? "h-[5.25rem] w-[5.25rem]" : "h-16 w-16";

	return (
		<div
			className={cn("flex flex-wrap gap-x-3 gap-y-2 justify-center", className)}
		>
			{characters.map((char, index) => (
				<div
					key={`${char}-${index}`}
					className={cn("flex flex-col items-center gap-1", itemWidth)}
				>
					{showPinyin ? (
						<span className="min-h-5 text-center text-base leading-none tracking-tight text-muted-foreground">
							{pinyinSyllables?.[index] || "\u00A0"}
						</span>
					) : null}
					<div
						className={cn(
							"relative flex items-center justify-center rounded-sm border bg-background",
							cellSize,
						)}
						aria-label={`Hanzi character ${char}`}
					>
						<svg
							className="pointer-events-none absolute inset-0 text-border/70"
							viewBox="0 0 100 100"
							aria-hidden="true"
						>
							<line
								x1="50"
								y1="0"
								x2="50"
								y2="100"
								stroke="currentColor"
								strokeWidth="1.5"
							/>
							<line
								x1="0"
								y1="50"
								x2="100"
								y2="50"
								stroke="currentColor"
								strokeWidth="1.5"
							/>
							<line
								x1="0"
								y1="0"
								x2="100"
								y2="100"
								stroke="currentColor"
								strokeWidth="1.25"
							/>
							<line
								x1="100"
								y1="0"
								x2="0"
								y2="100"
								stroke="currentColor"
								strokeWidth="1.25"
							/>
						</svg>
						<span
							className="relative leading-none tracking-wide text-foreground"
							style={{
								fontSize: "3rem",
								fontFamily: HANZI_FONT_FAMILY,
							}}
						>
							{char}
						</span>
					</div>
				</div>
			))}
		</div>
	);
}

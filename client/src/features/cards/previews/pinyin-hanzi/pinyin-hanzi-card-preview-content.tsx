import { CardDescription } from "@/components/ui/card";
import type { CardPreviewContentProps } from "@/features/cards/components/card-preview-content";
import { cn } from "@/lib/utils";

const PINYIN_SYLLABLE_PATTERN = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF\u00FC\u00DCvV]+[1-5]?/g;

function splitPinyinSyllables(pinyin: string): string[] {
	return pinyin.match(PINYIN_SYLLABLE_PATTERN) ?? [];
}

export function PinyinHanziCardPreviewContent({
	questionText,
	answerText,
	noAnswerText,
}: CardPreviewContentProps) {
	const characters = Array.from(answerText).filter(
		(char) => char.trim().length > 0,
	);
	const pinyinSyllables = splitPinyinSyllables(questionText);

	return (
		<CardDescription className={cn(!answerText && "italic")}>
			{answerText ? (
				<div className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
					{characters.map((char, index) => (
						<div
							key={`${char}-${index}`}
							className="flex w-16 flex-col items-center gap-1"
						>
							<span className="min-h-5 text-center text-base leading-none tracking-tight text-muted-foreground">
								{pinyinSyllables[index] || "\u00A0"}
							</span>
							<div className="relative flex h-16 w-16 items-center justify-center rounded-sm border bg-background">
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
										fontFamily:
											'"STKaiti", "KaiTi", "Kaiti SC", "Noto Serif SC", serif',
									}}
								>
									{char}
								</span>
							</div>
						</div>
					))}
				</div>
			) : (
				noAnswerText
			)}
		</CardDescription>
	);
}

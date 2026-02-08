import { CardDescription } from "@/components/ui/card";
import type { CardPreviewContentProps } from "@/features/cards/components/card-preview-content";
import { cn } from "@/lib/utils";
import { HanziPracticeGrid } from "./hanzi-practice-grid";
import { splitPinyinSyllables } from "./pinyin-utils";

export function PinyinHanziCardPreviewContent({
	questionText,
	answerText,
	noAnswerText,
}: CardPreviewContentProps) {
	const pinyinSyllables = splitPinyinSyllables(questionText);

	return (
		<CardDescription className={cn(!answerText && "italic")}>
			{answerText ? (
				<HanziPracticeGrid
					answerText={answerText}
					pinyinSyllables={pinyinSyllables}
					size="medium"
					className="mt-2"
				/>
			) : (
				noAnswerText
			)}
		</CardDescription>
	);
}

import type { ReactNode } from "react";
import type { CardPackType } from "@/lib/api/entities/card-pack";
import { resolveCardPackType } from "@/lib/api/entities/card-pack";
import { PinyinHanziCardPreviewContent } from "./pinyin-hanzi/pinyin-hanzi-card-preview-content";
import type { CardPreviewContentProps } from "../components/card-preview-content";

export type CardPreviewRenderer = (props: CardPreviewContentProps) => ReactNode;

const cardPreviewRegistry: Partial<Record<CardPackType, CardPreviewRenderer>> = {
	"pinyin-hanzi": PinyinHanziCardPreviewContent,
};

export function getCardPreviewRenderer(
	packType: CardPackType | undefined,
): CardPreviewRenderer | undefined {
	return cardPreviewRegistry[resolveCardPackType(packType)];
}

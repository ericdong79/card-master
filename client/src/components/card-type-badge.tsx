import { BookText, Image, Languages, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { type CardPackType, resolveCardPackType } from "@/lib/api/entities/card-pack";
import { getCardPackTypeLabel } from "@/lib/cards/card-type-registry";
import { cn } from "@/lib/utils";

type CardTypeBadgeProps = {
	type?: CardPackType;
	className?: string;
};

const typeIconMap: Record<CardPackType, LucideIcon> = {
	basic: BookText,
	"image-recall": Image,
	"pinyin-hanzi": Languages,
};

export function CardTypeBadge({ type, className }: CardTypeBadgeProps) {
	const { t } = useTranslation();
	const normalizedType = resolveCardPackType(type);
	const Icon = typeIconMap[normalizedType];
	const label = getCardPackTypeLabel(normalizedType);

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground",
				className,
			)}
			aria-label={t("home.createPack.type")}
			title={label}
		>
			<Icon className="size-3.5" />
			<span>{label}</span>
		</span>
	);
}

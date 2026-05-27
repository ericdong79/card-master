import { Menu } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SidebarPanel, type SidebarPanelProps } from "./sidebar-panel";

export type MobileSidebarProps = Omit<
	SidebarPanelProps,
	"collapsed" | "onToggleCollapse" | "onNavigate" | "onOpenUserMenu"
> & {
	onOpenUserMenu: () => void;
};

/**
 * Mobile-only top bar with a hamburger that opens a slide-out copy of
 * the sidebar. Owns its own open state.
 */
export function MobileSidebar({
	currentUserName,
	currentUserAvatar,
	dailyReviewProgress,
	onOpenUserMenu,
}: MobileSidebarProps) {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);

	return (
		<>
			<header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur md:hidden">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setOpen(true)}
					aria-label={t("sidebar.actions.openMobile")}
				>
					<Menu className="size-5" />
				</Button>
				<div className="text-sm font-semibold">{t("brand.name")}</div>
				<div className="w-9" />
			</header>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="left-0 top-0 h-dvh w-[84vw] max-w-[320px] translate-x-0 translate-y-0 rounded-none border-y-0 border-l-0 p-0">
					<DialogTitle className="sr-only">{t("sidebar.title")}</DialogTitle>
					<SidebarPanel
						collapsed={false}
						currentUserName={currentUserName}
						currentUserAvatar={currentUserAvatar}
						dailyReviewProgress={dailyReviewProgress}
						onNavigate={() => setOpen(false)}
						onOpenUserMenu={() => {
							setOpen(false);
							onOpenUserMenu();
						}}
					/>
				</DialogContent>
			</Dialog>
		</>
	);
}

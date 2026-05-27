import {
	ChevronLeft,
	ChevronRight,
	CircleUserRound,
	House,
	Rocket,
} from "lucide-react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import logoImage from "@/assets/logo/logo.png";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
	to: string;
	label: string;
	icon: ComponentType<{ className?: string }>;
	match?: (pathname: string) => boolean;
};

function isRouteActive(pathname: string, item: NavItem) {
	if (item.match) {
		return item.match(pathname);
	}
	return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export type SidebarPanelProps = {
	collapsed: boolean;
	currentUserName: string;
	currentUserAvatar: string | null;
	dailyReviewProgress: {
		completed: number;
		goal: number;
		isMet: boolean;
	} | null;
	onToggleCollapse?: () => void;
	onNavigate?: () => void;
	onOpenUserMenu: () => void;
};

export function SidebarPanel({
	collapsed,
	currentUserName,
	currentUserAvatar,
	dailyReviewProgress,
	onToggleCollapse,
	onNavigate,
	onOpenUserMenu,
}: SidebarPanelProps) {
	const { t } = useTranslation();
	const { pathname } = useLocation();

	const navItems: NavItem[] = [
		{
			to: "/",
			label: t("sidebar.nav.cardPacks"),
			icon: House,
			match: (currentPath) =>
				currentPath === "/" || currentPath.startsWith("/pack/"),
		},
		{
			to: "/quick-start",
			label: t("sidebar.nav.quickStart"),
			icon: Rocket,
		},
	];

	return (
		<div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
			<div
				className={cn(
					"flex h-16 items-center border-b border-sidebar-border",
					collapsed ? "justify-center px-2" : "px-3",
				)}
			>
				{collapsed ? null : (
					<Link
						to="/"
						className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sidebar-foreground/90"
						onClick={onNavigate}
					>
						<img
							src={logoImage}
							alt={t("brand.name")}
							className="size-8 rounded-sm object-contain"
						/>
						<div className="min-w-0">
							<div className="truncate text-sm font-semibold">
								{t("brand.name")}
							</div>
						</div>
					</Link>
				)}
				{onToggleCollapse ? (
					<Button
						variant="ghost"
						size="icon-sm"
						className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
						onClick={onToggleCollapse}
						aria-label={
							collapsed
								? t("sidebar.actions.expand")
								: t("sidebar.actions.collapse")
						}
					>
						{collapsed ? (
							<ChevronRight className="size-4" />
						) : (
							<ChevronLeft className="size-4" />
						)}
					</Button>
				) : null}
			</div>

			<div className="flex-1 overflow-y-auto px-2 py-4">
				<nav className="space-y-1">
					{!collapsed ? (
						<p className="px-3 text-xs font-medium tracking-wide text-sidebar-foreground/60 uppercase">
							{t("sidebar.sections.navigation")}
						</p>
					) : null}
					{navItems.map((item) => {
						const active = isRouteActive(pathname, item);
						const Icon = item.icon;
						return (
							<Link
								key={item.to}
								to={item.to}
								onClick={onNavigate}
								title={collapsed ? item.label : undefined}
								className={cn(
									"flex items-center rounded-md px-3 py-2 text-sm transition-colors",
									collapsed ? "justify-center" : "gap-2",
									active
										? "bg-sidebar-primary text-sidebar-primary-foreground"
										: "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
								)}
							>
								<Icon className="size-4 shrink-0" />
								{collapsed ? null : (
									<span className="truncate">{item.label}</span>
								)}
							</Link>
						);
					})}
				</nav>
				{!collapsed && dailyReviewProgress ? (
					<div
						className={cn(
							"mt-4 rounded-md border px-3 py-2 text-sm",
							dailyReviewProgress.isMet
								? "border-emerald-400/50 bg-emerald-500/10 text-emerald-700"
								: "border-amber-400/50 bg-amber-500/10 text-amber-700",
						)}
					>
						<p className="text-xs text-sidebar-foreground/80">
							{t("sidebar.dailyGoal.title")}
						</p>
						<p className="font-semibold">
							{t("sidebar.dailyGoal.progress", {
								completed: dailyReviewProgress.completed,
								goal: dailyReviewProgress.goal,
							})}
						</p>
						<p className="text-xs text-sidebar-foreground/80">
							{dailyReviewProgress.isMet
								? t("sidebar.dailyGoal.met")
								: t("sidebar.dailyGoal.notMet")}
						</p>
					</div>
				) : null}
			</div>

			<div
				className={cn(
					"border-t border-sidebar-border",
					collapsed ? "p-0" : "p-3",
				)}
			>
				<button
					type="button"
					onClick={onOpenUserMenu}
					className={cn(
						"w-full cursor-pointer rounded-md transition-colors hover:bg-sidebar-accent/70",
						collapsed ? "py-3" : "px-1 py-1",
					)}
				>
					<div
						className={cn(
							"flex items-center rounded-md",
							collapsed
								? "justify-center border-0 bg-transparent"
								: "gap-3 border border-sidebar-border bg-sidebar-accent/40 px-3 py-2",
						)}
					>
						<div className="flex size-8 items-center justify-center rounded-full bg-sidebar-primary/90 text-sidebar-primary-foreground">
							{currentUserAvatar ? (
								<span className="text-base">{currentUserAvatar}</span>
							) : (
								<CircleUserRound className="size-4" />
							)}
						</div>
						{collapsed ? null : (
							<div className="min-w-0 text-left">
								<p className="truncate text-sm font-medium">
									{currentUserName}
								</p>
							</div>
						)}
					</div>
				</button>
			</div>
		</div>
	);
}

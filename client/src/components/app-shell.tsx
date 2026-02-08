import { type ComponentType, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
	BookCopy,
	CircleUserRound,
	ChevronLeft,
	ChevronRight,
	House,
	Menu,
	Rocket,
	Settings2,
} from "lucide-react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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

type SidebarPanelProps = {
	collapsed: boolean;
	onToggleCollapse?: () => void;
	onNavigate?: () => void;
};

function SidebarPanel({
	collapsed,
	onToggleCollapse,
	onNavigate,
}: SidebarPanelProps) {
	const { t } = useTranslation();
	const { pathname } = useLocation();

	const navItems: NavItem[] = [
		{
			to: "/",
			label: t("sidebar.nav.cardPacks"),
			icon: House,
			match: (currentPath) => currentPath === "/" || currentPath.startsWith("/pack/"),
		},
		{
			to: "/quick-start",
			label: t("sidebar.nav.quickStart"),
			icon: Rocket,
		},
	];

	const utilityItems: NavItem[] = [
		{
			to: "/preferences",
			label: t("sidebar.system.preferences"),
			icon: Settings2,
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
						<span className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
							<BookCopy className="size-4" />
						</span>
						<div className="min-w-0">
							<div className="truncate text-sm font-semibold">{t("brand.name")}</div>
							<div className="truncate text-xs text-sidebar-foreground/70">
								{t("brand.tagline")}
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
								{collapsed ? null : <span className="truncate">{item.label}</span>}
							</Link>
						);
					})}
				</nav>
			</div>

			<div className="space-y-2 border-t border-sidebar-border px-2 py-3">
					{!collapsed ? (
						<p className="px-3 text-xs font-medium tracking-wide text-sidebar-foreground/60 uppercase">
							{t("sidebar.sections.system")}
						</p>
					) : null}

					{utilityItems.map((item) => {
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
								{collapsed ? null : <span className="truncate">{item.label}</span>}
							</Link>
						);
					})}

					{collapsed ? null : (
						<div className="px-2 pt-1">
							<LanguageSwitcher className="w-full justify-between border-sidebar-border bg-sidebar-accent/30 shadow-none" />
						</div>
					)}
			</div>

			<div
				className={cn(
					"border-t border-sidebar-border",
					collapsed ? "p-0" : "p-3",
				)}
			>
				<div
					className={cn(
						"flex items-center rounded-md border border-sidebar-border bg-sidebar-accent/40",
						collapsed ? "justify-center border-0 bg-transparent py-3" : "gap-3 px-3 py-2",
					)}
				>
					<div className="flex size-8 items-center justify-center rounded-full bg-sidebar-primary/90 text-sidebar-primary-foreground">
						<CircleUserRound className="size-4" />
					</div>
					{collapsed ? null : (
						<div className="min-w-0">
							<p className="truncate text-sm font-medium">
								{t("sidebar.user.name")}
							</p>
							<p className="truncate text-xs text-sidebar-foreground/70">
								{t("sidebar.user.role")}
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export function AppShell() {
	const { t } = useTranslation();
	const [collapsed, setCollapsed] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);

	return (
		<div className="min-h-screen bg-muted/20">
			<div className="flex min-h-screen">
				<aside
					className={cn(
						"hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:block",
						collapsed ? "w-16" : "w-72",
					)}
				>
					<SidebarPanel
						collapsed={collapsed}
						onToggleCollapse={() => setCollapsed((prev) => !prev)}
					/>
				</aside>

				<div className="flex min-h-screen min-w-0 flex-1 flex-col">
					<header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur md:hidden">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setMobileOpen(true)}
							aria-label={t("sidebar.actions.openMobile")}
						>
							<Menu className="size-5" />
						</Button>
						<div className="text-sm font-semibold">{t("brand.name")}</div>
						<div className="w-9" />
					</header>

					<main className="flex-1">
						<Outlet />
					</main>
				</div>
			</div>

			<Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
				<DialogContent className="left-0 top-0 h-dvh w-[84vw] max-w-[320px] translate-x-0 translate-y-0 rounded-none border-y-0 border-l-0 p-0">
					<DialogTitle className="sr-only">{t("sidebar.title")}</DialogTitle>
					<SidebarPanel collapsed={false} onNavigate={() => setMobileOpen(false)} />
				</DialogContent>
			</Dialog>
		</div>
	);
}

import {
	ChevronLeft,
	ChevronRight,
	CircleUserRound,
	House,
	Menu,
	Rocket,
	Settings2,
	Users,
} from "lucide-react";
import { type ComponentType, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import logoImage from "@/assets/logo/logo.png";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CreateProfileDialog } from "@/features/profile/components/create-profile-dialog";
import { SwitchProfileDialog } from "@/features/profile/components/switch-profile-dialog";
import { useProfile } from "@/features/profile/profile-context";
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
	currentUserName: string;
	currentUserAvatar: string | null;
	onToggleCollapse?: () => void;
	onNavigate?: () => void;
	onOpenUserMenu: () => void;
};

function SidebarPanel({
	collapsed,
	currentUserName,
	currentUserAvatar,
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
							className="size-5 rounded-sm object-contain"
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

export function AppShell() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { ready, profiles, currentProfile, createProfile } = useProfile();
	const [collapsed, setCollapsed] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);
	const [userMenuOpen, setUserMenuOpen] = useState(false);
	const [switchProfileOpen, setSwitchProfileOpen] = useState(false);
	const [createProfileOpen, setCreateProfileOpen] = useState(false);

	const mustCreateProfile = ready && profiles.length === 0;

	useEffect(() => {
		if (mustCreateProfile) {
			setCreateProfileOpen(true);
		}
	}, [mustCreateProfile]);

	return (
		<div className="h-screen overflow-hidden bg-muted/20">
			<div className="flex h-full">
				<aside
					className={cn(
						"hidden h-screen border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:block",
						collapsed ? "w-16" : "w-72",
					)}
				>
					<SidebarPanel
						collapsed={collapsed}
						onToggleCollapse={() => setCollapsed((prev) => !prev)}
						currentUserName={
							currentProfile?.nickname ?? t("sidebar.user.defaultName")
						}
						currentUserAvatar={currentProfile?.avatar_emoji ?? null}
						onOpenUserMenu={() => setUserMenuOpen(true)}
					/>
				</aside>

				<div className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto">
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

					<main className="flex-1">{currentProfile ? <Outlet /> : null}</main>
				</div>
			</div>

			<Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
				<DialogContent className="left-0 top-0 h-dvh w-[84vw] max-w-[320px] translate-x-0 translate-y-0 rounded-none border-y-0 border-l-0 p-0">
					<DialogTitle className="sr-only">{t("sidebar.title")}</DialogTitle>
					<SidebarPanel
						collapsed={false}
						currentUserName={
							currentProfile?.nickname ?? t("sidebar.user.defaultName")
						}
						currentUserAvatar={currentProfile?.avatar_emoji ?? null}
						onNavigate={() => setMobileOpen(false)}
						onOpenUserMenu={() => {
							setMobileOpen(false);
							setUserMenuOpen(true);
						}}
					/>
				</DialogContent>
			</Dialog>

			<Dialog open={userMenuOpen} onOpenChange={setUserMenuOpen}>
				<DialogContent className="sm:max-w-sm">
					<DialogTitle>{t("profile.menu.title")}</DialogTitle>
					<div className="space-y-2 pt-2">
						<Button
							className="w-full justify-start"
							variant="outline"
							onClick={() => {
								setUserMenuOpen(false);
								setSwitchProfileOpen(true);
							}}
						>
							<Users className="size-4" />
							{t("profile.menu.switchUser")}
						</Button>
						<Button
							className="w-full justify-start"
							variant="outline"
							onClick={() => {
								setUserMenuOpen(false);
								navigate("/preferences");
							}}
						>
							<Settings2 className="size-4" />
							{t("profile.menu.preferences")}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<SwitchProfileDialog
				open={switchProfileOpen}
				onOpenChange={setSwitchProfileOpen}
				onCreateNew={() => setCreateProfileOpen(true)}
			/>

			<CreateProfileDialog
				open={createProfileOpen}
				onOpenChange={setCreateProfileOpen}
				allowClose={!mustCreateProfile}
				onCreate={(input) => {
					const isFirstProfile = profiles.length === 0;
					createProfile(input);
					setCreateProfileOpen(false);
					if (isFirstProfile) {
						navigate("/quick-start", { replace: true });
					}
				}}
			/>
		</div>
	);
}

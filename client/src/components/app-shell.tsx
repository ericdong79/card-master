import {
	ChevronLeft,
	ChevronRight,
	CircleUserRound,
	House,
	LogOut,
	Menu,
	Rocket,
	Settings2,
	UploadCloud,
	Users,
} from "lucide-react";
import {
	type ComponentType,
	useEffect,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import logoImage from "@/assets/logo/logo.png";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { LoginPage } from "@/features/auth/login-page";
import { useAuth } from "@/features/auth/use-auth";
import { LocalDataImportDialog } from "@/features/import/local-data-import-dialog";
import { CreateProfileDialog } from "@/features/profile/components/create-profile-dialog";
import { SwitchProfileDialog } from "@/features/profile/components/switch-profile-dialog";
import { useProfile } from "@/features/profile/profile-context";
import {
	DAILY_REVIEW_PROGRESS_UPDATED_EVENT,
	type DailyReviewProgressUpdatedDetail,
	isDailyGoalMet,
} from "@/features/review/daily-goal";
import { createReviewRepository } from "@/lib/data/repositories/review-repository";
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
	dailyReviewProgress: {
		completed: number;
		goal: number;
		isMet: boolean;
	} | null;
	onToggleCollapse?: () => void;
	onNavigate?: () => void;
	onOpenUserMenu: () => void;
};

function SidebarPanel({
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

function AuthenticatedAppShell() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const { accountUserId, error: authError, signOut } = useAuth();
	const {
		ready,
		profileTransitionPending,
		profiles,
		currentProfile,
		createProfile,
		reloadProfiles,
	} = useProfile();
	const [collapsed, setCollapsed] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);
	const [userMenuOpen, setUserMenuOpen] = useState(false);
	const [switchProfileOpen, setSwitchProfileOpen] = useState(false);
	const [localImportOpen, setLocalImportOpen] = useState(false);
	const [createProfileOpen, setCreateProfileOpen] = useState(false);
	const forcedCreateProfileOpenRef = useRef(false);
	const [signingOut, setSigningOut] = useState(false);
	const [signOutError, setSignOutError] = useState<string | null>(null);
	const [creatingProfile, setCreatingProfile] = useState(false);
	const [createProfileError, setCreateProfileError] = useState<string | null>(
		null,
	);
	const [completedToday, setCompletedToday] = useState(0);

	const mustCreateProfile = ready && profiles.length === 0;

	useEffect(() => {
		if (mustCreateProfile) {
			forcedCreateProfileOpenRef.current = true;
			setCreateProfileOpen(true);
			return;
		}

		if (forcedCreateProfileOpenRef.current) {
			forcedCreateProfileOpenRef.current = false;
			setCreateProfileOpen(false);
		}
	}, [mustCreateProfile]);

	useEffect(() => {
		if (!accountUserId || !currentProfile) {
			setCompletedToday(0);
			return;
		}

		let cancelled = false;
		const loadProgress = async () => {
			try {
				const count = await createReviewRepository().countTodayCompletedCards({
					accountUserId,
					profileId: currentProfile.id,
				});
				if (!cancelled) {
					setCompletedToday(count);
				}
			} catch {
				if (!cancelled) {
					setCompletedToday(0);
				}
			}
		};

		void loadProgress();

		const handleProgressUpdated = (event: Event) => {
			const detail = (event as CustomEvent<DailyReviewProgressUpdatedDetail | undefined>)
				.detail;
			if (
				detail?.accountUserId === accountUserId &&
				detail.profileId === currentProfile.id
			) {
				setCompletedToday((count) => count + detail.completedDelta);
				return;
			}
			void loadProgress();
		};
		window.addEventListener(
			DAILY_REVIEW_PROGRESS_UPDATED_EVENT,
			handleProgressUpdated,
		);

		return () => {
			cancelled = true;
			window.removeEventListener(
				DAILY_REVIEW_PROGRESS_UPDATED_EVENT,
				handleProgressUpdated,
			);
		};
	}, [accountUserId, currentProfile, pathname]);

	const dailyReviewProgress = currentProfile
		? {
				completed: completedToday,
				goal: currentProfile.daily_goal,
				isMet: isDailyGoalMet(completedToday, currentProfile.daily_goal),
			}
		: null;

	const handleSignOut = async () => {
		setSigningOut(true);
		setSignOutError(null);

		try {
			await signOut();
			setUserMenuOpen(false);
		} catch (error) {
			console.error("Firebase sign-out failed", error);
			setSignOutError(t("auth.signOutFailed"));
		} finally {
			setSigningOut(false);
		}
	};

	return (
		<div className="h-dvh overflow-hidden bg-muted/20">
			{profileTransitionPending ? (
				<div className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-primary/15">
					<div className="h-full w-1/3 animate-pulse bg-primary" />
				</div>
			) : null}
			<div className="flex h-full">
				<aside
					className={cn(
						"hidden h-dvh border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:block",
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
						dailyReviewProgress={dailyReviewProgress}
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

					<main className="flex-1">
						{!ready ? (
							<div className="flex min-h-[40vh] items-center justify-center">
								<Spinner size="lg" />
							</div>
						) : currentProfile ? (
							<Outlet />
						) : null}
					</main>
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
						dailyReviewProgress={dailyReviewProgress}
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
						<Button
							className="w-full justify-start"
							variant="outline"
							onClick={() => {
								setUserMenuOpen(false);
								setLocalImportOpen(true);
							}}
						>
							<UploadCloud className="size-4" />
							{t("profile.menu.importLocalData")}
						</Button>
						<Button
							className="w-full justify-start"
							variant="outline"
							onClick={handleSignOut}
							disabled={signingOut}
						>
							{signingOut ? (
								<Spinner size="sm" />
							) : (
								<LogOut className="size-4" />
							)}
							{t("auth.signOut")}
						</Button>
						{signOutError ? (
							<p className="text-sm text-destructive">{signOutError}</p>
						) : null}
						{authError ? (
							<p className="text-sm text-destructive">
								{t("auth.unavailable")}
							</p>
						) : null}
					</div>
				</DialogContent>
			</Dialog>

			<SwitchProfileDialog
				open={switchProfileOpen}
				onOpenChange={setSwitchProfileOpen}
				onCreateNew={() => {
					forcedCreateProfileOpenRef.current = false;
					setCreateProfileOpen(true);
				}}
			/>

			<LocalDataImportDialog
				open={localImportOpen}
				onOpenChange={setLocalImportOpen}
				accountUserId={accountUserId}
				onImported={reloadProfiles}
			/>

			<CreateProfileDialog
				open={createProfileOpen}
				onOpenChange={(open) => {
					if (!open) {
						forcedCreateProfileOpenRef.current = false;
					}
					setCreateProfileOpen(open);
					if (open) {
						setCreateProfileError(null);
					}
				}}
				allowClose={!mustCreateProfile}
				isCreating={creatingProfile}
				errorMessage={createProfileError}
				onCreate={async (input) => {
					const isFirstProfile = profiles.length === 0;
					setCreatingProfile(true);
					setCreateProfileError(null);

					try {
						await createProfile(input);
						forcedCreateProfileOpenRef.current = false;
						setCreateProfileOpen(false);
						if (isFirstProfile) {
							navigate("/quick-start", { replace: true });
						}
					} catch (error) {
						console.error("Failed to create profile", error);
						setCreateProfileError(t("auth.unavailable"));
					} finally {
						setCreatingProfile(false);
					}
				}}
			/>
		</div>
	);
}

export function AppShell() {
	const { ready, user } = useAuth();

	if (!ready) {
		return (
			<div className="flex min-h-dvh items-center justify-center bg-muted/20">
				<Spinner size="lg" />
			</div>
		);
	}

	if (!user) {
		return <LoginPage />;
	}

	return <AuthenticatedAppShell />;
}

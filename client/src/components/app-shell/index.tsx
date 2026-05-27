import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { LoginPage } from "@/features/auth/login-page";
import { useAuth } from "@/features/auth/use-auth";
import { LocalDataImportDialog } from "@/features/import/local-data-import-dialog";
import { SwitchProfileDialog } from "@/features/profile/components/switch-profile-dialog";
import { useProfile } from "@/features/profile/profile-context";
import { cn } from "@/lib/utils";
import { CreateProfileController } from "./create-profile-controller";
import { AppShellModalsProvider } from "./modals-context";
import { MobileSidebar } from "./mobile-sidebar";
import { SidebarPanel } from "./sidebar-panel";
import { useDailyReviewProgress } from "./use-daily-review-progress";
import { UserMenuDialog } from "./user-menu-dialog";

function AuthenticatedAppShell() {
	const { t } = useTranslation();
	const { pathname } = useLocation();
	const { accountUserId } = useAuth();
	const {
		ready,
		profileTransitionPending,
		currentProfile,
		reloadProfiles,
	} = useProfile();

	const [collapsed, setCollapsed] = useState(false);
	const [userMenuOpen, setUserMenuOpen] = useState(false);
	const [switchProfileOpen, setSwitchProfileOpen] = useState(false);
	const [localImportOpen, setLocalImportOpen] = useState(false);
	const [createProfileOpen, setCreateProfileOpen] = useState(false);

	const dailyReviewProgress = useDailyReviewProgress(
		accountUserId,
		currentProfile,
		pathname,
	);

	const openUserMenu = useCallback(() => setUserMenuOpen(true), []);
	const closeUserMenu = useCallback(() => setUserMenuOpen(false), []);
	const openSwitchProfile = useCallback(
		() => setSwitchProfileOpen(true),
		[],
	);
	const openCreateProfile = useCallback(
		() => setCreateProfileOpen(true),
		[],
	);
	const openLocalImport = useCallback(() => setLocalImportOpen(true), []);
	const forceOpenCreateProfile = useCallback(
		() => setCreateProfileOpen(true),
		[],
	);

	const modalsValue = useMemo(
		() => ({
			openUserMenu,
			closeUserMenu,
			openSwitchProfile,
			openCreateProfile,
			openLocalImport,
		}),
		[
			openUserMenu,
			closeUserMenu,
			openSwitchProfile,
			openCreateProfile,
			openLocalImport,
		],
	);

	const currentUserName = currentProfile?.nickname ?? t("sidebar.user.defaultName");
	const currentUserAvatar = currentProfile?.avatar_emoji ?? null;

	return (
		<AppShellModalsProvider value={modalsValue}>
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
							currentUserName={currentUserName}
							currentUserAvatar={currentUserAvatar}
							dailyReviewProgress={dailyReviewProgress}
							onOpenUserMenu={openUserMenu}
						/>
					</aside>

					<div className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto">
						<MobileSidebar
							currentUserName={currentUserName}
							currentUserAvatar={currentUserAvatar}
							dailyReviewProgress={dailyReviewProgress}
							onOpenUserMenu={openUserMenu}
						/>

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

				<UserMenuDialog open={userMenuOpen} onOpenChange={setUserMenuOpen} />

				<SwitchProfileDialog
					open={switchProfileOpen}
					onOpenChange={setSwitchProfileOpen}
					onCreateNew={openCreateProfile}
				/>

				<LocalDataImportDialog
					open={localImportOpen}
					onOpenChange={setLocalImportOpen}
					accountUserId={accountUserId}
					onImported={reloadProfiles}
				/>

				<CreateProfileController
					open={createProfileOpen}
					onOpenChange={setCreateProfileOpen}
					onAutoForceOpen={forceOpenCreateProfile}
				/>
			</div>
		</AppShellModalsProvider>
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

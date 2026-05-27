# AppShell split (P2 #12 — PR 1)

## Goal

`client/src/components/app-shell.tsx` was a 563-line file mixing layout, six
modals, auth, profile-management orchestration, and daily-goal computation.
Any UI tweak touched the whole file. Split it into a thin layout shell plus
self-contained modal/feature components.

## Before / after

| Metric | Before | After |
| --- | ---: | ---: |
| Single-file lines | 563 | — |
| Slim shell (`app-shell/index.tsx`) | — | 163 |
| Sidebar UI (`app-shell/sidebar-panel.tsx`) | inlined | 217 |
| Hooks/components extracted | 0 | 6 |
| `useState` calls inside shell | 14 | 5 |
| `useRef` calls inside shell | 1 | 0 |
| `useEffect` calls inside shell | 2 | 0 |

The shell now owns only top-level layout state (sidebar collapsed flag plus
four modal open/close flags) and the modals-context that wires them.

## New file layout

```
client/src/components/app-shell/
├── index.tsx                       # slim shell (163 lines)
├── sidebar-panel.tsx               # presentational sidebar (217 lines)
├── mobile-sidebar.tsx              # mobile drawer + own open state
├── user-menu-dialog.tsx            # user-menu dialog + sign-out state
├── create-profile-controller.tsx   # form state + auto-force-open effect
├── modals-context.tsx              # AppShellModalsProvider / useAppShellModals
└── use-daily-review-progress.ts    # daily-goal hook (count + listener)
```

The public import path `@/components/app-shell` (resolved via `index.tsx`)
is unchanged. `client/src/App.tsx` was not touched.

The two profile dialogs themselves already lived in
`client/src/features/profile/components/`; we kept them there and only moved
the orchestration/state out of the shell. The local-import dialog stays in
`client/src/features/import/`.

## State removed from the shell

Moved to their owning components:

- `userMenuOpen` — still in shell (controlled), but `signingOut`,
  `signOutError`, sub-action wiring → `user-menu-dialog.tsx`.
- `creatingProfile`, `createProfileError`, `forcedCreateProfileOpenRef`,
  and the auto-force-open `useEffect` → `create-profile-controller.tsx`.
- `mobileOpen` → fully owned by `mobile-sidebar.tsx`.
- `completedToday` + its `useEffect` (initial fetch + listener) →
  `use-daily-review-progress.ts`.

State still in the shell (top-level orchestration only):

- `collapsed` (desktop sidebar width)
- `userMenuOpen`, `switchProfileOpen`, `localImportOpen`,
  `createProfileOpen` (open flags exposed via modals-context so other
  affordances — e.g. the switch-profile dialog's "create new" button — can
  trigger them).

## Modals context

`AppShellModalsContext` exposes:

```ts
{
  openUserMenu, closeUserMenu,
  openSwitchProfile,
  openCreateProfile,
  openLocalImport,
}
```

This lets the user-menu dialog open switch-profile / local-import without
the shell passing callbacks down through props, and lets the create-profile
controller signal its auto-force-open to the shell.

## Behaviour preserved

No visible change. Same dialogs open from the same triggers, same data
flows, same auth/profile business logic. Only the daily-progress hook drops
a single dead-code branch: `setCompletedToday(0)` in the early-return path
(fires only when `accountUserId || currentProfile` is falsy, but the hook
already returns `null` in that case, so the value was never read). Removing
it cleared a `react-hooks/set-state-in-effect` lint error that the rule
would have triggered on the extracted hook.

## Verification

Automated (all green):

- `cd client && npx tsc -b`
- `cd client && npm test -- --run` — 90 / 90 pass
- `cd client && npm run lint`
- `cd client && npm run build`

Manual checks the user should perform locally:

- [ ] Sign-in flow → AppShell loads.
- [ ] Click profile button in sidebar → user menu dialog opens.
- [ ] User menu → "Switch user" closes menu, opens switch-profile dialog.
- [ ] User menu → "Preferences" navigates to `/preferences`.
- [ ] User menu → "Import local data" opens local-import dialog.
- [ ] User menu → "Sign out" signs out (spinner shown while pending).
- [ ] Switch-profile dialog → "Create new" opens create-profile dialog.
- [ ] Create-profile dialog submits and (on first profile) navigates to
      `/quick-start`.
- [ ] First-time user (zero profiles) is force-prompted to create one and
      cannot dismiss the dialog.
- [ ] Daily-goal panel shows the right count and updates after completing a
      review.
- [ ] Mobile viewport: hamburger opens drawer, nav links close it,
      profile button closes drawer and opens user menu.
- [ ] Desktop: collapse / expand toggles the sidebar width.

## Skipped intentionally

- `sidebar-panel.tsx` left at 217 lines — it's a single cohesive
  presentational component (nav, daily-goal pill, footer button). Further
  splitting would just add files without reducing coupling.
- `SwitchProfileDialog`, `LocalDataImportDialog`, `CreateProfileDialog` not
  refactored internally — those are owned by `features/profile` and
  `features/import`. PR 1 only relocates orchestration.
- The `pathname` dependency on the daily-progress effect kept as-is —
  removing it would change behaviour (the effect re-runs on route change
  to re-fetch as a safety net).

## Follow-ups noted (not fixed here)

- The reset-to-0 path in `useDailyReviewProgress` was dead code in the
  original (only ran when no profile, but the hook returns `null` then).
  Dropped during extraction; if a future caller needs the count even
  without a profile, the reset semantics will need to be re-derived.
- No "create profile" CTA exposes itself outside the switch dialog and the
  empty-state force-open. If we later add a header-level "new profile"
  button, it can call `useAppShellModals().openCreateProfile()` directly.

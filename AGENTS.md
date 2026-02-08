# Card Master Agent Notes

This file documents the current project state for future coding agents.

## Scope

- Main app lives in `client`
- Tech stack: React + TypeScript + Vite + Tailwind v4 + shadcn-style UI + IndexedDB

## Current UX Structure

- Global shell: `client/src/components/app-shell.tsx`
  - Left sidebar includes:
    - `Card Packs`
    - `Quick Start`
    - Bottom `User Section` (clickable, opens user menu)
  - Sidebar `System` section was removed from left navigation.
- User menu actions:
  - Switch user profile
  - Open Preferences
- Routes in `client/src/App.tsx`:
  - `/`
  - `/pack/:cardPackId/cards`
  - `/pack/:cardPackId/review`
  - `/pack/:cardPackId/quick-review`
  - `/quick-start`
  - `/preferences`

## Profile System (Multi-user)

- Profile context: `client/src/features/profile/profile-context.tsx`
- Storage key: `card-master.profiles.v1` (localStorage)
- Profile shape:
  - `id`
  - `nickname`
  - `avatar_emoji`
  - `primary_color` (nullable)
  - `created_at`, `updated_at`, `last_used_at`
- First-launch behavior:
  - If no profile exists, force open create-profile dialog
  - After first profile creation, redirect to `/quick-start`
- Existing-launch behavior:
  - Reuse last active profile
- Data isolation model:
  - Current profile `id` is used as `owner_user_id`
  - Existing API/store layer is unchanged in shape; owner filter provides separation

## Preferences Page

- File: `client/src/pages/preferences-page.tsx`
- Current editable settings:
  - Nickname
  - Avatar (emoji picker)
  - Primary color
  - Default language
- Theme color can be reset to app default.

## Dynamic Theme Color

- Theme provider: `client/src/features/profile/theme-provider.tsx`
- Color helpers: `client/src/lib/theme/color.ts`
- Runtime CSS variables updated from active profile color:
  - `--primary`
  - `--primary-foreground`
  - `--ring`
  - `--sidebar-primary`
  - `--sidebar-primary-foreground`

## Language Preference

- i18n setup: `client/src/i18n.ts`
- Preference storage key: `card-master.preferences.language`
- Resolution priority:
  1. Saved preference from localStorage
  2. Browser language fallback
- Use `setPreferredLanguage(...)` instead of direct `i18n.changeLanguage(...)` when changing language from UI.

## Important Implementation Constraints

- Keep profile data separation via `owner_user_id` (do not introduce cross-profile queries by default).
- Prefer small, additive changes in storage/API surface.
- When adding new user-scoped data, ensure it is tied to current profile id.
- Build command:
  - `cd client && npm run build`


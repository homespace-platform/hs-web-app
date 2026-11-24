<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# HomeSpace Web App Instructions

Rules below apply to this repository. They do not replace the Next.js block above; follow that block for any Next.js API question.

## Stack

Next.js 16 (App Router in `app/`), React 19, TypeScript, Redux Toolkit (`store/`, `features/`), axios API client (`lib/axios-client.ts`) with per-domain modules in `services/`, react-hook-form + zod (`validation/`), Firebase Web, socket.io-client. Inspect `package.json` and existing code before choosing patterns.

## Architecture

- Respect Server Component and Client Component boundaries. Add `"use client"` only where hooks, state, browser APIs or event handlers require it. Do not import client-only modules into Server Components.
- Preserve existing state management patterns (Redux Toolkit slices, existing hooks). Do not add a second state library.
- Reuse existing components in `components/`, helpers in `lib/` and `utils/`, and services in `services/` before creating new ones.
- Do not hardcode business rules that belong to the backend (prices, fees, deposit rules, status transitions, eligibility). Display and send what the API returns; client checks are only for UX.

## Authentication, API and Secrets

- All backend calls go through the Gateway base URL (`NEXT_PUBLIC_GATEWAY_BASE_URL`) using the existing axios client. Do not call backend services directly and do not bypass the client's token handling.
- Authorization is enforced by the backend. UI role checks (`dashboard-role`, route guards) only hide controls; do not rely on them for security.
- Only `NEXT_PUBLIC_*` values are exposed to the browser. Never put server secrets, private keys, service-account data or internal shared secrets in client code, `.env.example` values, logs or tests.
- Firebase Web config and the VAPID key are public by design; the Firebase service-account credential is not and must never appear here.
- Do not weaken Keycloak/auth flows or token storage.

## Notifications, Service Worker and Browser Permissions

- Product rule: chat belongs to its own unread state, popups and push. Do not show CHAT in the notification bell, notification-center list/category tabs or bell unread count. Resolve popup name/avatar from conversation data. Do not "complete" notification coverage by reintroducing chat into the bell.

- `public/firebase-messaging-sw.js` and push registration affect real users. Keep push content generic (the worker shows a generic message so a shared browser does not reveal another account's content). Do not put private notification text in push payloads or the worker.
- Keep installation secrets out of logs. Preserve the unregister-on-logout / push toggle behavior with `hs-notification-service`.
- Handle denied or unsupported notification permission gracefully. Realtime (Socket.IO) and REST feeds must degrade without breaking the page.

## UI Quality

- Validate forms with the existing react-hook-form + zod patterns; show server validation errors.
- Provide loading, error and empty states for data-driven views.
- Keep accessibility (labels, focus, keyboard, contrast) and responsive layouts consistent with existing pages.
- Do not refactor unrelated components or add dependencies without need.

## Git and verification

- Use `git status --short` once at the start if needed to protect existing edits and once at the end only if needed for reporting. Review the edit or use one path-scoped `git diff -- <paths>` when needed. Reuse that evidence while the files are unchanged. Use `git diff --stat` only when a scope summary is needed and `git diff --check` at most once after the final edit when useful. Reinspect affected paths only for new edits, conflicts or a concrete risk. Protect user changes. Commit, push, reset, clean, checkout or discard only when requested.
- **Start with the remaining risk.** For prose, comments, or cosmetic changes with no behavior impact, inspect the affected change and skip application builds and tests unless required. For routine behavior changes, validate once after editing with the smallest relevant test or static check. Add another check only when it covers a distinct risk. Run full builds or suites only when requested, required, or focused checks cannot cover a concrete risk.
- Reuse relevant passing results for unchanged inputs, including results supplied by the user or CI. Acknowledge their source in the report. After a failure, diagnose the cause and rerun only the affected check after correcting it. Let a running check finish before considering a retry. Report blocked checks and unverified risks. Preserve required security, business invariant and integration checks.
- Use relevant existing commands, such as `node --test tests/<file>.test.cjs` for behavior, `npx eslint <changed files>` for lint, and `npx tsc --noEmit` for changed type or prop contracts. Use a full build when necessary to verify routing, build configuration or cross-module changes.
- Start the dev server, Gateway or backend services only when a relevant check requires them. Use review skills when requested.
- Auth, payment, contract signing, deposit and notification registration are L3. Verify the affected API contract in `services/`. Component logic is L2. Static copy and cosmetic styling are L1.

## Skills

- `frontend-review`: explicit review of tenant-facing frontend changes. Not for the admin portal.

## Completion

Report changed behavior, verification that actually ran, API contract assumptions and limitations (for example, no browser verification).

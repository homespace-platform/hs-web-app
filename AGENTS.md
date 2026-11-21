<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# HomeSpace Web App Instructions

## Engineering standards

- Preserve business invariants, public contracts and backward compatibility. Keep authentication, authorization, input validation and error handling intact.
- Protect secrets and sensitive data in code, commits, tests, logs and reports. Treat third-party hooks as untrusted until reviewed and explicitly authorized.
- Change production configuration, deploy or run destructive data operations only when explicitly authorized for the target environment.
- Keep review tasks read-only unless the developer requests fixes.

## Execution policy

- **FAST** is the default for a small fix, one API, a simple UI or configuration change, or a limited refactor. Start as soon as the scope is clear. Use the fewest useful calls, with a soft ceiling of roughly 8–12 in normal conditions.
- **STANDARD** fits multi-file features, API contract changes, broader refactors and hard-to-reproduce bugs. Make a short plan, inspect affected dependencies and verify in one focused round after editing.
- **DEEP** is required for significant security, authentication, authorization, payment, deposit, transaction, contract lifecycle, migration, architecture or incident risk. Identify the relevant invariants and verify the affected boundaries, including failure and denied cases where applicable. Escalate by risk even for small changes.

### Work and tools

- Identify the goal and smallest correct scope. Read the directly affected files, then check callers or dependencies when the change can affect them. Plan mentally or in a few lines for complex work, then execute.
- Give each tool call a purpose that advances the request or reduces a real risk. Batch independent reads and search exact paths or symbols. Reuse results when inputs are unchanged. Skip full repo scans, subagents and independent review passes for routine tasks.
- For a small review, stop at the requested diff when it establishes the findings. Inspect callers, test setup or runtime behavior only if a material finding depends on evidence missing from that diff.
- **No repeated verification without new evidence.** Repeat a read, search or check only when relevant inputs changed, an error or conflicting evidence appeared, or a required risk check remains. If two investigation attempts yield no useful evidence, change approach or stop that investigation.
- Make routine technical decisions independently. Ask when essential information is missing or the action requires authorization. Reuse existing code and patterns, protect user changes, and keep edits and dependencies within scope.

### Git and validation

- Run `git status --short` at most once at the start if needed to identify existing edits, and once at the end if needed to report files. Inspect the scoped diff once when useful. Use `git diff --stat` only to summarize scope and `git diff --check` at most once at the end when applicable. Reuse existing evidence for the same Git state. Recheck affected state for new errors, conflicts or concrete risk. Commit, reset, clean, checkout or discard only when requested.
- Normally validate once after editing with the smallest relevant test or compiler check. Skip full builds for small changes. Expand checks when evidence or risk warrants it. On failure, distinguish code from environment causes, diagnose and rerun only the affected check after a relevant change. Reuse test output already returned. If a check is blocked, use a permitted alternative only when the evidence is necessary, or report the blocker.

### Stop and report

Stop when the request and acceptance criteria are met, required checks are complete and concrete in-scope issues are resolved. Skip speculative optimization, unrelated refactors and automatic chains of review, audit or verification. Report **Completed**, **Validation** and **Notes** when needed. List only checks actually run and state material limits or remaining risks.

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
- Keep installation secrets out of logs. Preserve the unregister-on-logout / push toggle behavior with the notification service.
- Handle denied or unsupported notification permission gracefully. Realtime (Socket.IO) and REST feeds must degrade without breaking the page.

## UI Quality

- Validate forms with the existing react-hook-form + zod patterns; show server validation errors.
- Provide loading, error and empty states for data-driven views.
- Keep accessibility (labels, focus, keyboard, contrast) and responsive layouts consistent with existing pages.
- Do not refactor unrelated components or add dependencies without need.

## Verification

Check `package.json` scripts before choosing a command. Existing scripts: `npm run lint` (ESLint), `npm run test:data` (Node test runner for address data), `npm run build`. Component and logic tests in `tests/*.test.cjs` run with Node's test runner.

- Run focused tests for the touched area, for example `node --test tests/<file>.test.cjs`.
- Lint the changed files, for example `npx eslint <changed files>`.
- Typecheck with `npx tsc --noEmit` when types or props change.
- Use `npm run build` when routing, configuration or broad type changes need build-time evidence that a focused check cannot provide.
- Do not start the dev server, Gateway or backend services for ordinary changes.
- Use FAST for copy, styling and small component fixes. Use DEEP for auth, payment, contract signing, deposit and notification registration. Verify those API contracts against the corresponding client in `services/`.

## Skills

- `frontend-review`: explicit review of tenant-facing frontend changes. Not for the admin portal.

## Completion

Report changed behavior, verification that actually ran, API contract assumptions and limitations (for example, no browser verification).

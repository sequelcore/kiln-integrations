# Contributing to Kiln Integrations

## Getting Started

```bash
git clone https://github.com/sequelcore/kiln-integrations.git
cd kiln-integrations
bun install
bun run typecheck
bun run test
```

### Local Development with Kiln

The monorepo references `@kilnai/core` from the local Kiln repo via `file:../kiln/packages/core` in the root `package.json`. Ensure the `kiln` repo is cloned as a sibling directory and built:

```bash
# Required directory structure
C:\Proyectos\Sequel\
  kiln/                  # @kilnai/core source
  kiln-integrations/     # this repo
```

If you change interfaces in `@kilnai/core`, rebuild Kiln first (`cd ../kiln && bun run typecheck`), then re-run `bun install` here.

## Project Structure

Bun monorepo with 4 packages:

| Package | npm name | SDK | Description |
|---------|----------|-----|-------------|
| `packages/shared` | `@kilnai/integration-shared` | — | HTTP client, auth header builder, error types. Utility for future raw-fetch adapters. |
| `packages/google-calendar` | `@kilnai/integration-google-calendar` | `@googleapis/calendar` | Google Calendar API v3: check availability, list/create/update/cancel events. |
| `packages/stripe` | `@kilnai/integration-stripe` | `stripe` | Stripe API: create/list/get payment links. |
| `packages/google-sheets` | `@kilnai/integration-google-sheets` | `@googleapis/sheets` | Google Sheets API v4: read ranges, append rows, update cells. |

## Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install all workspace dependencies |
| `bun run typecheck` | Type-check all packages via `tsc -b` (project references) |
| `bun run test` | Run all tests via Vitest |

**IMPORTANT: Always use `bun run test`, never `bun test`.** Same reason as Kiln — `bun test` invokes Bun's built-in test runner without Vitest config, causing mock leakage.

## Adding a New Integration Adapter

1. Create `packages/{provider}/` with:
   - `package.json` — declare the provider's official SDK as a dependency, `@kilnai/core` as peer dependency
   - `tsconfig.json` — extends root, `composite: true`
   - `src/index.ts` — re-export adapter
   - `src/adapter.ts` — `IntegrationAdapter` implementation with operation definitions and execute dispatch
   - `src/api.ts` — SDK client wrapper with typed methods
   - `tests/adapter.test.ts` — mock SDK methods, verify parameter mapping and response extraction

2. Register the package in root `package.json` `workspaces` (already `["packages/*"]`).

3. Add the package to the `typecheck` script in root `package.json`.

4. Add the scope to the commit format section below.

### Per-Adapter File Responsibilities

| File | Responsibility |
|------|---------------|
| `adapter.ts` | Defines `operations` (JSON Schema), dispatches `execute()` calls, maps `Record<string, unknown>` input to typed SDK params, maps SDK responses to `IntegrationResult` |
| `api.ts` | Thin wrapper over the official SDK. Initializes the SDK client from `ResolvedCredential`. One method per operation. |
| `index.ts` | Re-exports the adapter as default and named export. Nothing else. |

## SDK vs Raw Fetch Rule

**Use official SDKs for integration adapters. Do not use raw `fetch`.**

Integration adapters exist solely to talk to third-party APIs. The official SDKs (`@googleapis/calendar`, `stripe`, etc.) are maintained by the API owners and handle:
- Form encoding, JSON serialization, content negotiation
- Pagination, retry logic, rate limit backoff
- API versioning and breaking change absorption
- Full TypeScript type coverage for requests and responses
- Auth token injection and refresh signaling

Raw `fetch` is appropriate in the Kiln engine (simple webhook POSTs, Meta API calls) where we make 1-3 calls to stable endpoints. It is **not** appropriate for adapters where wrapping a complex API surface is the entire product.

**Standalone Google packages:** Always use `@googleapis/calendar`, `@googleapis/sheets`, etc. — never the monolithic `googleapis` package which pulls 200+ Google APIs (~20MB).

## Dependency Rules

1. Each adapter depends on `@kilnai/core` as **peer dependency** (consumer provides it at runtime).
2. Each adapter depends on its provider's **official SDK** as a regular dependency.
3. Use standalone Google API packages (`@googleapis/{service}`), not the full `googleapis` monolith.
4. No dependency on `@kilnai/runtime` — adapters are engine-level, they implement `IntegrationAdapter` from core.
5. No cross-adapter imports — each adapter is independently publishable.
6. `@kilnai/integration-shared` is optional — only use it for raw-fetch adapters or shared error types.

## Code Standards

- **No dead code or backwards-compatibility hacks.** Remove unused code rather than leaving it for potential future use.
- **Explicit imports only.** No wildcard imports.
- **Adapters are pure API clients.** They receive `ResolvedCredential` and make SDK calls. They do NOT handle OAuth flows, credential storage, token refresh, or any consumer-side logic.
- **Map, don't expose.** `execute()` returns `IntegrationResult { data }` with extracted fields — not raw SDK response objects. Consumers should not need to import SDK types.
- **Tests required for every operation.** Each operation in an adapter must have at least one test verifying parameter mapping and response extraction.
- **No premature abstractions.** If two adapters share 5 lines of code, that's fine — don't create a shared abstraction until the third.

## Commit Format

```
type(scope): description
```

**Types:** `feat`, `fix`, `refactor`, `chore`, `docs`, `test`

**Scopes:** `shared`, `google-calendar`, `stripe`, `google-sheets`

Examples:
```
feat(google-calendar): add reschedule_event operation
fix(stripe): handle 402 card_error in create_payment_link
refactor(google-sheets): use batch API for multi-range reads
```

## Pull Request Checklist

Before opening a PR, verify:

- `bun run typecheck` passes with zero errors.
- `bun run test` passes with all tests green.
- Every new operation has at least one test.
- The adapter uses the provider's official SDK (not raw fetch).
- `IntegrationResult.data` contains only extracted fields, not raw SDK objects.
- The PR description explains what changed and why.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

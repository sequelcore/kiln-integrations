# Kiln Integrations — Third-Party Adapter Packages

Bun monorepo containing `IntegrationAdapter` implementations for Kiln's integration runtime. Each adapter is a separate npm package that talks to a third-party API (Google Calendar, Stripe, Google Sheets). Adapters depend on `@kilnai/core` for the `IntegrationAdapter` interface and `@kilnai/integration-shared` for HTTP utilities.

## Architecture

```
Consumer (Kiln gateway)
  → IntegrationRegistry.register(adapter)
  → IntegrationExecutor.execute(operation, input)
    → CredentialResolver.resolve(tenantId, credentialKey)
    → adapter.execute(operation, credential, input, options)
      → raw fetch to third-party API
    → IntegrationResult { data }
```

Adapters are pure API clients. They receive resolved credentials and make HTTP calls. They do NOT handle OAuth flows, credential storage, or token refresh — that's the consumer's responsibility.

## Packages

| Package | Scope | Provider | Operations |
|---------|-------|----------|------------|
| `packages/shared` | `@kilnai/integration-shared` | — | HTTP client, auth header builder, error types |
| `packages/google-calendar` | `@kilnai/integration-google-calendar` | Google Calendar API v3 | check_availability, list_events, create_event, update_event, cancel_event |
| `packages/stripe` | `@kilnai/integration-stripe` | Stripe API v1 | create_payment_link, list_payment_links, get_payment_link |
| `packages/google-sheets` | `@kilnai/integration-google-sheets` | Google Sheets API v4 | read_range, append_rows, update_range |

## Per-Adapter Structure

```
packages/{provider}/
  src/
    index.ts       # Re-export adapter
    adapter.ts     # IntegrationAdapter implementation (operations + execute dispatch)
    api.ts         # Low-level API client (typed methods, raw fetch)
  tests/
    adapter.test.ts
  package.json
  tsconfig.json
```

## Commands

```bash
bun install           # Install all workspace deps
bun run typecheck     # tsc -b all packages
bun run test          # Vitest all packages
```

## Dependency Rules

1. Adapters depend on `@kilnai/core` as peer dependency (consumer provides it)
2. Adapters depend on `@kilnai/integration-shared` as workspace dependency
3. No third-party SDK dependencies — all API clients use raw `fetch`
4. No runtime dependency on `@kilnai/runtime` — adapters are engine-level

## Testing

Tests mock `fetch` via `vi.stubGlobal` and verify:
- Correct API endpoint URLs
- Request method, headers, body format
- Response parsing and data extraction
- Error propagation
- AbortSignal passthrough

## Commit Format

```
type(scope): description
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`
Scopes: shared, google-calendar, stripe, google-sheets

# Kiln Integrations — Third-Party Adapter Packages

Bun monorepo containing `IntegrationAdapter` implementations for Kiln's integration runtime. Each adapter is a separate npm package that wraps a third-party API using its official SDK. Adapters depend on `@kilnai/core` for the `IntegrationAdapter` interface.

## Architecture

```
Consumer (Kiln gateway)
  → IntegrationRegistry.register(adapter)
  → IntegrationExecutor.execute(operation, input)
    → CredentialResolver.resolve(tenantId, credentialKey)
    → adapter.execute(operation, credential, input, options)
      → official SDK call (googleapis, stripe)
    → IntegrationResult { data }
```

Adapters are API clients backed by official SDKs. They receive resolved credentials and call the provider's API. They do NOT handle OAuth flows, credential storage, or token refresh — that's the consumer's responsibility (Kilvo for SaaS, LocalCredentialResolver for self-hosted).

## Packages

| Package | Scope | SDK | Operations |
|---------|-------|-----|------------|
| `packages/shared` | `@kilnai/integration-shared` | — | HTTP client, auth header builder, error types (for future raw-fetch adapters) |
| `packages/google-calendar` | `@kilnai/integration-google-calendar` | `@googleapis/calendar` | check_availability, list_events, create_event, update_event, cancel_event |
| `packages/stripe` | `@kilnai/integration-stripe` | `stripe` | create_payment_link, list_payment_links, get_payment_link |
| `packages/google-sheets` | `@kilnai/integration-google-sheets` | `@googleapis/sheets` | read_range, append_rows, update_range |

## Per-Adapter Structure

```
packages/{provider}/
  src/
    index.ts       # Re-export adapter
    adapter.ts     # IntegrationAdapter implementation (operations + execute dispatch)
    api.ts         # SDK client wrapper (typed methods, official SDK calls)
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
2. Each adapter depends on its provider's official SDK (`@googleapis/calendar`, `stripe`, etc.)
3. Use standalone Google packages (`@googleapis/calendar`, not `googleapis`) to avoid pulling 200+ APIs
4. No runtime dependency on `@kilnai/runtime` — adapters are engine-level
5. `@kilnai/integration-shared` provides utilities for future raw-fetch adapters (not used by SDK-based ones)

## Testing

Tests mock SDK modules via `vi.mock()` and verify:
- Correct SDK method calls with expected parameters
- Response mapping from SDK types to IntegrationResult
- Error propagation
- Operation routing (execute dispatch)

## Commit Format

```
type(scope): description
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`
Scopes: shared, google-calendar, stripe, google-sheets

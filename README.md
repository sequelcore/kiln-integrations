<p align="center">
  <img src="https://raw.githubusercontent.com/sequelcore/kiln/main/docs/assets/mascot.png" alt="Kiln" width="120" />
</p>

<h1 align="center">Kiln Integrations</h1>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
</p>

<p align="center">Third-party API adapters for <a href="https://github.com/sequelcore/kiln">Kiln</a>'s integration runtime.</p>

---

## What is this?

Official `IntegrationAdapter` implementations that connect [Kiln](https://github.com/sequelcore/kiln) to third-party APIs. Each adapter wraps a provider's official SDK, receives resolved credentials at runtime, and returns structured results — no OAuth flows, no credential storage, no token refresh.

```
Consumer (kiln-gateway)
  → IntegrationRegistry.register(adapter)
  → IntegrationExecutor.execute(operation, input)
    → CredentialResolver.resolve(tenantId, credentialKey)
    → adapter.execute(operation, credential, input)
      → official SDK call
    → IntegrationResult { data }
```

## Packages

| Package | npm | SDK | Operations |
|---------|-----|-----|------------|
| [@kilnai/integration-google-calendar](packages/google-calendar) | [![npm](https://img.shields.io/npm/v/@kilnai/integration-google-calendar.svg)](https://www.npmjs.com/package/@kilnai/integration-google-calendar) | `@googleapis/calendar` | check_availability, list_events, create_event, update_event, cancel_event |
| [@kilnai/integration-stripe](packages/stripe) | [![npm](https://img.shields.io/npm/v/@kilnai/integration-stripe.svg)](https://www.npmjs.com/package/@kilnai/integration-stripe) | `stripe` | create_payment_link, list_payment_links, get_payment_link |
| [@kilnai/integration-google-sheets](packages/google-sheets) | [![npm](https://img.shields.io/npm/v/@kilnai/integration-google-sheets.svg)](https://www.npmjs.com/package/@kilnai/integration-google-sheets) | `@googleapis/sheets` | read_range, append_rows, update_range |
| [@kilnai/integration-shared](packages/shared) | [![npm](https://img.shields.io/npm/v/@kilnai/integration-shared.svg)](https://www.npmjs.com/package/@kilnai/integration-shared) | — | HTTP client, auth headers, error types |

## Install

Adapters are installed in your [kiln-gateway](https://github.com/sequelcore/kiln-gateway) deployment, not by end-users:

```bash
bun add @kilnai/integration-google-calendar
bun add @kilnai/integration-stripe
bun add @kilnai/integration-google-sheets
```

Requires `@kilnai/core` >= 0.14.0 as a peer dependency.

## Usage

Register adapters before starting the gateway:

```typescript
import { IntegrationRegistry } from "@kilnai/core";
import { adapter as googleCalendar } from "@kilnai/integration-google-calendar";
import { adapter as stripe } from "@kilnai/integration-stripe";
import { adapter as googleSheets } from "@kilnai/integration-google-sheets";

IntegrationRegistry.register(googleCalendar);
IntegrationRegistry.register(stripe);
IntegrationRegistry.register(googleSheets);
```

Then configure integration tools per tenant via the admin API. The gateway's `IntegrationExecutor` handles credential resolution and adapter dispatch automatically.

## Development

```bash
git clone https://github.com/sequelcore/kiln-integrations.git
cd kiln-integrations
bun install
bun run typecheck
bun run test
```

Requires the [kiln](https://github.com/sequelcore/kiln) repo cloned as a sibling directory for local `@kilnai/core` types.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide on adding adapters.

## SDK vs Raw Fetch

Integration adapters use official SDKs — never raw `fetch`. This is intentional and the opposite of Kiln engine's convention:

| Context | Approach | Reason |
|---------|----------|--------|
| Kiln engine | Raw `fetch` | 1-3 simple calls to stable endpoints |
| Integration adapters | Official SDKs | Wrapping a complex API surface is the product |

## License

[MIT](LICENSE)

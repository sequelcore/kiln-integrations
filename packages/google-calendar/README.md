<p align="center">
  <img src="https://raw.githubusercontent.com/sequelcore/kiln/main/docs/assets/mascot.png" alt="Kiln" width="120" />
</p>

<h1 align="center">@kilnai/integration-google-calendar</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@kilnai/integration-google-calendar"><img src="https://img.shields.io/npm/v/@kilnai/integration-google-calendar.svg" alt="npm version" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
</p>

<p align="center">Google Calendar integration adapter for <a href="https://github.com/sequelcore/kiln">Kiln</a>.</p>

---

## Operations

| Operation | Description |
|-----------|-------------|
| `check_availability` | Check free/busy status for a time range |
| `list_events` | List upcoming events with optional filters |
| `create_event` | Create a new event (timed or all-day) |
| `update_event` | Update an existing event |
| `cancel_event` | Cancel (delete) an event |

## Install

```bash
bun add @kilnai/integration-google-calendar
```

Requires `@kilnai/core` >= 0.14.0 as a peer dependency.

## Usage

```typescript
import { IntegrationRegistry } from "@kilnai/core";
import { adapter } from "@kilnai/integration-google-calendar";

IntegrationRegistry.register(adapter);
```

The adapter expects a `ResolvedCredential` with an OAuth2 access token as the `value`. It creates a Google OAuth2 client internally — no client ID or secret needed when injecting an existing token.

## SDK

Built on [`@googleapis/calendar`](https://www.npmjs.com/package/@googleapis/calendar) (standalone package, not the monolithic `googleapis`).

## License

[MIT](https://github.com/sequelcore/kiln-integrations/blob/main/LICENSE)

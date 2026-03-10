<p align="center">
  <img src="https://raw.githubusercontent.com/sequelcore/kiln/main/docs/assets/mascot.png" alt="Kiln" width="120" />
</p>

<h1 align="center">@kilnai/integration-google-sheets</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@kilnai/integration-google-sheets"><img src="https://img.shields.io/npm/v/@kilnai/integration-google-sheets.svg" alt="npm version" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
</p>

<p align="center">Google Sheets integration adapter for <a href="https://github.com/sequelcore/kiln">Kiln</a>.</p>

---

## Operations

| Operation | Description |
|-----------|-------------|
| `read_range` | Read values from a spreadsheet range (A1 notation) |
| `append_rows` | Append rows of data after a given range |
| `update_range` | Update values in a specific range |

## Install

```bash
bun add @kilnai/integration-google-sheets
```

Requires `@kilnai/core` >= 0.14.0 as a peer dependency.

## Usage

```typescript
import { IntegrationRegistry } from "@kilnai/core";
import { adapter } from "@kilnai/integration-google-sheets";

IntegrationRegistry.register(adapter);
```

The adapter expects a `ResolvedCredential` with an OAuth2 access token as the `value`. It creates a Google OAuth2 client internally — no client ID or secret needed when injecting an existing token.

## SDK

Built on [`@googleapis/sheets`](https://www.npmjs.com/package/@googleapis/sheets) (standalone package, not the monolithic `googleapis`).

## License

[MIT](https://github.com/sequelcore/kiln-integrations/blob/main/LICENSE)

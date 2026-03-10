<p align="center">
  <img src="https://raw.githubusercontent.com/sequelcore/kiln/main/docs/assets/mascot.png" alt="Kiln" width="120" />
</p>

<h1 align="center">@kilnai/integration-shared</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@kilnai/integration-shared"><img src="https://img.shields.io/npm/v/@kilnai/integration-shared.svg" alt="npm version" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
</p>

<p align="center">Shared HTTP utilities for <a href="https://github.com/sequelcore/kiln-integrations">Kiln integration adapters</a>.</p>

---

## Exports

| Export | Description |
|--------|-------------|
| `buildAuthHeaders()` | Build authorization headers from a `ResolvedCredential` |
| `fetchJson()` | Typed JSON fetch with error handling |
| `IntegrationHttpError` | Error class with status code and response body |

## Purpose

Utility package for future raw-fetch adapters. Current SDK-based adapters (Google Calendar, Stripe, Google Sheets) do not depend on this package — they use their provider's official SDK directly.

## Install

```bash
bun add @kilnai/integration-shared
```

## License

[MIT](https://github.com/sequelcore/kiln-integrations/blob/main/LICENSE)

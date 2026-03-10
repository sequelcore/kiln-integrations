<p align="center">
  <img src="https://raw.githubusercontent.com/sequelcore/kiln/main/docs/assets/mascot.png" alt="Kiln" width="120" />
</p>

<h1 align="center">@kilnai/integration-stripe</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@kilnai/integration-stripe"><img src="https://img.shields.io/npm/v/@kilnai/integration-stripe.svg" alt="npm version" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
</p>

<p align="center">Stripe integration adapter for <a href="https://github.com/sequelcore/kiln">Kiln</a>.</p>

---

## Operations

| Operation | Description |
|-----------|-------------|
| `create_payment_link` | Create a payment link for one or more products |
| `list_payment_links` | List existing payment links |
| `get_payment_link` | Retrieve a specific payment link by ID |

## Install

```bash
bun add @kilnai/integration-stripe
```

Requires `@kilnai/core` >= 0.14.0 as a peer dependency.

## Usage

```typescript
import { IntegrationRegistry } from "@kilnai/core";
import { adapter } from "@kilnai/integration-stripe";

IntegrationRegistry.register(adapter);
```

The adapter expects a `ResolvedCredential` with a Stripe secret key as the `value`.

## SDK

Built on the official [`stripe`](https://www.npmjs.com/package/stripe) Node.js SDK.

## License

[MIT](https://github.com/sequelcore/kiln-integrations/blob/main/LICENSE)

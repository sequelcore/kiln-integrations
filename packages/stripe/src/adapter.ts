import type { IntegrationAdapter, IntegrationResult, ResolvedCredential, ExecutionOptions } from "@kilnai/core";
import { StripeApi } from "./api.js";

export const adapter: IntegrationAdapter = {
  provider: "stripe",
  version: "0.1.0",
  operations: [
    {
      name: "create_payment_link",
      description: "Create a Stripe payment link for one or more products",
      inputSchema: {
        type: "object",
        properties: {
          lineItems: {
            type: "array",
            description: "Products to include in the payment link",
            items: {
              type: "object",
              properties: {
                price: { type: "string", description: "Stripe Price ID (e.g. price_abc123)" },
                quantity: { type: "number", description: "Quantity" },
              },
              required: ["price", "quantity"],
            },
          },
          metadata: {
            type: "object",
            description: "Key-value metadata to attach to the payment link",
            additionalProperties: { type: "string" },
          },
          afterCompletionType: {
            type: "string",
            description: "What happens after payment: 'redirect' or 'hosted_confirmation'",
            enum: ["redirect", "hosted_confirmation"],
          },
          afterCompletionRedirectUrl: {
            type: "string",
            description: "URL to redirect to after payment (required if afterCompletionType is redirect)",
          },
        },
        required: ["lineItems"],
      },
    },
    {
      name: "list_payment_links",
      description: "List existing Stripe payment links",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max number of links to return (default 10, max 100)" },
          active: { type: "boolean", description: "Filter by active status" },
        },
      },
    },
    {
      name: "get_payment_link",
      description: "Retrieve a specific Stripe payment link by ID",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Payment link ID (e.g. plink_abc123)" },
        },
        required: ["id"],
      },
    },
  ],

  async execute(
    operation: string,
    credentials: ResolvedCredential,
    input: Record<string, unknown>,
    options?: ExecutionOptions,
  ): Promise<IntegrationResult> {
    const api = new StripeApi(credentials, options?.signal);

    switch (operation) {
      case "create_payment_link": {
        const link = await api.createPaymentLink({
          lineItems: input.lineItems as Array<{ price: string; quantity: number }>,
          metadata: input.metadata as Record<string, string> | undefined,
          afterCompletionType: input.afterCompletionType as "redirect" | "hosted_confirmation" | undefined,
          afterCompletionRedirectUrl: input.afterCompletionRedirectUrl as string | undefined,
        });
        return { data: { id: link.id, url: link.url, active: link.active } };
      }

      case "list_payment_links": {
        const links = await api.listPaymentLinks({
          limit: input.limit as number | undefined,
          active: input.active as boolean | undefined,
        });
        return { data: { links: links.map((l) => ({ id: l.id, url: l.url, active: l.active })) } };
      }

      case "get_payment_link": {
        const link = await api.getPaymentLink(input.id as string);
        return { data: { id: link.id, url: link.url, active: link.active } };
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  },
};

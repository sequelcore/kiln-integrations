import Stripe from "stripe";
import type { ResolvedCredential } from "@kilnai/core";

export type PaymentLink = Stripe.PaymentLink;

export class StripeApi {
  private readonly client: Stripe;

  constructor(credential: ResolvedCredential) {
    this.client = new Stripe(credential.value);
  }

  async createPaymentLink(params: Stripe.PaymentLinkCreateParams): Promise<PaymentLink> {
    return this.client.paymentLinks.create(params);
  }

  async listPaymentLinks(params: Stripe.PaymentLinkListParams = {}): Promise<PaymentLink[]> {
    const res = await this.client.paymentLinks.list(params);
    return res.data;
  }

  async getPaymentLink(id: string): Promise<PaymentLink> {
    return this.client.paymentLinks.retrieve(id);
  }
}

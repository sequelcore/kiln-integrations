import type { ResolvedCredential } from "@kilnai/core";
import { buildAuthHeaders, IntegrationHttpError } from "@kilnai/integration-shared";

const BASE_URL = "https://api.stripe.com/v1";

export interface PaymentLink {
  id: string;
  url: string;
  active: boolean;
  livemode: boolean;
  metadata: Record<string, string>;
}

export interface LineItem {
  price: string;
  quantity: number;
}

export interface CreatePaymentLinkParams {
  lineItems: LineItem[];
  metadata?: Record<string, string>;
  afterCompletionType?: "redirect" | "hosted_confirmation";
  afterCompletionRedirectUrl?: string;
}

export interface ListPaymentLinksParams {
  limit?: number;
  active?: boolean;
}

export class StripeApi {
  private readonly headers: Record<string, string>;

  constructor(
    credential: ResolvedCredential,
    private readonly signal?: AbortSignal,
  ) {
    this.headers = buildAuthHeaders(credential);
  }

  async createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLink> {
    const body = new URLSearchParams();
    for (let i = 0; i < params.lineItems.length; i++) {
      const item = params.lineItems[i]!;
      body.append(`line_items[${i}][price]`, item.price);
      body.append(`line_items[${i}][quantity]`, String(item.quantity));
    }
    if (params.metadata) {
      for (const [k, v] of Object.entries(params.metadata)) {
        body.append(`metadata[${k}]`, v);
      }
    }
    if (params.afterCompletionType) {
      body.append("after_completion[type]", params.afterCompletionType);
      if (params.afterCompletionRedirectUrl) {
        body.append("after_completion[redirect][url]", params.afterCompletionRedirectUrl);
      }
    }
    return this.postForm<PaymentLink>(`${BASE_URL}/payment_links`, body);
  }

  async listPaymentLinks(params: ListPaymentLinksParams = {}): Promise<PaymentLink[]> {
    const query = new URLSearchParams();
    if (params.limit) query.set("limit", String(params.limit));
    if (params.active !== undefined) query.set("active", String(params.active));
    const qs = query.toString();
    const url = qs ? `${BASE_URL}/payment_links?${qs}` : `${BASE_URL}/payment_links`;
    const res = await this.get<{ data: PaymentLink[] }>(url);
    return res.data;
  }

  async getPaymentLink(id: string): Promise<PaymentLink> {
    return this.get<PaymentLink>(`${BASE_URL}/payment_links/${encodeURIComponent(id)}`);
  }

  private async get<T>(url: string): Promise<T> {
    const res = await fetch(url, { headers: this.headers, signal: this.signal });
    return this.handleResponse<T>(res);
  }

  private async postForm<T>(url: string, body: URLSearchParams): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers: { ...this.headers, "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: this.signal,
    });
    return this.handleResponse<T>(res);
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let body: unknown;
      try { body = JSON.parse(text); } catch { body = text; }
      throw new IntegrationHttpError(
        res.status,
        body,
        res.status >= 500 || res.status === 429,
      );
    }
    return res.json() as Promise<T>;
  }
}

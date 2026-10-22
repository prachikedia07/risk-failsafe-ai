const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002";

export type Transaction = {
  id: string;
  merchantId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  timestamp: string;
  failureReason?: string | null;
  paymentMethod: string;
  razorpayPaymentId?: string | null;
};

export type Merchant = {
  id: string;
  name: string;
};

export type Customer = {
  id: string;
  name: string;
  merchantId: string;
};

export type Alert = {
  id: string;
  riskAnalysisId: string;
  riskScore: number;
  riskLevel: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
  action?: string | null;
  confidence?: number | null;
  agentReasons?: unknown;
  riskAnalysis?: {
    prediction: string;
    features: unknown;
    reasons: unknown;
    createdAt: string;
  };
};

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      ...(options?.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...options?.headers,
    },
  });

  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || `Request failed: ${response.status}`
    );
  }

  return result.data ?? result;
}

export const api = {
  get: <T,>(path: string) => request<T>(path),

  post: <T,>(path: string, body: unknown) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export const money = (
  paise: number,
  currency = "INR"
) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(paise / 100);

export const dateTime = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
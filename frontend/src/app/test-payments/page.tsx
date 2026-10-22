"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import {
  api,
  dateTime,
  money,
  type Customer,
  type Merchant,
  type Transaction,
} from "@/lib/api";

declare global {
  interface Window {
    Razorpay?: new (
      options: Record<string, unknown>
    ) => {
      open: () => void;
    };
  }
}

export default function TestPaymentsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [merchantId, setMerchantId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("100");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [latest, setLatest] = useState<Transaction | null>(null);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [merchantData, customerData] = await Promise.all([
          api.get<Merchant[]>("/api/merchants"),
          api.get<Customer[]>("/api/customers"),
        ]);

        setMerchants(merchantData);
        setCustomers(customerData);

        setMerchantId(merchantData[0]?.id ?? "");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load merchants and customers"
        );
      } finally {
        setLoading(false);
      }
    }

    void loadOptions();
  }, []);

  const availableCustomers = customers.filter(
    (customer) => customer.merchantId === merchantId
  );

  useEffect(() => {
    if (
      !availableCustomers.some(
        (customer) => customer.id === customerId
      )
    ) {
      setCustomerId(availableCustomers[0]?.id ?? "");
    }
  }, [merchantId, customers, customerId]);

  async function startPayment() {
    setError("");
    setStatus("");
    setLatest(null);

    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const rupees = Number(amount);

    if (!key || !key.startsWith("rzp_test_")) {
      setError(
        "Set your Razorpay Test Mode key ID in frontend/.env.local."
      );
      return;
    }

    if (
      !merchantId ||
      !customerId ||
      !Number.isFinite(rupees) ||
      rupees < 1 ||
      rupees > 10000
    ) {
      setError("Choose a merchant, customer, and amount from ₹1 to ₹10,000.");
      return;
    }

    if (!window.Razorpay) {
      setError("Razorpay Checkout has not loaded. Refresh and try again.");
      return;
    }

    try {
      const order = await api.post<{
        id: string;
        amount: number;
        currency: string;
      }>("/api/payments/test-order", {
        amount: Math.round(rupees * 100),
        merchantId,
        customerId,
      });

      const checkout = new window.Razorpay({
        key,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        name: "RiskFailsafe AI",
        description: "Test-mode payment simulation",

        handler: (result: { razorpay_payment_id: string }) => {
          const paymentId = result.razorpay_payment_id;

          setStatus(
            "Checkout returned. Waiting for the verified webhook to save the transaction…"
          );

          let attempts = 0;

          const timer = window.setInterval(async () => {
            attempts++;

            try {
              const transactions = await api.get<Transaction[]>(
                "/api/transactions"
              );

              const transaction = transactions.find(
                (item) => item.razorpayPaymentId === paymentId
              );

              if (transaction) {
                setLatest(transaction);
                setStatus(
                  `Webhook record received: ${transaction.status}`
                );
                window.clearInterval(timer);
              } else if (attempts >= 30) {
                setStatus(
                  "No matching record appeared within 60 seconds. Check the webhook logs."
                );
                window.clearInterval(timer);
              }
            } catch {
              if (attempts >= 30) {
                setStatus(
                  "Could not confirm the transaction. Check the backend logs."
                );
                window.clearInterval(timer);
              }
            }
          }, 2000);
        },

        modal: {
          ondismiss: () => {
            setStatus(
              "Checkout closed. Check the transaction list for any webhook event already received."
            );
          },
        },

        theme: {
          color: "#67e8f9",
        },
      });

      checkout.open();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create the Razorpay test order"
      );
    }
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      <div className="mx-auto max-w-5xl">
        <p className="text-xs uppercase tracking-[.22em] text-cyan-300">
          Sandbox playground
        </p>

        <h1 className="mt-2 text-3xl font-semibold">Test payments</h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Create a Razorpay Test Mode order. The final transaction status
          comes from the backend webhook, not just the checkout popup.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-[#10141d] p-6">
            <h2 className="text-lg font-semibold">Create a test payment</h2>

            {error && (
              <p className="mt-4 rounded-xl border border-rose-400/20 p-4 text-sm text-rose-200">
                {error}
              </p>
            )}

            {loading ? (
              <p className="mt-5 text-sm text-slate-400">
                Loading merchant and customer records…
              </p>
            ) : (
              <div className="mt-6 space-y-5">
                <label className="block text-sm text-slate-300">
                  Merchant
                  <select
                    value={merchantId}
                    onChange={(event) => setMerchantId(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0e14] px-3 py-3"
                  >
                    <option value="">Choose merchant</option>
                    {merchants.map((merchant) => (
                      <option key={merchant.id} value={merchant.id}>
                        {merchant.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm text-slate-300">
                  Customer
                  <select
                    value={customerId}
                    onChange={(event) => setCustomerId(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0e14] px-3 py-3"
                  >
                    <option value="">Choose customer</option>
                    {availableCustomers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm text-slate-300">
                  Amount (INR)
                  <div className="mt-2 flex rounded-xl border border-white/10 bg-[#0b0e14] px-3">
                    <span className="py-3 text-slate-500">₹</span>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      className="w-full bg-transparent px-3 py-3 outline-none"
                    />
                  </div>
                  <span className="mt-2 block text-xs text-slate-600">
                    ₹1–₹10,000 per test order.
                  </span>
                </label>

                <button
                  onClick={() => void startPayment()}
                  disabled={
                    loading || !merchantId || !customerId
                  }
                  className="w-full rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50"
                >
                  Open Razorpay Test Checkout ↗
                </button>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#10141d] p-6">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Webhook confirmation
            </p>

            <h2 className="mt-2 text-lg font-semibold">Payment status</h2>

            <p className="mt-5 rounded-xl border border-white/10 p-4 text-sm leading-6 text-slate-300">
              {status ||
                "Start a test checkout. This panel will wait for the saved transaction."}
            </p>

            {latest && (
              <div className="mt-4 space-y-3 rounded-xl border border-emerald-300/20 p-4">
                <p className="text-sm">
                  Status: <strong>{latest.status}</strong>
                </p>
                <p className="text-sm">
                  Amount:{" "}
                  <strong>{money(latest.amount, latest.currency)}</strong>
                </p>
                <p className="break-all text-xs text-slate-500">
                  Payment ID: {latest.razorpayPaymentId}
                </p>
                <p className="text-xs text-slate-500">
                  {dateTime(latest.timestamp)}
                </p>
              </div>
            )}

            <div className="mt-6 border-t border-white/[.07] pt-5 text-sm leading-7 text-slate-400">
              01 · Create the order on your backend
              <br />
              02 · Complete Razorpay test checkout
              <br />
              03 · Webhook reaches your backend
              <br />
              04 · Transaction and risk analysis are saved
              <br />
              05 · This page polls for the saved record
            </div>
          </section>
        </div>

        <p className="mt-6 text-xs leading-5 text-slate-600">
          Local development only. The current transaction endpoint returns
          global database records; restrict it before making this demo public.
        </p>
      </div>
    </>
  );
}
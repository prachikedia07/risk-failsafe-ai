
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
          err instanceof Error ? err.message : "Could not load merchant/customer records"
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
    if (!availableCustomers.some((customer) => customer.id === customerId)) {
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
      setError("Set your Razorpay Test Mode key ID in frontend/.env.local.");
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

          setStatus("Checkout completed. Waiting for verified webhook confirmation...");

          let attempts = 0;

          const timer = window.setInterval(async () => {
            attempts++;

            try {
              const transactions = await api.get<Transaction[]>("/api/transactions");

              const transaction = transactions.find(
                (item) => item.razorpayPaymentId === paymentId
              );

              if (transaction) {
                setLatest(transaction);
                setStatus(`Webhook record received: ${transaction.status}`);
                window.clearInterval(timer);
              } else if (attempts >= 30) {
                setStatus("No matching record appeared within 60 seconds. Check webhook logs.");
                window.clearInterval(timer);
              }
            } catch {
              if (attempts >= 30) {
                setStatus("Could not confirm the transaction. Check backend logs.");
                window.clearInterval(timer);
              }
            }
          }, 2000);
        },

        modal: {
          ondismiss: () => {
            setStatus("Checkout closed. Check whether a webhook event was already received.");
          },
        },

        theme: {
          color: "#A99A62",
        },
      });

      checkout.open();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create Razorpay test order"
      );
    }
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      <div>
        <div>
          <p className="page-kicker">Sandbox environment</p>
          <h1 className="page-title">Test payments</h1>
          <p className="page-description">
            Create a Razorpay test order and verify its persisted webhook result.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="panel">
            <div className="panel-header">
              <p className="text-sm font-semibold">Create payment</p>
              <p className="mt-1 text-[10px] text-[#858277]">
                Razorpay test checkout
              </p>
            </div>

            <div className="space-y-5 p-5">
              {error && (
                <p className="border border-[#633b35] bg-transparent p-3 text-xs text-[#c98b7f]">
                  {error}
                </p>
              )}

              {loading ? (
                <p className="text-xs text-[#858277]">Loading records...</p>
              ) : (
                <>
                  <label className="block text-xs text-[#bcb8ad]">
                    Merchant
                    <select
                      value={merchantId}
                      onChange={(event) => setMerchantId(event.target.value)}
                      className="field mt-2"
                    >
                      <option value="">Choose merchant</option>
                      {merchants.map((merchant) => (
                        <option key={merchant.id} value={merchant.id}>
                          {merchant.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs text-[#bcb8ad]">
                    Customer
                    <select
                      value={customerId}
                      onChange={(event) => setCustomerId(event.target.value)}
                      className="field mt-2"
                    >
                      <option value="">Choose customer</option>
                      {availableCustomers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs text-[#bcb8ad]">
                    Amount (INR)
                    <div className="mt-2 flex items-center border border-[#34342c] bg-[#050505] px-3">
                      <span className="text-[#a99a62]">₹</span>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        className="w-full bg-transparent px-3 py-3 text-sm outline-none"
                      />
                    </div>
                    <span className="mt-2 block text-[10px] text-[#77756b]">
                      Minimum ₹1 · Maximum ₹10,000
                    </span>
                  </label>

                  <button
                    onClick={() => void startPayment()}
                    disabled={loading || !merchantId || !customerId}
                    className="primary-button w-full px-4 py-3 text-xs font-semibold disabled:opacity-40"
                  >
                    Open Razorpay Checkout ↗
                  </button>
                </>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <p className="text-sm font-semibold">Webhook confirmation</p>
              <p className="mt-1 text-[10px] text-[#858277]">
                Server-verified transaction status
              </p>
            </div>

            <div className="p-5">
              <p className="text-[9px] uppercase tracking-[0.15em] text-[#858277]">
                Current status
              </p>

              <p className="mt-3 border border-[#292922] bg-[#050505] p-4 text-xs leading-6 text-[#c9c5ba]">
                {status || "Start a test checkout. This panel will wait for the saved transaction."}
              </p>

              {latest && (
                <div className="mt-4 border border-[#405b45] bg-transparent p-4">
                  <p className="text-[10px] uppercase tracking-wider text-[#71977a]">
                    Transaction received
                  </p>
                  <p className="mt-3 text-xs">
                    Status: <strong>{latest.status}</strong>
                  </p>
                  <p className="mt-2 text-xs">
                    Amount: <strong>{money(latest.amount, latest.currency)}</strong>
                  </p>
                  <p className="mt-2 break-all text-[10px] text-[#96948a]">
                    Payment ID: {latest.razorpayPaymentId}
                  </p>
                  <p className="mt-2 text-[10px] text-[#858277]">
                    {dateTime(latest.timestamp)}
                  </p>
                </div>
              )}

              <div className="mt-6 border-t border-[#292922] pt-4">
                <p className="text-[9px] uppercase tracking-[0.15em] text-[#858277]">
                  Payment lifecycle
                </p>

                <ol className="mt-3 space-y-3 text-xs text-[#aaa79d]">
                  {[
                    "Create order on backend",
                    "Complete Razorpay test checkout",
                    "Webhook reaches backend",
                    "Transaction and risk analysis are saved",
                    "Frontend confirms the persisted record",
                  ].map((step, index) => (
                    <li key={step} className="flex gap-3">
                      <span className="text-[#a99a62]">
                        0{index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>
        </div>

        <p className="mt-5 text-[10px] leading-5 text-[#68675f]">
          Local development only. Restrict global transaction access before exposing this demo publicly.
        </p>
      </div>
    </>
  );
}

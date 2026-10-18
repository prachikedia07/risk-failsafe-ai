
"use client";

import { useState } from "react";

type TransactionStatus = "Captured" | "Failed" | "Pending";

const transactions: {
  id: string;
  customer: string;
  amount: number;
  method: string;
  status: TransactionStatus;
  risk: number;
}[] = [
  { id: "pay_demo_01", customer: "Customer A", amount: 2499, method: "UPI", status: "Captured", risk: 8 },
  { id: "pay_demo_02", customer: "Customer B", amount: 10000, method: "Netbanking", status: "Failed", risk: 60 },
  { id: "pay_demo_03", customer: "Customer C", amount: 5499, method: "Card", status: "Captured", risk: 12 },
  { id: "pay_demo_04", customer: "Customer D", amount: 10000, method: "Netbanking", status: "Failed", risk: 60 },
];

const alerts = [
  {
    id: "RISK-001",
    title: "Unusual payment failure activity",
    description: "Failure rate reached 75%, well above the baseline.",
    level: "HIGH",
    action: "REVIEW",
    confidence: "85%",
    time: "Latest test scenario",
  },
  {
    id: "RISK-002",
    title: "Transaction velocity spike",
    description: "Transaction velocity was 9.66 standard deviations above baseline.",
    level: "HIGH",
    action: "REVIEW",
    confidence: "85%",
    time: "Previous test scenario",
  },
];

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    green: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20",
    red: "bg-rose-400/10 text-rose-300 ring-rose-400/20",
    amber: "bg-amber-400/10 text-amber-300 ring-amber-400/20",
    neutral: "bg-white/5 text-slate-300 ring-white/10",
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${tones[tone] ?? tones.neutral}`}>
      {children}
    </span>
  );
}

export default function Home() {
  const [activePage, setActivePage] = useState("Dashboard");

  const navigation = [
    { label: "Dashboard", icon: "▦" },
    { label: "Alerts", icon: "⚑" },
    { label: "Test payments", icon: "↗" },
  ];

  return (
    <main className="min-h-screen bg-[#090d14] text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.07] bg-[#0c111a] p-5 md:flex">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-lg font-black text-[#07110e]">
              R
            </div>
            <div>
              <div className="text-base font-semibold tracking-tight">RiskFailsafe</div>
              <div className="mt-0.5 text-xs text-slate-500">PAYMENT INTELLIGENCE</div>
            </div>
          </div>

          <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            Workspace
          </div>
          <nav className="space-y-1">
            {navigation.map((item) => (
              <button
                key={item.label}
                onClick={() => setActivePage(item.label)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                  activePage === item.label
                    ? "bg-emerald-400/10 font-medium text-emerald-300"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <span className="w-5 text-center text-lg">{item.icon}</span>
                {item.label}
                {item.label === "Alerts" && (
                  <span className="ml-auto rounded-full bg-rose-400/10 px-2 py-0.5 text-xs text-rose-300">
                    2
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-slate-300">System overview</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Dashboard preview. Live API connection is the next step.
            </p>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-slate-500">Environment</span>
              <Badge tone="amber">Test mode</Badge>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4 sm:px-8">
            <div>
              <div className="text-xs text-slate-500">Workspace / {activePage}</div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">{activePage}</h1>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone="amber">DEMO DATA</Badge>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold">
                P
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-7 p-5 sm:p-8">
            {activePage === "Dashboard" ? (
              <>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Good evening.</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Here&apos;s an overview of your payment risk activity.
                    </p>
                  </div>
                  <button
                    onClick={() => setActivePage("Test payments")}
                    className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-[#07110e] transition hover:bg-emerald-300"
                  >
                    + Test a payment
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: "Total transactions", value: "4", detail: "Demo records", color: "text-white" },
                    { label: "Captured payments", value: "2", detail: "50% of demo records", color: "text-emerald-300" },
                    { label: "Failed payments", value: "2", detail: "Review failure patterns", color: "text-rose-300" },
                    { label: "Open risk alerts", value: "2", detail: "Requires attention", color: "text-amber-300" },
                  ].map((card) => (
                    <div key={card.label} className="rounded-2xl border border-white/[0.08] bg-[#101722] p-5">
                      <div className="text-sm text-slate-400">{card.label}</div>
                      <div className={`mt-4 text-3xl font-semibold tracking-tight ${card.color}`}>{card.value}</div>
                      <div className="mt-2 text-xs text-slate-500">{card.detail}</div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
                  <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101722]">
                    <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
                      <div>
                        <h3 className="font-semibold">Recent transactions</h3>
                        <p className="mt-1 text-xs text-slate-500">Illustrative records · not live data</p>
                      </div>
                      <button onClick={() => setActivePage("Test payments")} className="text-xs font-medium text-emerald-300 hover:text-emerald-200">
                        Test payment ↗
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[610px] text-left text-sm">
                        <thead className="bg-white/[0.02] text-xs text-slate-500">
                          <tr>
                            <th className="px-5 py-3 font-medium">Transaction</th>
                            <th className="px-5 py-3 font-medium">Method</th>
                            <th className="px-5 py-3 font-medium">Amount</th>
                            <th className="px-5 py-3 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.05]">
                          {transactions.map((transaction) => (
                            <tr key={transaction.id} className="transition hover:bg-white/[0.02]">
                              <td className="px-5 py-4">
                                <div className="font-medium">{transaction.customer}</div>
                                <div className="mt-1 text-xs text-slate-500">{transaction.id}</div>
                              </td>
                              <td className="px-5 py-4 text-slate-400">{transaction.method}</td>
                              <td className="px-5 py-4 font-medium">{formatINR(transaction.amount)}</td>
                              <td className="px-5 py-4">
                                <Badge tone={transaction.status === "Captured" ? "green" : transaction.status === "Failed" ? "red" : "amber"}>
                                  {transaction.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-white/[0.08] bg-[#101722]">
                    <div className="border-b border-white/[0.07] px-5 py-4">
                      <h3 className="font-semibold">Risk intelligence</h3>
                      <p className="mt-1 text-xs text-slate-500">Example investigations from your tests</p>
                    </div>
                    <div className="space-y-4 p-5">
                      {alerts.map((alert) => (
                        <div key={alert.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-sm font-medium leading-5">{alert.title}</div>
                            <Badge tone="amber">{alert.level}</Badge>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-400">{alert.description}</p>
                          <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                            <span className="text-xs text-slate-500">AI action: {alert.action}</span>
                            <span className="text-xs text-emerald-300">{alert.confidence}</span>
                          </div>
                        </div>
                      ))}
                      <button onClick={() => setActivePage("Alerts")} className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.04]">
                        View all alerts →
                      </button>
                    </div>
                  </section>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-5">
                  <div>
                    <div className="text-sm font-medium text-emerald-200">Your risk engine is ready for integration</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      The next step is to replace preview records with data from your Express API.
                    </p>
                  </div>
                  <Badge tone="green">Backend integration next</Badge>
                </div>
              </>
            ) : activePage === "Alerts" ? (
              <section className="rounded-2xl border border-white/[0.08] bg-[#101722]">
                <div className="border-b border-white/[0.07] p-5">
                  <h2 className="text-lg font-semibold">Alert review queue</h2>
                  <p className="mt-1 text-sm text-slate-400">Preview of your risk findings and AI recommendations.</p>
                </div>
                <div className="space-y-4 p-5">
                  {alerts.map((alert) => (
                    <article key={alert.id} className="rounded-xl border border-white/[0.08] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-xs text-slate-500">{alert.id} · {alert.time}</div>
                          <h3 className="mt-2 font-semibold">{alert.title}</h3>
                        </div>
                        <Badge tone="amber">{alert.level} / {alert.action}</Badge>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-400">{alert.description}</p>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
                        <span className="text-xs text-slate-500">Gemini-reported confidence: {alert.confidence}</span>
                        <button className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300" disabled>
                          Backend connection pending
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : (
              <section className="max-w-2xl rounded-2xl border border-white/[0.08] bg-[#101722] p-6 sm:p-8">
                <Badge tone="amber">Razorpay Test Mode</Badge>
                <h2 className="mt-4 text-xl font-semibold">Run a test payment</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  This page is a visual placeholder. We&apos;ll connect it to your existing order-creation endpoint and Razorpay Checkout next.
                </p>
                <div className="mt-6 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <label htmlFor="amount" className="text-sm text-slate-300">Test amount (INR)</label>
                  <input
                    id="amount"
                    type="number"
                    defaultValue={100}
                    min={1}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0b1018] px-3 py-3 text-white outline-none focus:border-emerald-400"
                  />
                  <button disabled className="mt-4 w-full cursor-not-allowed rounded-xl bg-emerald-400/40 px-4 py-3 text-sm font-semibold text-white/60">
                    Checkout integration coming next
                  </button>
                </div>
                <p className="mt-4 text-xs leading-5 text-slate-500">
                  No payment is initiated by this preview. We will use your existing backend to create the Razorpay order securely.
                </p>
              </section>
            )}
            <footer className="border-t border-white/[0.06] pt-5 text-xs text-slate-600">
              RiskFailsafe · Fraud-risk monitoring prototype · Demo data until API integration
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}

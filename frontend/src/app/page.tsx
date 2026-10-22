"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  api,
  dateTime,
  money,
  type Alert,
  type Transaction,
} from "@/lib/api";

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#10141d] p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{note}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [transactions, setTransactions] =
    useState<Transaction[] | null>(null);

  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setError("");

      const data = await api.get<Transaction[]>(
        "/api/transactions"
      );

      setTransactions(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load transactions"
      );
    }

    try {
      const data = await api.get<Alert[]>("/api/alerts");
      setAlerts(data);
    } catch {
      setAlerts(null);
    }
  }, []);

  useEffect(() => {
    void loadData();

    const interval = window.setInterval(() => {
      void loadData();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadData]);

  const rows = transactions ?? [];
  const successful = rows.filter(
    (t) => t.status === "SUCCESS"
  );
  const failed = rows.filter(
    (t) => t.status === "FAILED"
  );

  const totalVolume = successful.reduce(
    (sum, t) => sum + t.amount,
    0
  );

  const openAlerts =
    alerts?.filter((a) => a.status === "OPEN").length;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.22em] text-cyan-300">
            Live monitoring
          </p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
            Overview
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Actual backend records · Refreshes every five seconds
          </p>
        </div>

        <button
          onClick={() => void loadData()}
          className="rounded-xl border border-white/10 px-4 py-2.5 text-sm hover:bg-white/5"
        >
          ↻ Refresh
        </button>
      </div>

      {error ? (
        <div className="mt-8 rounded-xl border border-rose-400/20 p-5">
          <p className="font-medium text-rose-200">
            Could not load transactions
          </p>
          <p className="mt-2 break-words text-sm text-slate-400">
            {error}
          </p>
          <button
            onClick={() => void loadData()}
            className="mt-4 rounded-lg border border-white/10 px-3 py-2 text-sm"
          >
            Retry
          </button>
        </div>
      ) : transactions === null ? (
        <p className="mt-8 text-sm text-slate-400">
          Loading dashboard…
        </p>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Transactions"
              value={String(rows.length)}
              note="Records returned by the backend"
            />
            <StatCard
              label="Successful volume"
              value={money(totalVolume)}
              note={`${successful.length} successful payments`}
            />
            <StatCard
              label="Failed payments"
              value={String(failed.length)}
              note={
                rows.length
                  ? `${((failed.length / rows.length) * 100).toFixed(1)}% of transactions`
                  : "No transactions yet"
              }
            />
            <StatCard
              label="Open alerts"
              value={openAlerts === undefined ? "—" : String(openAlerts)}
              note={
                alerts === null
                  ? "Alerts unavailable"
                  : `${alerts.length} saved alerts`
              }
            />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_.8fr]">
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#10141d]">
              <div className="flex items-center justify-between border-b border-white/10 p-5">
                <div>
                  <h2 className="font-semibold">Recent transactions</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Latest persisted payment records
                  </p>
                </div>
                <Link
                  href="/transactions"
                  className="text-sm text-cyan-200"
                >
                  View all ↗
                </Link>
              </div>

              {rows.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">
                  No transactions recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Payment</th>
                        <th className="px-5 py-3">Method</th>
                        <th className="px-5 py-3">Amount</th>
                        <th className="px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 6).map((t) => (
                        <tr
                          key={t.id}
                          className="border-t border-white/[.06]"
                        >
                          <td className="px-5 py-4">
                            {t.id.slice(0, 8)}…
                            <p className="mt-1 text-xs text-slate-500">
                              {dateTime(t.timestamp)}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            {t.paymentMethod}
                          </td>
                          <td className="px-5 py-4">
                            {money(t.amount, t.currency)}
                          </td>
                          <td className="px-5 py-4">
                            {t.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#10141d]">
              <div className="border-b border-white/10 p-5">
                <h2 className="font-semibold">Risk alerts</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Saved AI investigations
                </p>
              </div>

              {alerts === null ? (
                <p className="p-5 text-sm text-slate-500">
                  Could not load alerts. Check the alert endpoint.
                </p>
              ) : alerts.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">
                  No saved alerts yet.
                </p>
              ) : (
                alerts.slice(0, 5).map((a) => (
                  <Link
                    href="/alerts"
                    key={a.id}
                    className="block border-t border-white/[.06] p-5 hover:bg-white/[.025]"
                  >
                    <div className="flex justify-between gap-3">
                      <p className="text-sm font-medium">{a.title}</p>
                      <span className="text-rose-200">
                        {a.riskScore}/100
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      {a.message}
                    </p>
                    <p className="mt-3 text-xs text-slate-600">
                      {dateTime(a.createdAt)} · {a.status}
                    </p>
                  </Link>
                ))
              )}
            </section>
          </div>
        </>
      )}

      <p className="mt-7 text-xs leading-5 text-slate-600">
        Local development dashboard. The current API returns global database
        records; do not expose it publicly until a restricted demo API exists.
      </p>
    </div>
  );
}
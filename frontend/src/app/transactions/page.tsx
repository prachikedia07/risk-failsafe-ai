"use client";

import { useCallback, useEffect, useState } from "react";
import { api, dateTime, money, type Transaction } from "@/lib/api";

export default function TransactionsPage() {
  const [transactions, setTransactions] =
    useState<Transaction[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");

  const loadTransactions = useCallback(async () => {
    try {
      setError("");
      const data = await api.get<Transaction[]>("/api/transactions");
      setTransactions(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load transactions"
      );
    }
  }, []);

  useEffect(() => {
    void loadTransactions();

    const timer = window.setInterval(
      () => void loadTransactions(),
      5000
    );

    return () => window.clearInterval(timer);
  }, [loadTransactions]);

  const filtered = (transactions ?? []).filter(
    (transaction) =>
      filter === "ALL" || transaction.status === filter
  );

  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-xs uppercase tracking-[.22em] text-cyan-300">
        Payment ledger
      </p>

      <h1 className="mt-2 text-3xl font-semibold">Transactions</h1>

      <p className="mt-3 text-sm text-slate-400">
        Persisted payment records, refreshed every five seconds.
      </p>

      <div className="mt-7 flex flex-wrap justify-between gap-3">
        <p className="text-sm text-slate-400">
          {transactions === null
            ? "Loading…"
            : `${filtered.length} records`}
        </p>

        <div className="flex gap-2">
          {["ALL", "SUCCESS", "FAILED", "PENDING"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-lg px-3 py-2 text-xs ${
                filter === status
                  ? "bg-cyan-300 text-slate-950"
                  : "border border-white/10 text-slate-400 hover:bg-white/5"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {error ? (
          <div className="rounded-xl border border-rose-400/20 p-5">
            <p className="text-rose-200">{error}</p>
            <button
              onClick={() => void loadTransactions()}
              className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-sm"
            >
              Retry
            </button>
          </div>
        ) : transactions === null ? (
          <p className="text-sm text-slate-400">Loading records…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
            <p className="font-medium">
              {transactions.length
                ? "No matching transactions"
                : "No transactions yet"}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Records appear here after they're saved by the backend.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#10141d]">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  {[
                    "Transaction",
                    "Date",
                    "Method",
                    "Amount",
                    "Status",
                    "Failure reason",
                  ].map((heading) => (
                    <th key={heading} className="px-5 py-4 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-t border-white/[.06] hover:bg-white/[.02]"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium">
                        {transaction.id.slice(0, 8)}…
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {transaction.razorpayPaymentId || "No payment ID"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-slate-400">
                      {dateTime(transaction.timestamp)}
                    </td>

                    <td className="px-5 py-4">
                      {transaction.paymentMethod}
                    </td>

                    <td className="px-5 py-4 tabular-nums">
                      {money(transaction.amount, transaction.currency)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          transaction.status === "SUCCESS"
                            ? "bg-emerald-400/10 text-emerald-300"
                            : transaction.status === "FAILED"
                              ? "bg-rose-400/10 text-rose-300"
                              : "bg-amber-400/10 text-amber-200"
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </td>

                    <td className="max-w-xs px-5 py-4 text-slate-500">
                      {transaction.failureReason || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
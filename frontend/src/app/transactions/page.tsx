
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  dateTime,
  money,
  type Transaction,
} from "@/lib/api";

const filters = ["ALL", "SUCCESS", "FAILED", "PENDING"];

export default function TransactionsPage() {
  const [transactions, setTransactions] =
    useState<Transaction[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const loadTransactions = useCallback(async () => {
    try {
      setError("");
      const data = await api.get<Transaction[]>("/api/transactions");
      setTransactions(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load transactions"
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

  const filtered = (transactions ?? []).filter((transaction) => {
    const matchesStatus =
      filter === "ALL" || transaction.status === filter;

    const term = search.toLowerCase();

    const matchesSearch =
      !term ||
      transaction.id.toLowerCase().includes(term) ||
      (transaction.razorpayPaymentId ?? "").toLowerCase().includes(term) ||
      transaction.paymentMethod.toLowerCase().includes(term);

    return matchesStatus && matchesSearch;
  });

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="page-kicker">Payment ledger</p>
          <h1 className="page-title">Transactions</h1>
          <p className="page-description">
            Persisted payment records · Auto-refreshes every five seconds
          </p>
        </div>

        <button
          onClick={() => void loadTransactions()}
          className="secondary-button px-3 py-2 text-xs"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-px border border-[#292922] bg-[#292922] sm:grid-cols-4">
        {[
          ["Total", transactions?.length ?? "—"],
          ["Successful", transactions?.filter(t => t.status === "SUCCESS").length ?? "—"],
          ["Failed", transactions?.filter(t => t.status === "FAILED").length ?? "—"],
          ["Pending", transactions?.filter(t => t.status === "PENDING").length ?? "—"],
        ].map(([label, value]) => (
          <div key={label} className="bg-[#050505] p-3">
            <p className="text-[10px] text-[#858277]">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row">
        <div className="flex flex-wrap gap-1">
          {filters.map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`border px-3 py-2 text-[10px] tracking-wide ${
                filter === status
                  ? "border-[#a99a62] bg-transparent text-[#d4bd88]"
                  : "border-[#292922] text-[#96948a] hover:bg-[#171814]"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search transaction or payment ID..."
          className="field sm:max-w-[280px]"
        />
      </div>

      <div className="mt-4">
        {error ? (
          <div className="border border-[#633b35] bg-transparent p-5 text-sm text-[#c98b7f]">
            {error}
            <button
              onClick={() => void loadTransactions()}
              className="ml-3 underline"
            >
              Retry
            </button>
          </div>
        ) : transactions === null ? (
          <p className="py-8 text-xs text-[#858277]">Loading transactions...</p>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-[#39382f] p-10 text-center">
            <p className="text-sm text-[#d4d0c5]">
              {transactions.length ? "No matching transactions" : "No transactions yet"}
            </p>
            <p className="mt-2 text-xs text-[#77756b]">
              Payment records will appear here when saved by the backend.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#292922] bg-[#050505]">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-[#171814] text-[9px] uppercase tracking-[0.12em] text-[#858277]">
                <tr>
                  {["Transaction", "Date", "Method", "Amount", "Status", "Failure reason"].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-t border-[#292922] hover:bg-[#191a15]"
                  >
                    <td className="px-4 py-3">
                      <p className="text-[#dedbd2]">
                        {transaction.id.slice(0, 8)}…
                      </p>
                      <p className="mt-1 text-[10px] text-[#77756b]">
                        {transaction.razorpayPaymentId || "No payment ID"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[#96948a]">
                      {dateTime(transaction.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-[#c4c0b5]">
                      {transaction.paymentMethod}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[#e8e5dc]">
                      {money(transaction.amount, transaction.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={
                        transaction.status === "SUCCESS"
                          ? "status-success"
                          : transaction.status === "FAILED"
                            ? "status-danger"
                            : "status-warning"
                      }>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-[#858277]">
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

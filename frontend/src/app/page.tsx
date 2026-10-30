"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  api,
  dateTime,
  money,
  type Alert,
  type Transaction,
} from "@/lib/api";

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border border-[#252525] p-4">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[#666666]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {note && <p className="mt-1 text-[10px] text-[#666666]">{note}</p>}
    </div>
  );
}

function Panel({
  title,
  note,
  action,
  children,
}: {
  title: string;
  note?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[#252525]">
      <div className="flex items-center justify-between border-b border-[#252525] px-4 py-3">
        <div>
          <h2 className="text-xs font-semibold">{title}</h2>
          {note && <p className="mt-0.5 text-[10px] text-[#666666]">{note}</p>}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-xs text-[#666666]">{text}</p>;
}

function HBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[11px]">
        <span className="text-[#929292]">{label}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      <div className="mt-1.5 h-1 bg-[#1a1a1a]">
        <div className="h-full" style={{ width: `${max ? (value / max) * 100 : 0}%`, background: color }} />
      </div>
    </div>
  );
}

const GREEN = "#7e9c84";
const RED = "#b07a72";
const GOLD = "#a99a62";
const GRAY = "#444444";

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setError("");
      const data = await api.get<Transaction[]>("/api/transactions");
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load transactions");
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
    const interval = window.setInterval(() => void loadData(), 5000);
    return () => window.clearInterval(interval);
  }, [loadData]);

  const rows = useMemo(() => transactions ?? [], [transactions]);
  const successful = rows.filter((t) => t.status === "SUCCESS");
  const failed = rows.filter((t) => t.status === "FAILED");
  const totalVolume = successful.reduce((sum, t) => sum + t.amount, 0);
  const openAlerts = alerts?.filter((a) => a.status === "OPEN").length;
  const decided = successful.length + failed.length;
  const successRate = decided ? (successful.length / decided) * 100 : null;
  const failureRate = decided ? (failed.length / decided) * 100 : null;

  // Transactions per day, from real timestamps (last 14 days that have data)
  const daily = useMemo(() => {
    const map = new Map<string, { success: number; failed: number; other: number }>();
    for (const t of rows) {
      const d = new Date(t.timestamp);
      if (Number.isNaN(d.getTime())) continue;
      const key = d.toLocaleDateString("en-CA");
      const cur = map.get(key) ?? { success: 0, failed: 0, other: 0 };
      if (t.status === "SUCCESS") cur.success++;
      else if (t.status === "FAILED") cur.failed++;
      else cur.other++;
      map.set(key, cur);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-14);
  }, [rows]);

  const dailyMax = Math.max(1, ...daily.map(([, v]) => v.success + v.failed + v.other));

  // Alerts by severity and score bucket
  const severity = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of alerts ?? []) map.set(a.riskLevel, (map.get(a.riskLevel) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [alerts]);

  const buckets = useMemo(() => {
    const b = [0, 0, 0, 0, 0];
    for (const a of alerts ?? []) b[Math.min(4, Math.floor(a.riskScore / 20))]++;
    return b;
  }, [alerts]);

  return (
    <div>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="page-kicker">Live monitoring</p>
          <h1 className="page-title">Overview</h1>
          <p className="page-description">Backend records · refreshes every five seconds</p>
        </div>
        <button onClick={() => void loadData()} className="secondary-button px-3 py-2 text-xs">
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mt-6 border border-[#5a3a35] p-5">
          <p className="text-sm text-[#b07a72]">Could not load transactions</p>
          <p className="mt-2 break-words text-xs text-[#929292]">{error}</p>
          <button onClick={() => void loadData()} className="secondary-button mt-4 px-3 py-2 text-xs">
            Retry
          </button>
        </div>
      ) : transactions === null ? (
        <p className="mt-6 text-xs text-[#929292]">Loading dashboard…</p>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Transactions" value={String(rows.length)} />
            <Stat label="Successful volume" value={money(totalVolume)} note={`${successful.length} successful payments`} />
            <Stat label="Failed payments" value={String(failed.length)} />
            <Stat
              label="Open alerts"
              value={openAlerts === undefined ? "—" : String(openAlerts)}
              note={alerts === null ? "Alerts unavailable" : `${alerts.length} total`}
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Stat label="Success rate" value={successRate === null ? "—" : `${successRate.toFixed(1)}%`} note="Of completed payments" />
            <Stat label="Failure rate" value={failureRate === null ? "—" : `${failureRate.toFixed(1)}%`} note="Of completed payments" />
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
            <Panel title="Transactions per day" note="Success / failed / other · from saved timestamps">
              {daily.length === 0 ? (
                <Empty text="No transactions recorded yet." />
              ) : (
                <>
                  <div className="flex h-40 items-end gap-2">
                    {daily.map(([day, v]) => {
                      const total = v.success + v.failed + v.other;
                      return (
                        <div
                          key={day}
                          className="flex h-full flex-1 flex-col justify-end"
                          title={`${day}: ${v.success} success, ${v.failed} failed, ${v.other} other`}
                        >
                          <div style={{ height: `${(total / dailyMax) * 100}%` }} className="flex flex-col-reverse">
                            <div style={{ flex: v.success, background: GREEN }} />
                            <div style={{ flex: v.failed, background: RED }} />
                            <div style={{ flex: v.other, background: GRAY }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex gap-2">
                    {daily.map(([day]) => (
                      <span key={day} className="flex-1 text-center text-[9px] text-[#666666]">
                        {day.slice(5)}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-4 text-[10px] text-[#929292]">
                    <span><span style={{ color: GREEN }}>■</span> Success</span>
                    <span><span style={{ color: RED }}>■</span> Failed</span>
                    <span><span style={{ color: GRAY }}>■</span> Other</span>
                  </div>
                </>
              )}
            </Panel>

            <div className="space-y-4">
              <Panel title="Alerts by severity">
                {severity.length === 0 ? (
                  <Empty text="No alerts yet." />
                ) : (
                  <div className="space-y-3">
                    {severity.map(([level, count]) => (
                      <HBar key={level} label={level} value={count} max={alerts?.length ?? 1} color={GOLD} />
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Alert risk score distribution">
                {(alerts ?? []).length === 0 ? (
                  <Empty text="No alerts yet." />
                ) : (
                  <div className="space-y-3">
                    {buckets.map((count, i) => (
                      <HBar
                        key={i}
                        label={`${i * 20}–${i === 4 ? 100 : i * 20 + 19}`}
                        value={count}
                        max={Math.max(1, ...buckets)}
                        color={GOLD}
                      />
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Panel
              title="Recent transactions"
              action={<Link href="/transactions" className="text-[11px] text-[#a99a62]">View all</Link>}
            >
              {rows.length === 0 ? (
                <Empty text="No transactions recorded yet." />
              ) : (
                <div className="-mx-4 -my-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[9px] uppercase tracking-[0.12em] text-[#666666]">
                      <tr>
                        <th className="px-4 py-3 font-medium">Payment</th>
                        <th className="px-4 py-3 font-medium">Method</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 6).map((t) => (
                        <tr key={t.id} className="border-t border-[#252525]">
                          <td className="px-4 py-3">
                            {t.id.slice(0, 8)}…
                            <p className="mt-1 text-[10px] text-[#666666]">{dateTime(t.timestamp)}</p>
                          </td>
                          <td className="px-4 py-3 text-[#929292]">{t.paymentMethod}</td>
                          <td className="px-4 py-3 tabular-nums">{money(t.amount, t.currency)}</td>
                          <td className={`px-4 py-3 ${t.status === "SUCCESS" ? "status-success" : t.status === "FAILED" ? "status-danger" : "status-warning"}`}>
                            {t.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel
              title="Recent risk alerts"
              action={<Link href="/alerts" className="text-[11px] text-[#a99a62]">View all</Link>}
            >
              {alerts === null ? (
                <Empty text="Could not load alerts. Check the alert endpoint." />
              ) : alerts.length === 0 ? (
                <Empty text="No saved alerts yet." />
              ) : (
                <div className="-mx-4 -my-4">
                  {alerts.slice(0, 5).map((a, i) => (
                    <Link
                      href="/alerts"
                      key={a.id}
                      className={`block px-4 py-3 hover:bg-[#0a0a0a] ${i > 0 ? "border-t border-[#252525]" : ""}`}
                    >
                      <div className="flex justify-between gap-3">
                        <p className="text-xs">{a.title}</p>
                        <span className="tabular-nums text-[#b07a72]">{a.riskScore}/100</span>
                      </div>
                      <p className="mt-1 text-[10px] text-[#666666]">
                        {dateTime(a.createdAt)} · {a.status}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </>
      )}

      <p className="mt-6 text-[10px] text-[#666666]">
        Local development dashboard. The API returns global database records; do not expose it publicly.
      </p>
    </div>
  );
}
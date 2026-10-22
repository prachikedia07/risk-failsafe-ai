
"use client";

import { useCallback, useEffect, useState } from "react";
import { api, dateTime, type Alert } from "@/lib/api";

type AlertStatus = "OPEN" | "REVIEWED" | "RESOLVED";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [filter, setFilter] = useState("ALL");

  const loadAlerts = useCallback(async () => {
    try {
      setError("");
      const data = await api.get<Alert[]>("/api/alerts");
      setAlerts(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load alerts"
      );
    }
  }, []);

  useEffect(() => {
    void loadAlerts();
    const timer = window.setInterval(() => void loadAlerts(), 5000);
    return () => window.clearInterval(timer);
  }, [loadAlerts]);

  async function investigate(riskAnalysisId: string) {
    setBusy(riskAnalysisId);
    setNotice("");

    try {
      await api.post(`/api/agent/investigate/${riskAnalysisId}`, {});
      setNotice("Investigation request completed. Refreshing alert details.");
      await loadAlerts();
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Investigation failed"
      );
      await loadAlerts();
    } finally {
      setBusy("");
    }
  }

  async function changeStatus(id: string, status: AlertStatus) {
    setBusy(id);
    setNotice("");

    try {
      await api.post(`/api/alerts/${id}/status`, { status });
      setNotice(`Alert status updated to ${status}.`);
      await loadAlerts();
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Could not update alert status"
      );
    } finally {
      setBusy("");
    }
  }

  const filtered = (alerts ?? []).filter(
    (alert) => filter === "ALL" || alert.status === filter
  );

  function investigationLabel(status?: string) {
    switch (status) {
      case "COMPLETED":
        return "AI investigation completed";
      case "UNAVAILABLE":
        return "AI unavailable · Manual review";
      default:
        return "Investigation pending";
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-xs uppercase tracking-[.22em] text-cyan-300">
        Investigation queue
      </p>

      <h1 className="mt-2 text-3xl font-semibold">Risk alerts</h1>

      <p className="mt-3 text-sm text-slate-400">
        Statistical risk signals, AI investigation results, and review status.
      </p>

      {notice && (
        <p className="mt-5 rounded-xl border border-cyan-300/20 p-4 text-sm text-cyan-100">
          {notice}
        </p>
      )}

      <div className="mt-7 flex flex-wrap justify-between gap-3">
        <p className="text-sm text-slate-400">
          {alerts === null ? "Loading alerts…" : `${filtered.length} alerts`}
        </p>

        <div className="flex flex-wrap gap-2">
          {["ALL", "OPEN", "REVIEWED", "RESOLVED"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-lg px-3 py-2 text-xs ${
                filter === status
                  ? "bg-cyan-300 text-slate-950"
                  : "border border-white/10 text-slate-400"
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
              onClick={() => void loadAlerts()}
              className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-sm"
            >
              Retry
            </button>
          </div>
        ) : alerts === null ? (
          <p className="text-sm text-slate-400">Loading saved alerts…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
            <p className="font-medium">
              {alerts.length ? "No alerts in this filter" : "No saved alerts"}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Suspicious activity will appear here when an alert is saved.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((alert) => (
              <article
                key={alert.id}
                className="rounded-2xl border border-white/10 bg-[#10141d] p-5 md:p-6"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-rose-400/10 px-2.5 py-1 text-xs text-rose-200">
                        {alert.riskLevel} · {alert.riskScore}/100
                      </span>

                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-300">
                        {alert.status}
                      </span>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs ${
                          alert.investigationStatus === "COMPLETED"
                            ? "border-emerald-400/20 text-emerald-200"
                            : alert.investigationStatus === "UNAVAILABLE"
                              ? "border-amber-400/20 text-amber-200"
                              : "border-white/10 text-slate-400"
                        }`}
                      >
                        {investigationLabel(alert.investigationStatus)}
                      </span>

                      {alert.action && (
                        <span className="rounded-full border border-cyan-300/20 px-2.5 py-1 text-xs text-cyan-200">
                          Recommended action: {alert.action}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-3 text-lg font-semibold">
                      {alert.title}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {alert.message}
                    </p>

                    <p className="mt-3 break-all text-xs text-slate-600">
                      {dateTime(alert.createdAt)} · Analysis ID:{" "}
                      {alert.riskAnalysisId}
                    </p>
                  </div>

                  <button
                    disabled={busy === alert.id || busy === alert.riskAnalysisId}
                    onClick={() => void investigate(alert.riskAnalysisId)}
                    className="h-fit shrink-0 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-medium text-slate-950 disabled:opacity-50"
                  >
                    {busy === alert.riskAnalysisId
                      ? "Investigating…"
                      : alert.investigationStatus === "UNAVAILABLE"
                        ? "Retry AI investigation"
                        : alert.investigationStatus === "COMPLETED"
                          ? "Run AI investigation again"
                          : "Run AI investigation"}
                  </button>
                </div>

                {Array.isArray(alert.agentReasons) &&
                  alert.agentReasons.length > 0 && (
                    <div className="mt-5 border-t border-white/[.07] pt-4">
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        Investigation reasons
                      </p>
                      <ul className="mt-3 space-y-2">
                        {alert.agentReasons.map((reason, index) => (
                          <li key={index} className="text-sm text-slate-300">
                            <span className="mr-2 text-cyan-300">↳</span>
                            {String(reason)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {alert.investigationStatus === "COMPLETED" &&
                  alert.confidence != null && (
                    <p className="mt-4 text-xs text-slate-500">
                      AI confidence: {(alert.confidence * 100).toFixed(0)}%
                    </p>
                  )}

                {alert.investigationStatus === "UNAVAILABLE" && (
                  <p className="mt-4 text-xs text-amber-200">
                    No AI decision was returned. The displayed recommendation
                    is a fallback for manual review, not a Gemini decision.
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-2 border-t border-white/[.07] pt-4">
                  {alert.status !== "REVIEWED" && (
                    <button
                      disabled={busy === alert.id || busy === alert.riskAnalysisId}
                      onClick={() => void changeStatus(alert.id, "REVIEWED")}
                      className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 disabled:opacity-50"
                    >
                      Mark reviewed
                    </button>
                  )}

                  {alert.status !== "RESOLVED" && (
                    <button
                      disabled={busy === alert.id || busy === alert.riskAnalysisId}
                      onClick={() => void changeStatus(alert.id, "RESOLVED")}
                      className="rounded-lg border border-emerald-400/20 px-3 py-2 text-sm text-emerald-200 disabled:opacity-50"
                    >
                      Resolve alert
                    </button>
                  )}

                  {alert.status !== "OPEN" && (
                    <button
                      disabled={busy === alert.id || busy === alert.riskAnalysisId}
                      onClick={() => void changeStatus(alert.id, "OPEN")}
                      className="rounded-lg border border-amber-400/20 px-3 py-2 text-sm text-amber-200 disabled:opacity-50"
                    >
                      Reopen alert
                    </button>
                  )}
                </div>

                {alert.riskAnalysis && (
                  <details className="mt-5 border-t border-white/[.07] pt-4">
                    <summary className="cursor-pointer text-sm text-cyan-200">
                      View risk engine evidence
                    </summary>
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-black/20 p-4 text-xs leading-5 text-slate-400">
                      {JSON.stringify(
                        {
                          prediction: alert.riskAnalysis.prediction,
                          features: alert.riskAnalysis.features,
                          reasons: alert.riskAnalysis.reasons,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </details>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

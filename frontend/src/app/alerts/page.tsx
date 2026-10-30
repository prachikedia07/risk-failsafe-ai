
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
      setError(err instanceof Error ? err.message : "Could not load alerts");
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
      setNotice("Investigation completed. Alert details refreshed.");
      await loadAlerts();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Investigation failed");
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
      setNotice(`Alert status changed to ${status}.`);
      await loadAlerts();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not update alert");
    } finally {
      setBusy("");
    }
  }

  const filtered = (alerts ?? []).filter(
    (alert) => filter === "ALL" || alert.status === filter
  );

  const openCount = alerts?.filter(a => a.status === "OPEN").length ?? 0;
  const reviewedCount = alerts?.filter(a => a.status === "REVIEWED").length ?? 0;
  const resolvedCount = alerts?.filter(a => a.status === "RESOLVED").length ?? 0;

  function investigationLabel(status?: string) {
    if (status === "COMPLETED") return "Investigation completed";
    if (status === "UNAVAILABLE") return "AI unavailable";
    return "Pending";
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="page-kicker">Risk operations</p>
          <h1 className="page-title">Risk alerts</h1>
          <p className="page-description">
            Detection results, investigation decisions and review status
          </p>
        </div>
        <button
          onClick={() => void loadAlerts()}
          className="secondary-button px-3 py-2 text-xs"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-px border border-[#292922] bg-[#292922]">
        {[
          ["Open", openCount],
          ["Reviewed", reviewedCount],
          ["Resolved", resolvedCount],
        ].map(([label, value]) => (
          <div key={label} className="bg-[#050505] p-3">
            <p className="text-[10px] text-[#858277]">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {notice && (
        <div className="mt-4 border border-[#665535] bg-transparent px-4 py-3 text-xs text-[#d4bd88]">
          {notice}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#858277]">
          {alerts === null ? "Loading alerts..." : `${filtered.length} alerts`}
        </p>

        <div className="flex flex-wrap gap-1">
          {["ALL", "OPEN", "REVIEWED", "RESOLVED"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`border px-3 py-2 text-[10px] ${
                filter === status
                  ? "border-[#a99a62] bg-transparent text-[#d4bd88]"
                  : "border-[#292922] text-[#96948a] hover:bg-[#0a0a0a]"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {error ? (
          <div className="border border-[#633b35] bg-transparent p-5 text-sm text-[#c98b7f]">
            {error}
            <button onClick={() => void loadAlerts()} className="ml-3 underline">
              Retry
            </button>
          </div>
        ) : alerts === null ? (
          <p className="py-8 text-xs text-[#858277]">Loading saved alerts...</p>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-[#39382f] p-10 text-center">
            <p className="text-sm text-[#dedbd2]">
              {alerts.length ? "No alerts in this filter" : "No saved alerts"}
            </p>
            <p className="mt-2 text-xs text-[#77756b]">
              Suspicious activity will appear here when an alert is saved.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((alert) => (
              <article
                key={alert.id}
                className="border border-[#292922] bg-[#050505]"
              >
                <div className="p-4 md:p-5">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[10px]">
                        <span className="border border-[#70443d] bg-transparent px-2 py-1 text-[#c9877b]">
                          {alert.riskLevel} · {alert.riskScore}/100
                        </span>

                        <span className="border border-[#39382f] px-2 py-1 text-[#b9b5a9]">
                          {alert.status}
                        </span>

                        <span className="border border-[#665535] px-2 py-1 text-[#a99a62]">
                          {investigationLabel(alert.investigationStatus)}
                        </span>

                        {alert.action && (
                          <span className="border border-[#665535] px-2 py-1 text-[#d4bd88]">
                            Action: {alert.action}
                          </span>
                        )}
                      </div>

                      <h2 className="mt-3 text-sm font-semibold text-[#e8e5dc]">
                        {alert.title}
                      </h2>

                      <p className="mt-2 max-w-3xl text-xs leading-6 text-[#aaa79d]">
                        {alert.message}
                      </p>

                      <p className="mt-3 break-all text-[10px] text-[#77756b]">
                        {dateTime(alert.createdAt)} · Analysis ID: {alert.riskAnalysisId}
                      </p>
                    </div>

                    <button
                      disabled={busy === alert.id || busy === alert.riskAnalysisId}
                      onClick={() => void investigate(alert.riskAnalysisId)}
                      className="primary-button h-fit shrink-0 px-3 py-2 text-xs font-medium disabled:opacity-50"
                    >
                      {busy === alert.riskAnalysisId
                        ? "Investigating..."
                        : alert.investigationStatus === "UNAVAILABLE"
                          ? "Retry investigation"
                          : alert.investigationStatus === "COMPLETED"
                            ? "Run again"
                            : "Run investigation"}
                    </button>
                  </div>

                  {Array.isArray(alert.agentReasons) &&
                    alert.agentReasons.length > 0 && (
                      <div className="mt-4 border-t border-[#292922] pt-4">
                        <p className="text-[9px] uppercase tracking-[0.14em] text-[#858277]">
                          Investigation reasons
                        </p>
                        <ul className="mt-3 space-y-2">
                          {alert.agentReasons.map((reason, index) => (
                            <li key={index} className="text-xs text-[#c5c1b6]">
                              <span className="mr-2 text-[#a99a62]">—</span>
                              {String(reason)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {alert.investigationStatus === "COMPLETED" &&
                    alert.confidence != null && (
                      <p className="mt-3 text-[10px] text-[#96948a]">
                        Investigation confidence: {(alert.confidence * 100).toFixed(0)}%
                      </p>
                    )}

                  {alert.investigationStatus === "UNAVAILABLE" && (
                    <p className="mt-3 text-[10px] text-[#a99a62]">
                      No AI decision was returned. The recommendation is a fallback
                      for manual review, not an AI-generated decision.
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[#292922] pt-4">
                    {alert.status !== "REVIEWED" && (
                      <button
                        disabled={busy === alert.id || busy === alert.riskAnalysisId}
                        onClick={() => void changeStatus(alert.id, "REVIEWED")}
                        className="secondary-button px-3 py-2 text-[11px] disabled:opacity-50"
                      >
                        Mark reviewed
                      </button>
                    )}

                    {alert.status !== "RESOLVED" && (
                      <button
                        disabled={busy === alert.id || busy === alert.riskAnalysisId}
                        onClick={() => void changeStatus(alert.id, "RESOLVED")}
                        className="border border-[#405b45] px-3 py-2 text-[11px] text-[#8caf91] disabled:opacity-50"
                      >
                        Resolve
                      </button>
                    )}

                    {alert.status !== "OPEN" && (
                      <button
                        disabled={busy === alert.id || busy === alert.riskAnalysisId}
                        onClick={() => void changeStatus(alert.id, "OPEN")}
                        className="border border-[#665535] px-3 py-2 text-[11px] text-[#a99a62] disabled:opacity-50"
                      >
                        Reopen
                      </button>
                    )}
                  </div>

                  {alert.riskAnalysis && (
                    <details className="mt-4 border-t border-[#292922] pt-4">
                      <summary className="cursor-pointer text-xs text-[#a99a62]">
                        View risk engine evidence
                      </summary>
                      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words border border-[#292922] bg-[#050505] p-3 text-[10px] leading-5 text-[#aaa79d]">
                        {JSON.stringify({
                          prediction: alert.riskAnalysis.prediction,
                          features: alert.riskAnalysis.features,
                          reasons: alert.riskAnalysis.reasons,
                        }, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

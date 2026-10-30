"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Prediction = {
  scenarioId: string;
  actual: "NORMAL" | "SUSPICIOUS";
  predicted: "NORMAL" | "SUSPICIOUS";
  riskScore: number;
  pattern?: string;
  features: {
    transactionCount: number;
    averageAmount: number;
    failureRate: number;
    transactionsPerMinute: number;
    newCustomerRatio: number;
  };
};

type EvaluationReport = {
  reportVersion: string;
  metadata: {
    generatedAt: string;
    datasetHash: string;
    evaluationType: string;
    splitRatio: number;
    predictionThreshold: number;
  };
  dataset: {
    total: { normal: number; suspicious: number; total: number };
    development: { normal: number; suspicious: number; total: number };
    test: { normal: number; suspicious: number; total: number };
  };
  metrics: {
    total: number;
    truePositive: number;
    falsePositive: number;
    trueNegative: number;
    falseNegative: number;
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    falsePositiveRate: number;
    specificity: number;
  };
  patternPerformance: {
    pattern: string;
    totalCases: number;
    detected: number;
    missed: number;
    detectionRate: number;
    averageRiskScore: number;
  }[];
  scoreDistribution: {
    normal: { average: number; minimum: number; maximum: number };
    suspicious: { average: number; minimum: number; maximum: number };
  };
  falsePositives: Prediction[];
  falseNegatives: Prediction[];
  predictions: Prediction[];
};

const GOLD = "#a99a62";
const GREEN = "#7e9c84";
const RED = "#b07a72";

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="border border-[#252525] p-4">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[#666666]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-[10px] text-[#666666]">{note}</p>
    </div>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[#252525]">
      <div className="border-b border-[#252525] px-4 py-3">
        <h2 className="text-xs font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-[10px] text-[#666666]">{description}</p>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function RateBar({
  label,
  detected,
  total,
  rate,
}: {
  label: string;
  detected: number;
  total: number;
  rate: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[#e8e6df]">{label.replaceAll("_", " ")}</p>
        <p className="shrink-0 text-[11px] tabular-nums text-[#929292]">
          {detected}/{total} · {(rate * 100).toFixed(1)}%
        </p>
      </div>
      <div className="h-1 bg-[#1a1a1a]">
        <div className="h-full" style={{ width: `${rate * 100}%`, background: GREEN }} />
      </div>
    </div>
  );
}

function ConfusionCell({
  label,
  value,
  kind,
}: {
  label: string;
  value: number;
  kind: "good" | "bad";
}) {
  return (
    <div className="border border-[#252525] p-4">
      <p className="text-[10px] text-[#666666]">{label}</p>
      <p
        className="mt-2 text-2xl font-semibold tabular-nums"
        style={{ color: kind === "good" ? GREEN : RED }}
      >
        {value}
      </p>
    </div>
  );
}

function FailureList({ items, empty }: { items: Prediction[]; empty: string }) {
  if (items.length === 0) return <p className="text-xs text-[#666666]">{empty}</p>;
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.scenarioId}
          className="flex justify-between gap-3 border-b border-[#252525] pb-2 last:border-0"
        >
          <span className="text-xs">
            {item.scenarioId}
            {item.pattern && (
              <span className="ml-2 text-[#666666]">{item.pattern.replaceAll("_", " ")}</span>
            )}
          </span>
          <span className="text-xs tabular-nums" style={{ color: RED }}>
            Risk {item.riskScore}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function EvaluationPage() {
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const loadReport = useCallback(async () => {
    try {
      setError("");
      const data = await api.get<EvaluationReport>("/api/evaluation");
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load evaluation report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const filteredPredictions = useMemo(() => {
    if (!report) return [];

    return report.predictions.filter((item) => {
      const matchesSearch =
        item.scenarioId.toLowerCase().includes(search.toLowerCase()) ||
        (item.pattern ?? "").toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filter === "ALL" ||
        (filter === "CORRECT" && item.actual === item.predicted) ||
        (filter === "FALSE_POSITIVE" &&
          item.actual === "NORMAL" &&
          item.predicted === "SUSPICIOUS") ||
        (filter === "FALSE_NEGATIVE" &&
          item.actual === "SUSPICIOUS" &&
          item.predicted === "NORMAL");

      return matchesSearch && matchesFilter;
    });
  }, [report, search, filter]);

  if (loading) {
    return (
      <div className="border border-[#252525] p-8 text-xs text-[#929292]">
        Loading evaluation report...
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="border border-[#5a3a35] p-5">
        <p className="text-sm text-[#b07a72]">Evaluation report unavailable</p>
        <p className="mt-2 text-xs text-[#929292]">{error || "No evaluation report was returned."}</p>
        <button
          onClick={() => {
            setLoading(true);
            void loadReport();
          }}
          className="secondary-button mt-4 px-3 py-2 text-xs"
        >
          Retry
        </button>
      </div>
    );
  }

  const m = report.metrics;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="page-kicker">Model evaluation</p>
          <h1 className="page-title">Evaluation</h1>
          <p className="page-description">
            Synthetic held-out test results · not live transaction data
          </p>
        </div>

        <button
          onClick={() => {
            setLoading(true);
            void loadReport();
          }}
          className="secondary-button px-3 py-2 text-xs"
        >
          Refresh report
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-[#252525] py-3 text-[11px] text-[#666666]">
        <span>Dataset <strong className="font-medium text-[#e8e6df]">{report.dataset.total.total.toLocaleString("en-IN")}</strong></span>
        <span>Development <strong className="font-medium text-[#e8e6df]">{report.dataset.development.total}</strong></span>
        <span>Test set <strong className="font-medium text-[#e8e6df]">{report.dataset.test.total}</strong> ({report.dataset.test.normal} normal / {report.dataset.test.suspicious} suspicious)</span>
        <span>Split <strong className="font-medium text-[#e8e6df]">{(report.metadata.splitRatio * 100).toFixed(0)}/{((1 - report.metadata.splitRatio) * 100).toFixed(0)}</strong></span>
        <span>Threshold <strong className="font-medium text-[#e8e6df]">{report.metadata.predictionThreshold}</strong></span>
        <span>Generated <strong className="font-medium text-[#e8e6df]">{formatDate(report.metadata.generatedAt)}</strong></span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Accuracy" value={`${(m.accuracy * 100).toFixed(2)}%`} note="Overall correct" />
        <MetricCard label="Precision" value={`${(m.precision * 100).toFixed(2)}%`} note="Flags that were correct" />
        <MetricCard label="Recall" value={`${(m.recall * 100).toFixed(2)}%`} note="Suspicious cases caught" />
        <MetricCard label="F1-score" value={`${(m.f1Score * 100).toFixed(2)}%`} note="Precision / recall balance" />
        <MetricCard label="False positive rate" value={`${(m.falsePositiveRate * 100).toFixed(2)}%`} note="Normal cases flagged" />
        <MetricCard label="Specificity" value={`${(m.specificity * 100).toFixed(2)}%`} note="Normal cases cleared" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Confusion matrix" description="Actual labels vs engine predictions">
          <div className="grid grid-cols-[90px_1fr_1fr] gap-2">
            <div />
            <p className="pb-1 text-center text-[10px] text-[#666666]">Predicted normal</p>
            <p className="pb-1 text-center text-[10px] text-[#666666]">Predicted suspicious</p>

            <p className="flex items-center text-[10px] text-[#666666]">Actual normal</p>
            <ConfusionCell label="True negative" value={m.trueNegative} kind="good" />
            <ConfusionCell label="False positive" value={m.falsePositive} kind="bad" />

            <p className="flex items-center text-[10px] text-[#666666]">Actual suspicious</p>
            <ConfusionCell label="False negative" value={m.falseNegative} kind="bad" />
            <ConfusionCell label="True positive" value={m.truePositive} kind="good" />
          </div>
        </Panel>

        <Panel title="Risk score distribution" description="Average predicted score by actual class">
          <div className="space-y-5 pt-1">
            {[
              { label: "Normal scenarios", color: "#666666", range: report.scoreDistribution.normal },
              { label: "Suspicious scenarios", color: GOLD, range: report.scoreDistribution.suspicious },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs">
                  <span className="text-[#929292]">{item.label}</span>
                  <strong className="font-medium tabular-nums">{item.range.average.toFixed(2)}</strong>
                </div>
                <div className="mt-2 h-1.5 bg-[#1a1a1a]">
                  <div
                    className="h-full"
                    style={{ width: `${Math.min(item.range.average, 100)}%`, background: item.color }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-[#666666]">
                  Min {item.range.minimum} · Max {item.range.maximum}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Suspicious pattern detection" description="Detection rate across held-out suspicious scenarios">
        <div className="space-y-5">
          {report.patternPerformance.map((item) => (
            <RateBar
              key={item.pattern}
              label={item.pattern}
              detected={item.detected}
              total={item.totalCases}
              rate={item.detectionRate}
            />
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title={`False positives · ${report.falsePositives.length}`} description="Normal scenarios incorrectly flagged">
          <FailureList items={report.falsePositives} empty="No false positives." />
        </Panel>
        <Panel title={`False negatives · ${report.falseNegatives.length}`} description="Suspicious scenarios missed by the engine">
          <FailureList items={report.falseNegatives} empty="No false negatives." />
        </Panel>
      </div>

      <Panel title="Scenario explorer" description={`${filteredPredictions.length} matching scenarios`}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search scenario ID or pattern..."
            className="field min-w-0 flex-1 text-xs"
          />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="field text-xs sm:w-auto"
          >
            <option value="ALL">All scenarios</option>
            <option value="CORRECT">Correct predictions</option>
            <option value="FALSE_POSITIVE">False positives</option>
            <option value="FALSE_NEGATIVE">False negatives</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-[#666666]">
              <tr>
                <th className="py-3 pr-4 font-medium">Scenario</th>
                <th className="py-3 pr-4 font-medium">Pattern</th>
                <th className="py-3 pr-4 font-medium">Actual</th>
                <th className="py-3 pr-4 font-medium">Predicted</th>
                <th className="py-3 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {filteredPredictions.slice(0, 100).map((item) => {
                const correct = item.actual === item.predicted;
                return (
                  <tr key={item.scenarioId} className="border-t border-[#252525]">
                    <td className="py-3 pr-4">{item.scenarioId}</td>
                    <td className="py-3 pr-4 text-[#929292]">{item.pattern?.replaceAll("_", " ") ?? "—"}</td>
                    <td className="py-3 pr-4 text-[#929292]">{item.actual}</td>
                    <td className="py-3 pr-4" style={{ color: correct ? GREEN : RED }}>
                      {item.predicted}
                    </td>
                    <td className="py-3 text-right tabular-nums">{item.riskScore}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredPredictions.length > 100 && (
          <p className="mt-3 text-[10px] text-[#666666]">Showing the first 100 matching scenarios.</p>
        )}
      </Panel>

      <div className="border border-[#252525] px-4 py-3">
        <p className="text-[10px] text-[#666666]">
          Evaluation type: {report.metadata.evaluationType} · Report version: {report.reportVersion}
        </p>
        <p className="mt-1 break-all text-[10px] text-[#666666]">
          Dataset SHA-256: {report.metadata.datasetHash}
        </p>
        <p className="mt-2 text-[10px] text-[#666666]">
          Results come from synthetic held-out test scenarios. They do not represent
          validated real-world fraud detection performance.
        </p>
      </div>
    </div>
  );
}
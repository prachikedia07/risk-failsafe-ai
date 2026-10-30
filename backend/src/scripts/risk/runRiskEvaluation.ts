
import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import {
    buildMerchantBaseline,
} from "../../modules/risk/risk.baseline";

import {
    analyzeTransactionRisk,
} from "../../modules/risk/risk.engine";

import {
    extractTransactionFeatures,
} from "../../modules/risk/risk.features";

import {
    RiskScenario,
    TransactionFeatures,
} from "../../modules/risk/risk.types";

type Label = "NORMAL" | "SUSPICIOUS";

interface EvaluationResult {
    scenarioId: string;
    actual: Label;
    predicted: Label;
    riskScore: number;
    pattern?: string;
    features: TransactionFeatures;
}

const SPLIT_SEED_NORMAL = 12345;
const SPLIT_SEED_SUSPICIOUS = 67890;
const TRAIN_RATIO = 0.8;

const PATTERNS = [
    "VELOCITY_SPIKE",
    "AMOUNT_SPIKE",
    "FAILURE_SPIKE",
    "NEW_CUSTOMER_SPIKE",
    "COMBINED_SPIKE",
    "SUBTLE_COMBINED",
] as const;

// Reproducible Fisher-Yates shuffle.
const seededShuffle = <T>(
    items: T[],
    seed: number
): T[] => {
    const result = [...items];
    let currentSeed = seed;

    const random = (): number => {
        currentSeed =
            (currentSeed * 1664525 +
                1013904223) %
            4294967296;

        return currentSeed / 4294967296;
    };

    for (
        let i = result.length - 1;
        i > 0;
        i--
    ) {
        const j = Math.floor(
            random() * (i + 1)
        );

        [result[i], result[j]] = [
            result[j],
            result[i],
        ];
    }

    return result;
};

// Stratified 80/20 split.
// Normal and suspicious scenarios are shuffled separately.
const splitDataset = (
    scenarios: RiskScenario[]
) => {
    const normalScenarios =
        scenarios.filter(
            (scenario) =>
                scenario.label === "NORMAL"
        );

    const suspiciousScenarios =
        scenarios.filter(
            (scenario) =>
                scenario.label === "SUSPICIOUS"
        );

    const shuffledNormal = seededShuffle(
        normalScenarios,
        SPLIT_SEED_NORMAL
    );

    const shuffledSuspicious = seededShuffle(
        suspiciousScenarios,
        SPLIT_SEED_SUSPICIOUS
    );

    const normalSplitIndex = Math.floor(
        shuffledNormal.length * TRAIN_RATIO
    );

    const suspiciousSplitIndex = Math.floor(
        shuffledSuspicious.length * TRAIN_RATIO
    );

    const train = [
        ...shuffledNormal.slice(
            0,
            normalSplitIndex
        ),
        ...shuffledSuspicious.slice(
            0,
            suspiciousSplitIndex
        ),
    ];

    const test = [
        ...shuffledNormal.slice(
            normalSplitIndex
        ),
        ...shuffledSuspicious.slice(
            suspiciousSplitIndex
        ),
    ];

    return {
        train,
        test,
        normalTrain: shuffledNormal.slice(
            0,
            normalSplitIndex
        ),
        normalTest: shuffledNormal.slice(
            normalSplitIndex
        ),
        suspiciousTrain:
            shuffledSuspicious.slice(
                0,
                suspiciousSplitIndex
            ),
        suspiciousTest:
            shuffledSuspicious.slice(
                suspiciousSplitIndex
            ),
    };
};

// Run the risk engine against each scenario.
const evaluate = (
    testScenarios: RiskScenario[],
    baseline: ReturnType<
        typeof buildMerchantBaseline
    >
): EvaluationResult[] => {
    return testScenarios.map(
        (scenario) => {
            const features =
                extractTransactionFeatures(
                    scenario
                );

            const analysis =
                analyzeTransactionRisk(
                    features,
                    baseline
                );

            return {
                scenarioId: scenario.scenarioId,
                actual: scenario.label,
                predicted: analysis.prediction,
                riskScore: analysis.riskScore,
                pattern: scenario.pattern,
                features,
            };
        }
    );
};

// Calculate classification metrics.
const calculateMetrics = (
    results: EvaluationResult[]
) => {
    let truePositive = 0;
    let falsePositive = 0;
    let trueNegative = 0;
    let falseNegative = 0;

    for (const result of results) {
        if (
            result.actual === "SUSPICIOUS" &&
            result.predicted === "SUSPICIOUS"
        ) {
            truePositive++;
        } else if (
            result.actual === "NORMAL" &&
            result.predicted === "SUSPICIOUS"
        ) {
            falsePositive++;
        } else if (
            result.actual === "NORMAL" &&
            result.predicted === "NORMAL"
        ) {
            trueNegative++;
        } else if (
            result.actual === "SUSPICIOUS" &&
            result.predicted === "NORMAL"
        ) {
            falseNegative++;
        }
    }

    const total = results.length;

    const accuracy =
        total > 0
            ? (truePositive + trueNegative) / total
            : 0;

    const precision =
        truePositive + falsePositive > 0
            ? truePositive /
              (truePositive + falsePositive)
            : 0;

    const recall =
        truePositive + falseNegative > 0
            ? truePositive /
              (truePositive + falseNegative)
            : 0;

    const f1Score =
        precision + recall > 0
            ? (2 * precision * recall) /
              (precision + recall)
            : 0;

    const falsePositiveRate =
        trueNegative + falsePositive > 0
            ? falsePositive /
              (trueNegative + falsePositive)
            : 0;

    const specificity =
        trueNegative + falsePositive > 0
            ? trueNegative /
              (trueNegative + falsePositive)
            : 0;

    return {
        total,
        truePositive,
        falsePositive,
        trueNegative,
        falseNegative,
        accuracy,
        precision,
        recall,
        f1Score,
        falsePositiveRate,
        specificity,
    };
};

// Evaluate each suspicious pattern separately.
const calculatePatternMetrics = (
    results: EvaluationResult[]
) => {
    return PATTERNS.map((pattern) => {
        const patternResults =
            results.filter(
                (result) =>
                    result.actual === "SUSPICIOUS" &&
                    result.pattern === pattern
            );

        const detected =
            patternResults.filter(
                (result) =>
                    result.predicted === "SUSPICIOUS"
            ).length;

        const missed =
            patternResults.length - detected;

        const averageRiskScore =
            patternResults.length > 0
                ? patternResults.reduce(
                      (sum, result) =>
                          sum + result.riskScore,
                      0
                  ) / patternResults.length
                : 0;

        return {
            pattern,
            totalCases: patternResults.length,
            detected,
            missed,
            detectionRate:
                patternResults.length > 0
                    ? detected / patternResults.length
                    : 0,
            averageRiskScore,
        };
    });
};

const countLabels = (
    scenarios: RiskScenario[]
) => ({
    normal: scenarios.filter(
        (scenario) =>
            scenario.label === "NORMAL"
    ).length,

    suspicious: scenarios.filter(
        (scenario) =>
            scenario.label === "SUSPICIOUS"
    ).length,

    total: scenarios.length,
});

const average = (
    values: number[]
): number => {
    if (values.length === 0) {
        return 0;
    }

    return (
        values.reduce(
            (sum, value) => sum + value,
            0
        ) / values.length
    );
};

const main = async (): Promise<void> => {
    console.log(
        "\n=== RiskFailsafe Evaluation Started ===\n"
    );

    // 1. Load the existing synthetic dataset.
    const inputPath = path.resolve(
        process.cwd(),
        "data",
        "synthetic-transactions.json"
    );

    const file = await readFile(
        inputPath,
        "utf-8"
    );

    const scenarios =
        JSON.parse(file) as RiskScenario[];

    if (scenarios.length === 0) {
        throw new Error(
            "Synthetic dataset is empty."
        );
    }

    // 2. Calculate a fingerprint of the exact dataset.
    const datasetHash = createHash("sha256")
        .update(file)
        .digest("hex");

    // 3. Split into development and held-out test data.
    const {
        train,
        test,
        normalTrain,
        normalTest,
        suspiciousTrain,
        suspiciousTest,
    } = splitDataset(scenarios);

    if (normalTrain.length === 0) {
        throw new Error(
            "No normal development scenarios available for baseline."
        );
    }

    if (test.length === 0) {
        throw new Error(
            "No held-out test scenarios available."
        );
    }

    // 4. Build the baseline ONLY from normal development data.
    const baseline =
        buildMerchantBaseline(normalTrain);

    // 5. Evaluate held-out scenarios.
    const results = evaluate(
        test,
        baseline
    );

    // 6. Calculate all metrics.
    const metrics = calculateMetrics(results);

    const patternMetrics =
        calculatePatternMetrics(results);

    const normalResults =
        results.filter(
            (result) =>
                result.actual === "NORMAL"
        );

    const suspiciousResults =
        results.filter(
            (result) =>
                result.actual === "SUSPICIOUS"
        );

    const normalScores =
        normalResults.map(
            (result) => result.riskScore
        );

    const suspiciousScores =
        suspiciousResults.map(
            (result) => result.riskScore
        );

    // 7. Prepare the complete evaluation report.
    const generatedAt = new Date().toISOString();

    const report = {
        reportVersion: "1.0.0",

        metadata: {
            generatedAt,
            datasetFile: "synthetic-transactions.json",
            datasetHash,
            evaluationType: "OFFLINE_HELD_OUT",
            splitRatio: TRAIN_RATIO,
            normalSplitSeed: SPLIT_SEED_NORMAL,
            suspiciousSplitSeed: SPLIT_SEED_SUSPICIOUS,
            baselineSource:
                "NORMAL development scenarios only",
            predictionThreshold: 50,
        },

        dataset: {
            total: countLabels(scenarios),
            development: countLabels(train),
            test: countLabels(test),
            developmentNormal: normalTrain.length,
            developmentSuspicious:
                suspiciousTrain.length,
            testNormal: normalTest.length,
            testSuspicious:
                suspiciousTest.length,
        },

        metrics,

        patternPerformance: patternMetrics,

        scoreDistribution: {
            normal: {
                average: average(normalScores),
                minimum:
                    normalScores.length > 0
                        ? Math.min(...normalScores)
                        : 0,
                maximum:
                    normalScores.length > 0
                        ? Math.max(...normalScores)
                        : 0,
            },

            suspicious: {
                average: average(suspiciousScores),
                minimum:
                    suspiciousScores.length > 0
                        ? Math.min(...suspiciousScores)
                        : 0,
                maximum:
                    suspiciousScores.length > 0
                        ? Math.max(...suspiciousScores)
                        : 0,
            },
        },

        falseNegatives: results.filter(
            (result) =>
                result.actual === "SUSPICIOUS" &&
                result.predicted === "NORMAL"
        ),

        falsePositives: results.filter(
            (result) =>
                result.actual === "NORMAL" &&
                result.predicted === "SUSPICIOUS"
        ),

        predictions: results,
    };

    // 8. Save both a timestamped report and a latest report.
    const outputDirectory = path.resolve(
        process.cwd(),
        "data",
        "evaluation-results"
    );

    await mkdir(
        outputDirectory,
        { recursive: true }
    );

    const timestamp = generatedAt.replace(
        /[:.]/g,
        "-"
    );

    const timestampedPath = path.join(
        outputDirectory,
        `risk-evaluation-${timestamp}.json`
    );

    const latestPath = path.join(
        outputDirectory,
        "latest-risk-evaluation.json"
    );

    const reportJson = JSON.stringify(
        report,
        null,
        2
    );

    await writeFile(
        timestampedPath,
        reportJson,
        "utf-8"
    );

    await writeFile(
        latestPath,
        reportJson,
        "utf-8"
    );

    // 9. Print a readable terminal summary.
    console.log("=== Dataset Summary ===");
    console.log(`Total scenarios: ${scenarios.length}`);
    console.log(`Development scenarios: ${train.length}`);
    console.log(`Held-out test scenarios: ${test.length}`);
    console.log(`Test NORMAL: ${normalTest.length}`);
    console.log(`Test SUSPICIOUS: ${suspiciousTest.length}`);

    console.log("\n=== Confusion Matrix ===");
    console.log(`True Positives:  ${metrics.truePositive}`);
    console.log(`False Positives: ${metrics.falsePositive}`);
    console.log(`True Negatives:  ${metrics.trueNegative}`);
    console.log(`False Negatives: ${metrics.falseNegative}`);

    console.log("\n=== Evaluation Metrics ===");
    console.log(`Accuracy:           ${(metrics.accuracy * 100).toFixed(2)}%`);
    console.log(`Precision:          ${(metrics.precision * 100).toFixed(2)}%`);
    console.log(`Recall:             ${(metrics.recall * 100).toFixed(2)}%`);
    console.log(`F1-score:           ${(metrics.f1Score * 100).toFixed(2)}%`);
    console.log(`False Positive Rate: ${(metrics.falsePositiveRate * 100).toFixed(2)}%`);
    console.log(`Specificity:        ${(metrics.specificity * 100).toFixed(2)}%`);

    console.log("\n=== Pattern Performance ===");

    for (const pattern of patternMetrics) {
        console.log(
            `${pattern.pattern.padEnd(22)} | ` +
            `cases=${pattern.totalCases} | ` +
            `detected=${pattern.detected} | ` +
            `missed=${pattern.missed} | ` +
            `detection=${(pattern.detectionRate * 100).toFixed(2)}%`
        );
    }

    console.log("\n=== Risk Score Distribution ===");
    console.log(
        `NORMAL average: ${average(normalScores).toFixed(2)}`
    );
    console.log(
        `SUSPICIOUS average: ${average(suspiciousScores).toFixed(2)}`
    );

    console.log("\n=== Reports Saved ===");
    console.log(timestampedPath);
    console.log(latestPath);

    console.log(
        "\n=== RiskFailsafe Evaluation Completed ===\n"
    );
};

main().catch((error) => {
    console.error(
        "Risk evaluation failed:",
        error
    );

    process.exit(1);
});

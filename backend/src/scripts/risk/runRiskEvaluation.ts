import { readFile } from "fs/promises";
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

interface EvaluationResult {
    scenarioId: string;
    actual: "NORMAL" | "SUSPICIOUS";
    predicted: "NORMAL" | "SUSPICIOUS";
    riskScore: number;
    pattern?: string;
    features: TransactionFeatures;
}

const seededShuffle = <T>(
    items: T[],
    seed: number
): T[] => {
    const result = [...items];

    let currentSeed = seed;

    const random = () => {
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

const splitDataset = (
    scenarios: RiskScenario[]
) => {
    const normalScenarios = scenarios.filter(
        (scenario) =>
            scenario.label === "NORMAL"
    );

    const suspiciousScenarios =
        scenarios.filter(
            (scenario) =>
                scenario.label === "SUSPICIOUS"
        );

    const shuffledNormal =
    seededShuffle(
        normalScenarios,
        12345
    );

const shuffledSuspicious =
    seededShuffle(
        suspiciousScenarios,
        67890
    );

    const normalSplitIndex =
        Math.floor(
            shuffledNormal.length * 0.8
        );

    const suspiciousSplitIndex =
        Math.floor(
            shuffledSuspicious.length * 0.8
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
    };
};

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
        }

        if (
            result.actual === "NORMAL" &&
            result.predicted === "SUSPICIOUS"
        ) {
            falsePositive++;
        }

        if (
            result.actual === "NORMAL" &&
            result.predicted === "NORMAL"
        ) {
            trueNegative++;
        }

        if (
            result.actual === "SUSPICIOUS" &&
            result.predicted === "NORMAL"
        ) {
            falseNegative++;
        }
    }

    const precision =
        truePositive + falsePositive === 0
            ? 0
            : truePositive /
              (truePositive + falsePositive);

    const recall =
        truePositive + falseNegative === 0
            ? 0
            : truePositive /
              (truePositive + falseNegative);

    const falsePositiveRate =
        trueNegative + falsePositive === 0
            ? 0
            : falsePositive /
              (trueNegative + falsePositive);

    return {
        truePositive,
        falsePositive,
        trueNegative,
        falseNegative,
        precision,
        recall,
        falsePositiveRate,
    };
};

const main = async (): Promise<void> => {
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

    const {
        train,
        test,
    } = splitDataset(scenarios);

    /*
     * VERY IMPORTANT:
     * The baseline is built ONLY from
     * NORMAL development scenarios.
     */
    const trainingNormalScenarios =
        train.filter(
            (scenario) =>
                scenario.label === "NORMAL"
        );

    const baseline =
        buildMerchantBaseline(
            trainingNormalScenarios
        );

    const results =
        evaluate(
            test,
            baseline
        );

    const metrics =
        calculateMetrics(results);

        const suspiciousResults = results.filter(
    (result) =>
        result.actual === "SUSPICIOUS"
);

const patterns = [
    "VELOCITY_SPIKE",
    "AMOUNT_SPIKE",
    "FAILURE_SPIKE",
    "NEW_CUSTOMER_SPIKE",
    "COMBINED_SPIKE",
    "SUBTLE_COMBINED",
] as const;

console.log("\nPattern Performance:\n");

for (const pattern of patterns) {
    const patternResults =
        suspiciousResults.filter(
            (result) =>
                result.pattern === pattern
        );

    if (patternResults.length === 0) {
        continue;
    }

    const caught =
        patternResults.filter(
            (result) =>
                result.predicted ===
                "SUSPICIOUS"
        ).length;

    const missed =
        patternResults.filter(
            (result) =>
                result.predicted ===
                "NORMAL"
        ).length;

    const averageScore =
        patternResults.reduce(
            (sum, result) =>
                sum + result.riskScore,
            0
        ) / patternResults.length;

    console.log(
        `${pattern.padEnd(22)} | cases=${patternResults.length} | caught=${caught} | missed=${missed} | avgScore=${averageScore.toFixed(1)}`
    );
}

        const falseNegatives = results.filter(
    (result) =>
        result.actual === "SUSPICIOUS" &&
        result.predicted === "NORMAL"
);

console.log("\nFalse Negatives:\n");

falseNegatives.forEach((result) => {
    console.log(
        `Scenario: ${result.scenarioId}`
    );

    console.log(
        `Pattern: ${result.pattern}`
    );

    console.log(
        `Risk Score: ${result.riskScore}`
    );

    console.log(
        `Features: ${JSON.stringify(
            result.features,
            null,
            2
        )}`
    );

    console.log(
        "-----------------------------------"
    );
});

console.log("\nRisk Score Distribution:\n");

const suspiciousScores =
    suspiciousResults.map(
        (result) =>
            result.riskScore
    );

const normalResults =
    results.filter(
        (result) =>
            result.actual === "NORMAL"
    );

const normalScores =
    normalResults.map(
        (result) =>
            result.riskScore
    );

const average = (
    values: number[]
): number => {
    if (values.length === 0) {
        return 0;
    }

    return (
        values.reduce(
            (sum, value) =>
                sum + value,
            0
        ) / values.length
    );
};

console.log(
    `NORMAL average score: ${average(
        normalScores
    ).toFixed(2)}`
);

console.log(
    `SUSPICIOUS average score: ${average(
        suspiciousScores
    ).toFixed(2)}`
);

console.log(
    `NORMAL max score: ${Math.max(
        ...normalScores
    )}`
);

console.log(
    `SUSPICIOUS min score: ${Math.min(
        ...suspiciousScores
    )}`
);

    console.log("\n=== RiskFailsafe Evaluation ===\n");

    console.log(
        `Training scenarios: ${train.length}`
    );

    console.log(
        `Held-out test scenarios: ${test.length}`
    );

    console.log(
        `Training NORMAL scenarios: ${trainingNormalScenarios.length}`
    );

    console.log("\nConfusion Matrix:\n");

    console.log(
        `True Positives:  ${metrics.truePositive}`
    );

    console.log(
        `False Positives: ${metrics.falsePositive}`
    );

    console.log(
        `True Negatives:  ${metrics.trueNegative}`
    );

    console.log(
        `False Negatives: ${metrics.falseNegative}`
    );

    console.log("\nMetrics:\n");

    console.log(
        `Precision: ${(metrics.precision * 100).toFixed(2)}%`
    );

    console.log(
        `Recall: ${(metrics.recall * 100).toFixed(2)}%`
    );

    console.log(
        `False Positive Rate: ${(metrics.falsePositiveRate * 100).toFixed(2)}%`
    );

    console.log("\nSample predictions:\n");

    results.slice(0, 10).forEach(
        (result) => {
            console.log(
                `${result.scenarioId} | actual=${result.actual} | predicted=${result.predicted} | score=${result.riskScore}`
            );
        }
    );
};

main().catch((error) => {
    console.error(
        "Risk evaluation failed:",
        error
    );

    process.exit(1);
});
import {
    MerchantBaseline,
} from "./risk.baseline";

import {
    TransactionFeatures,
} from "./risk.types";

export type RiskLevel =
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "CRITICAL";

export type RiskPrediction =
    | "NORMAL"
    | "SUSPICIOUS";

interface FeatureRisk {
    feature: string;
    currentValue: number;
    baselineMean: number;
    baselineStandardDeviation: number;
    zScore: number;
    contribution: number;
}

export interface RiskAnalysis {
    riskScore: number;
    riskLevel: RiskLevel;
    prediction: RiskPrediction;
    features: FeatureRisk[];
    reasons: string[];
}

const calculateZScore = (
    currentValue: number,
    mean: number,
    standardDeviation: number
): number => {
    if (standardDeviation === 0) {
        return currentValue <= mean ? 0 : 3;
    }

    return (
        (currentValue - mean) /
        standardDeviation
    );
};

const convertZScoreToRisk = (
    zScore: number
): number => {
    if (zScore <= 0) {
        return 0;
    }
/*
     * 0   → no anomaly
     * 1   → mild
     * 2   → noticeable
     * 3+  → very abnormal
     */
    return Math.min(zScore / 3, 1);
};

const calculateRiskLevel = (
    score: number
): RiskLevel => {
    if (score < 25) {
        return "LOW";
    }

    if (score < 50) {
        return "MEDIUM";
    }

    if (score < 75) {
        return "HIGH";
    }

    return "CRITICAL";
};

const buildReason = (
    featureName: string,
    zScore: number
): string => {
    const absoluteZScore =
        Math.abs(zScore);

    if (featureName === "velocity") {
        return `Transaction velocity is ${absoluteZScore.toFixed(
            1
        )} standard deviations from the merchant baseline.`;
    }

    if (featureName === "averageAmount") {
        return `Average transaction amount is ${absoluteZScore.toFixed(
            1
        )} standard deviations from the merchant baseline.`;
    }

    if (featureName === "failureRate") {
        return `Payment failure rate is ${absoluteZScore.toFixed(
            1
        )} standard deviations from the merchant baseline.`;
    }

    return `New-customer transaction ratio is ${absoluteZScore.toFixed(
        1
    )} standard deviations from the merchant baseline.`;
};

export const analyzeTransactionRisk = (
    features: TransactionFeatures,
    baseline: MerchantBaseline
): RiskAnalysis => {
    const velocityZScore =
        calculateZScore(
            features.transactionsPerMinute,
            baseline.transactionsPerMinute.mean,
            baseline.transactionsPerMinute
                .standardDeviation
        );

    const amountZScore =
        calculateZScore(
            features.averageAmount,
            baseline.averageAmount.mean,
            baseline.averageAmount
                .standardDeviation
        );

    const failureZScore =
        calculateZScore(
            features.failureRate,
            baseline.failureRate.mean,
            baseline.failureRate
                .standardDeviation
        );

    const newCustomerZScore =
        calculateZScore(
            features.newCustomerRatio,
            baseline.newCustomerRatio.mean,
            baseline.newCustomerRatio
                .standardDeviation
        );

    const velocityRisk =
        convertZScoreToRisk(
            velocityZScore
        );

    const amountRisk =
        convertZScoreToRisk(
            amountZScore
        );

    const failureRisk =
        convertZScoreToRisk(
            failureZScore
        );

    const newCustomerRisk =
        convertZScoreToRisk(
            newCustomerZScore
        );

    const weightedRisk =
        velocityRisk * 0.30 +
        amountRisk * 0.25 +
        failureRisk * 0.25 +
        newCustomerRisk * 0.20;


const riskScore = Math.round(
    weightedRisk * 100
);

const featureResults: FeatureRisk[] = [
    {
        feature: "velocity",
        currentValue:
            features.transactionsPerMinute,
        baselineMean:
            baseline.transactionsPerMinute
                .mean,
        baselineStandardDeviation:
            baseline.transactionsPerMinute
                .standardDeviation,
        zScore: velocityZScore,
        contribution:
            velocityRisk * 0.30,
    },

    {
        feature: "averageAmount",
        currentValue:
            features.averageAmount,
        baselineMean:
            baseline.averageAmount
                .mean,
        baselineStandardDeviation:
            baseline.averageAmount
                .standardDeviation,
        zScore: amountZScore,
        contribution:
            amountRisk * 0.25,
    },

    {
        feature: "failureRate",
        currentValue:
            features.failureRate,
        baselineMean:
            baseline.failureRate.mean,
        baselineStandardDeviation:
            baseline.failureRate
                .standardDeviation,
        zScore: failureZScore,
        contribution:
            failureRisk * 0.25,
    },

    {
        feature: "newCustomerRatio",
        currentValue:
            features.newCustomerRatio,
        baselineMean:
            baseline.newCustomerRatio
                .mean,
        baselineStandardDeviation:
            baseline.newCustomerRatio
                .standardDeviation,
        zScore: newCustomerZScore,
        contribution:
            newCustomerRisk * 0.20,
    },
];

const hasExtremeAnomaly =
    featureResults.some(
        (feature) =>
            feature.zScore >= 3
    );

const adjustedRiskScore =
    hasExtremeAnomaly
        ? Math.max(
              riskScore,
              60
          )
        : riskScore;

const riskLevel =
    calculateRiskLevel(
        adjustedRiskScore
    );

const prediction: RiskPrediction =
    adjustedRiskScore >= 50
        ? "SUSPICIOUS"
        : "NORMAL";

    const reasons =
        featureResults
            .filter(
                (feature) =>
                    Math.abs(
                        feature.zScore
                    ) >= 2
            )
            .sort(
                (a, b) =>
                    Math.abs(b.zScore) -
                    Math.abs(a.zScore)
            )
            .slice(0, 3)
            .map((feature) =>
                buildReason(
                    feature.feature,
                    feature.zScore
                )
            );

    return {
        riskScore: adjustedRiskScore,
        riskLevel,
        prediction,
        features: featureResults,
        reasons,
    };
};
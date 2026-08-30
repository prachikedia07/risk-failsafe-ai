import {
    RiskScenario,
    TransactionFeatures,
} from "./risk.types";

import {
    extractTransactionFeatures,
} from "./risk.features";

interface FeatureStatistics {
    mean: number;
    standardDeviation: number;
}

export interface MerchantBaseline {
    transactionCount: FeatureStatistics;
    averageAmount: FeatureStatistics;
    transactionsPerMinute: FeatureStatistics;
    failureRate: FeatureStatistics;
    newCustomerRatio: FeatureStatistics;
}

const calculateMean = (
    values: number[]
): number => {
    if (values.length === 0) {
        return 0;
    }

    const total = values.reduce(
        (sum, value) => sum + value,
        0
    );

    return total / values.length;
};

const calculateStandardDeviation = (
    values: number[],
    mean: number
): number => {
    if (values.length <= 1) {
        return 0;
    }

    const squaredDifferences =
        values.map(
            (value) =>
                Math.pow(
                    value - mean,
                    2
                )
        );

    const variance =
        squaredDifferences.reduce(
            (sum, value) =>
                sum + value,
            0
        ) / values.length;

    return Math.sqrt(variance);
};

const calculateStatistics = (
    values: number[]
): FeatureStatistics => {
    const mean =
        calculateMean(values);

    return {
        mean,
        standardDeviation:
            calculateStandardDeviation(
                values,
                mean
            ),
    };
};

export const buildMerchantBaseline = (
    scenarios: RiskScenario[]
): MerchantBaseline => {
    const normalScenarios =
        scenarios.filter(
            (scenario) =>
                scenario.label === "NORMAL"
        );

    if (normalScenarios.length === 0) {
        throw new Error(
            "Cannot build baseline without normal scenarios"
        );
    }

    const extractedFeatures: TransactionFeatures[] =
        normalScenarios.map(
            extractTransactionFeatures
        );

    return {
        transactionCount:
            calculateStatistics(
                extractedFeatures.map(
                    (feature) =>
                        feature.transactionCount
                )
            ),

        averageAmount:
            calculateStatistics(
                extractedFeatures.map(
                    (feature) =>
                        feature.averageAmount
                )
            ),

        transactionsPerMinute:
            calculateStatistics(
                extractedFeatures.map(
                    (feature) =>
                        feature.transactionsPerMinute
                )
            ),

        failureRate:
            calculateStatistics(
                extractedFeatures.map(
                    (feature) =>
                        feature.failureRate
                )
            ),

        newCustomerRatio:
            calculateStatistics(
                extractedFeatures.map(
                    (feature) =>
                        feature.newCustomerRatio
                )
            ),
    };
};
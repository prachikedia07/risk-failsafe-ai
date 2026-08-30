import {
    buildMerchantBaseline,
} from "./risk.baseline";

import {
    extractTransactionFeatures,
} from "./risk.features";

import {
    analyzeTransactionRisk,
} from "./risk.engine";

import {
    RiskScenario,
} from "./risk.types";

export const analyzeScenarioRisk = (
    scenario: RiskScenario,
    baselineScenarios: RiskScenario[]
) => {
    const features =
        extractTransactionFeatures(
            scenario
        );

    const baseline =
        buildMerchantBaseline(
            baselineScenarios
        );

    return analyzeTransactionRisk(
        features,
        baseline
    );
};
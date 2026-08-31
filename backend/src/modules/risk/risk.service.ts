import prisma from "../../lib/prisma";
import { Prisma } from "../../generated/prisma/client";

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

export const analyzeAndStoreRisk = async (
    scenario: RiskScenario,
    baselineScenarios: RiskScenario[]
) => {
    const features =
        extractTransactionFeatures(scenario);

    const baseline =
        buildMerchantBaseline(
            baselineScenarios
        );

    const analysis =
        analyzeTransactionRisk(
            features,
            baseline
        );

  const featuresJson =
    analysis.features as unknown as Prisma.InputJsonValue;

const reasonsJson =
    analysis.reasons as unknown as Prisma.InputJsonValue;

    const savedAnalysis =
        await prisma.riskAnalysis.create({
            data: {
                merchantId:
                    scenario.merchantId,

                riskScore:
                    analysis.riskScore,

                riskLevel:
                    analysis.riskLevel,

                prediction:
                    analysis.prediction,

                features:
                    featuresJson,

                reasons:
                    reasonsJson,
            },
        });

    return {
        savedAnalysis,
        analysis,
    };
};
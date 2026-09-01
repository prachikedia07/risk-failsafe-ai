import { readFile } from "fs/promises";
import path from "path";

import prisma from "../../lib/prisma";

import {
    analyzeAndStoreRisk,
} from "./risk.service";

import {
    RiskScenario,
    RiskTransaction,
} from "./risk.types";

const LIVE_WINDOW_MINUTES = 5;

export const analyzeLiveMerchantRisk = async (
    merchantId: string
) => {
    const now = new Date();

    const windowStart = new Date(
        now.getTime() -
            LIVE_WINDOW_MINUTES * 60 * 1000
    );

    /*
     * Get recent real transactions from Neon.
     * We also fetch customer.createdAt because
     * the existing feature extractor needs it.
     */
    const transactions =
        await prisma.transaction.findMany({
            where: {
                merchantId,

                timestamp: {
                    gte: windowStart,
                    lte: now,
                },
            },

            orderBy: {
                timestamp: "asc",
            },

            take: 100,

            include: {
                customer: {
                    select: {
                        createdAt: true,
                    },
                },
            },
        });

    if (transactions.length === 0) {
        return null;
    }

    /*
     * Convert DB transactions into the
     * RiskTransaction shape expected by
     * our existing risk engine.
     */
    const riskTransactions: RiskTransaction[] =
        transactions.map(
            (transaction) => ({
                amount: transaction.amount,

                status:
                    transaction.status ===
                    "FAILED"
                        ? "FAILED"
                        : "SUCCESS",

                timestamp:
                    transaction.timestamp.toISOString(),

                customerCreatedAt:
                    transaction.customer.createdAt.toISOString(),
            })
        );

    const scenario: RiskScenario = {
        scenarioId:
            `live-${merchantId}-${Date.now()}`,

        merchantId,

        /*
         * This label is not used to make the
         * actual live prediction.
         * The engine calculates prediction itself.
         */
        label: "NORMAL",

        windowStart:
            windowStart.toISOString(),

        windowEnd:
            now.toISOString(),

        transactions:
            riskTransactions,
    };

    /*
     * For the current buildathon version,
     * use our synthetic NORMAL scenarios to
     * represent established normal behaviour.
     */
    const baselinePath = path.resolve(
        process.cwd(),
        "data",
        "synthetic-transactions.json"
    );

    const file = await readFile(
        baselinePath,
        "utf-8"
    );

    const allScenarios =
        JSON.parse(file) as RiskScenario[];

    const normalBaseline =
        allScenarios.filter(
            (scenario) =>
                scenario.label === "NORMAL"
        );

    if (normalBaseline.length === 0) {
        throw new Error(
            "No normal baseline scenarios found"
        );
    }

    return analyzeAndStoreRisk(
        scenario,
        normalBaseline
    );
};
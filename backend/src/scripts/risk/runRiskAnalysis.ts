import "dotenv/config";

import { readFile } from "fs/promises";
import path from "path";

import prisma from "../../lib/prisma";

import {
    analyzeAndStoreRisk,
} from "../../modules/risk/risk.service";

import {
    RiskScenario,
} from "../../modules/risk/risk.types";

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

    const normalScenarios =
        scenarios.filter(
            (scenario) =>
                scenario.label === "NORMAL"
        );

    const suspiciousScenario =
        scenarios.find(
            (scenario) =>
                scenario.label ===
                "SUSPICIOUS"
        );

    if (!suspiciousScenario) {
        throw new Error(
            "No suspicious scenario found"
        );
    }

    // Get a real merchant from our Neon database.
    const merchant =
        await prisma.merchant.findFirst({
            select: {
                id: true,
            },
        });

    if (!merchant) {
        throw new Error(
            "No merchant exists in the database. Create a merchant first."
        );
    }

    /*
     * The synthetic dataset has its own synthetic merchant ID.
     * For persistence, use an actual Merchant foreign key.
     */
    const scenarioForAnalysis: RiskScenario = {
        ...suspiciousScenario,
        merchantId: merchant.id,
    };

    const result =
        await analyzeAndStoreRisk(
            scenarioForAnalysis,
            normalScenarios
        );

    console.log(
        "\n=== Stored Risk Analysis ===\n"
    );

    console.log(
        JSON.stringify(
            result.savedAnalysis,
            null,
            2
        )
    );
};

main().catch((error) => {
    console.error(
        "Failed to run risk analysis:",
        error
    );

    process.exit(1);
});
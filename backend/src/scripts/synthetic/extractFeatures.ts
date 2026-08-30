import { readFile, writeFile } from "fs/promises";
import path from "path";

import {
    RiskScenario,
    TransactionFeatures,
} from "../../modules/risk/risk.types";

import { extractTransactionFeatures } from "../../modules/risk/risk.features";

interface ScenarioFeatures {
    scenarioId: string;
    label: "NORMAL" | "SUSPICIOUS";
    features: TransactionFeatures;
}

const main = async (): Promise<void> => {
    const inputPath = path.resolve(
        process.cwd(),
        "data",
        "synthetic-transactions.json"
    );

    const outputPath = path.resolve(
        process.cwd(),
        "data",
        "synthetic-features.json"
    );

    const file = await readFile(
        inputPath,
        "utf-8"
    );

    const scenarios =
        JSON.parse(file) as RiskScenario[];

    const featureDataset: ScenarioFeatures[] =
        scenarios.map((scenario) => {
            return {
                scenarioId: scenario.scenarioId,
                label: scenario.label,
                features:
                    extractTransactionFeatures(
                        scenario
                    ),
            };
        });

    await writeFile(
        outputPath,
        JSON.stringify(
            featureDataset,
            null,
            2
        ),
        "utf-8"
    );

    console.log(
        `Extracted features for ${featureDataset.length} scenarios.`
    );

    console.log(
        `Saved features to: ${outputPath}`
    );
};

main().catch((error) => {
    console.error(
        "Failed to extract features:",
        error
    );

    process.exit(1);
});
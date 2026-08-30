import { createHash } from "crypto";
import { writeFile } from "fs/promises";
import path from "path";

type ScenarioLabel = "NORMAL" | "SUSPICIOUS";

type TransactionStatus = "SUCCESS" | "FAILED";

type PaymentMethod =
    | "UPI"
    | "CARD"
    | "NETBANKING"
    | "WALLET";

interface SyntheticCustomer {
    id: string;
    createdAt: Date;
}

interface SyntheticTransaction {
    id: string;
    merchantId: string;
    customerId: string;
    amount: number; // stored in paise
    currency: "INR";
    status: TransactionStatus;
    paymentMethod: PaymentMethod;
    failureReason?: string;
    timestamp: string;
    customerCreatedAt: string;
}

interface SyntheticScenario {
    scenarioId: string;
    label: ScenarioLabel;
    windowStart: string;
    windowEnd: string;
    transactions: SyntheticTransaction[];
    pattern?: SuspiciousPattern;
}

type SuspiciousPattern =
    | "VELOCITY_SPIKE"
    | "AMOUNT_SPIKE"
    | "FAILURE_SPIKE"
    | "NEW_CUSTOMER_SPIKE"
    | "COMBINED_SPIKE"
    | "SUBTLE_COMBINED";

const PAYMENT_METHODS: PaymentMethod[] = [
    "UPI",
    "CARD",
    "NETBANKING",
    "WALLET",
];

const FAILURE_REASONS = [
    "INSUFFICIENT_FUNDS",
    "PAYMENT_DECLINED",
    "TIMEOUT",
];

const MERCHANT_ID = createDeterministicId(
    "risk-failsafe-merchant"
);

/*
 * Seeded pseudo-random generator.
 *
 * Why?
 * Math.random() gives different data every run.
 * We want the same dataset every time so our
 * evaluation is reproducible.
 */
class SeededRandom {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    next(): number {
        this.seed =
            (this.seed * 1664525 + 1013904223) %
            4294967296;

        return this.seed / 4294967296;
    }

    int(min: number, max: number): number {
        return Math.floor(
            this.next() * (max - min + 1)
        ) + min;
    }

    float(min: number, max: number): number {
        return (
            this.next() * (max - min) + min
        );
    }

    boolean(probability: number): boolean {
        return this.next() < probability;
    }

    item<T>(items: T[]): T {
        return items[this.int(0, items.length - 1)];
    }
}

function createDeterministicId(
    value: string
): string {
    const hash = createHash("sha256")
        .update(value)
        .digest("hex");

    return [
        hash.slice(0, 8),
        hash.slice(8, 12),
        hash.slice(12, 16),
        hash.slice(16, 20),
        hash.slice(20, 32),
    ].join("-");
}

const randomAmount = (
    random: SeededRandom,
    minRupees: number,
    maxRupees: number
): number => {
    const rupees = random.int(
        minRupees,
        maxRupees
    );

    return rupees * 100;
};

const createCustomer = (
    random: SeededRandom,
    customerKey: string,
    windowStart: Date,
    isNew: boolean
): SyntheticCustomer => {
    const id = createDeterministicId(
        customerKey
    );

    const createdAt = new Date(
        windowStart
    );

    if (isNew) {
        // New customer = created within the
        // previous 24 hours.
        createdAt.setMinutes(
            createdAt.getMinutes() -
                random.int(1, 23 * 60)
        );
    } else {
        // Existing customer = created anywhere
        // from 7 to 365 days earlier.
        createdAt.setDate(
            createdAt.getDate() -
                random.int(7, 365)
        );
    }

    return {
        id,
        createdAt,
    };
};

interface TransactionGenerationOptions {
    merchantId: string;
    customer: SyntheticCustomer;
    timestamp: Date;
    minAmount: number;
    maxAmount: number;
    failureRate: number;
    random: SeededRandom;
    transactionKey: string;
}

const createTransaction = ({
    merchantId,
    customer,
    timestamp,
    minAmount,
    maxAmount,
    failureRate,
    random,
    transactionKey,
}: TransactionGenerationOptions): SyntheticTransaction => {
    const isFailed =
        random.boolean(failureRate);

    return {
        id: createDeterministicId(
            transactionKey
        ),

        merchantId,

        customerId: customer.id,

        amount: randomAmount(
            random,
            minAmount,
            maxAmount
        ),

        currency: "INR",

        status: isFailed
            ? "FAILED"
            : "SUCCESS",

        paymentMethod:
            random.item(PAYMENT_METHODS),

        failureReason: isFailed
            ? random.item(
                  FAILURE_REASONS
              )
            : undefined,

        timestamp:
            timestamp.toISOString(),

        customerCreatedAt:
            customer.createdAt.toISOString(),
    };
};

const createWindowDates = (
    scenarioIndex: number
) => {
    /*
     * Fixed start date means the dataset does
     * not change just because the current date changes.
     */
    const windowStart = new Date(
        "2026-01-01T00:00:00.000Z"
    );

    windowStart.setMinutes(
        windowStart.getMinutes() +
            scenarioIndex * 10
    );

    const windowEnd = new Date(
        windowStart
    );

    windowEnd.setMinutes(
        windowEnd.getMinutes() + 5
    );

    return {
        windowStart,
        windowEnd,
    };
};

const generateScenario = ({
    scenarioIndex,
    label,
    pattern,
}: {
    scenarioIndex: number;
    label: ScenarioLabel;
    pattern?: SuspiciousPattern;
}): SyntheticScenario => {
    const random = new SeededRandom(
        scenarioIndex * 7919 + 17
    );

    const {
        windowStart,
        windowEnd,
    } = createWindowDates(
        scenarioIndex
    );

    let transactionCount: number;
    let minAmount: number;
    let maxAmount: number;
    let failureRate: number;
    let newCustomerProbability: number;

    /*
     * Base NORMAL behaviour.
     *
     * The ranges overlap with suspicious behaviour.
     */
    if (label === "NORMAL") {
        transactionCount = random.int(
            22,
            48
        );

        minAmount = random.int(
            700,
            1200
        );

        maxAmount = random.int(
            2600,
            4200
        );

        failureRate = random.float(
            0.03,
            0.10
        );

        newCustomerProbability =
            random.float(
                0.08,
                0.20
            );
    } else {
        /*
         * Start with values that overlap normal.
         * Then modify based on attack pattern.
         */

        transactionCount = random.int(
            35,
            75
        );

        minAmount = random.int(
            1000,
            1800
        );

        maxAmount = random.int(
            3000,
            5200
        );

        failureRate = random.float(
            0.06,
            0.16
        );

        newCustomerProbability =
            random.float(
                0.12,
                0.28
            );

        switch (pattern) {
            case "VELOCITY_SPIKE":
                transactionCount =
                    random.int(
                        65,
                        110
                    );
                break;

            case "AMOUNT_SPIKE":
                minAmount =
                    random.int(
                        2500,
                        4000
                    );

                maxAmount =
                    random.int(
                        6000,
                        10000
                    );
                break;

            case "FAILURE_SPIKE":
                failureRate =
                    random.float(
                        0.22,
                        0.45
                    );
                break;

            case "NEW_CUSTOMER_SPIKE":
                newCustomerProbability =
                    random.float(
                        0.50,
                        0.80
                    );
                break;

            case "COMBINED_SPIKE":
                transactionCount =
                    random.int(
                        65,
                        105
                    );

                minAmount =
                    random.int(
                        2200,
                        3500
                    );

                maxAmount =
                    random.int(
                        5500,
                        8500
                    );

                failureRate =
                    random.float(
                        0.18,
                        0.35
                    );

                newCustomerProbability =
                    random.float(
                        0.45,
                        0.75
                    );
                break;

            case "SUBTLE_COMBINED":
                /*
                 * Every individual feature is only
                 * moderately abnormal.
                 *
                 * This is intentionally harder
                 * for the detector.
                 */
                transactionCount =
                    random.int(
                        45,
                        65
                    );

                minAmount =
                    random.int(
                        1300,
                        1800
                    );

                maxAmount =
                    random.int(
                        3500,
                        5200
                    );

                failureRate =
                    random.float(
                        0.12,
                        0.20
                    );

                newCustomerProbability =
                    random.float(
                        0.28,
                        0.42
                    );
                break;
        }
    }

    /*
     * Build a pool of existing + newly created
     * customers.
     */
    const existingCustomers =
        Array.from(
            { length: 80 },
            (_, index) =>
                createCustomer(
                    random,
                    `merchant-${MERCHANT_ID}-existing-${scenarioIndex}-${index}`,
                    windowStart,
                    false
                )
        );

    const newCustomers =
        Array.from(
            { length: 100 },
            (_, index) =>
                createCustomer(
                    random,
                    `merchant-${MERCHANT_ID}-new-${scenarioIndex}-${index}`,
                    windowStart,
                    true
                )
        );

    const transactions: SyntheticTransaction[] =
        [];

    for (
        let i = 0;
        i < transactionCount;
        i++
    ) {
        const useNewCustomer =
            random.boolean(
                newCustomerProbability
            );

        const pool = useNewCustomer
            ? newCustomers
            : existingCustomers;

        const customer =
            random.item(pool);

        const timestamp = new Date(
            windowStart
        );

        timestamp.setSeconds(
            random.int(0, 299)
        );

        transactions.push(
            createTransaction({
                merchantId: MERCHANT_ID,
                customer,
                timestamp,
                minAmount,
                maxAmount,
                failureRate,
                random,
                transactionKey:
                    `transaction-${scenarioIndex}-${i}`,
            })
        );
    }

    return {
    scenarioId: `${label.toLowerCase()}-${scenarioIndex}`,
    label,
    pattern,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    transactions,
};
};

const generateDataset =
    (): SyntheticScenario[] => {
        const scenarios: SyntheticScenario[] =
            [];

        const normalCount = 700;
        const suspiciousCount = 300;

        /*
         * 700 NORMAL scenarios.
         */
        for (
            let i = 0;
            i < normalCount;
            i++
        ) {
            scenarios.push(
                generateScenario({
                    scenarioIndex: i,
                    label: "NORMAL",
                })
            );
        }

        const suspiciousPatterns: SuspiciousPattern[] =
            [
                "VELOCITY_SPIKE",
                "AMOUNT_SPIKE",
                "FAILURE_SPIKE",
                "NEW_CUSTOMER_SPIKE",
                "COMBINED_SPIKE",
                "SUBTLE_COMBINED",
            ];

        /*
         * 300 SUSPICIOUS scenarios.
         * Rotate through different attack patterns.
         */
        for (
            let i = 0;
            i < suspiciousCount;
            i++
        ) {
            const scenarioIndex =
                normalCount + i;

            const pattern =
                suspiciousPatterns[
                    i %
                        suspiciousPatterns.length
                ];

            scenarios.push(
                generateScenario({
                    scenarioIndex,
                    label: "SUSPICIOUS",
                    pattern,
                })
            );
        }

        return scenarios;
    };

const main = async (): Promise<void> => {
    const dataset = generateDataset();

    const outputPath = path.resolve(
        process.cwd(),
        "data",
        "synthetic-transactions.json"
    );

    await writeFile(
        outputPath,
        JSON.stringify(
            dataset,
            null,
            2
        ),
        "utf-8"
    );

    const normalCount =
        dataset.filter(
            (scenario) =>
                scenario.label === "NORMAL"
        ).length;

    const suspiciousCount =
        dataset.filter(
            (scenario) =>
                scenario.label ===
                "SUSPICIOUS"
        ).length;

    console.log(
        "=== Synthetic Dataset Generated ==="
    );

    console.log(
        `Total scenarios: ${dataset.length}`
    );

    console.log(
        `Normal scenarios: ${normalCount}`
    );

    console.log(
        `Suspicious scenarios: ${suspiciousCount}`
    );

    console.log(
        `Saved dataset to: ${outputPath}`
    );
};

main().catch((error) => {
    console.error(
        "Failed to generate synthetic dataset:",
        error
    );

    process.exit(1);
});
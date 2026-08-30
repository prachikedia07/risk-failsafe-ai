export interface RiskTransaction {
    amount: number;
    status: "SUCCESS" | "FAILED";
    timestamp: string;
    customerCreatedAt: string;
}

export interface RiskScenario {
    scenarioId: string;
    label: "NORMAL" | "SUSPICIOUS";
    pattern?: SuspiciousPattern;
    windowStart: string;
    windowEnd: string;
    transactions: RiskTransaction[];
}

export interface TransactionFeatures {
    transactionCount: number;
    totalAmount: number;
    averageAmount: number;
    failedTransactions: number;
    failureRate: number;
    transactionsPerMinute: number;
    newCustomerTransactions: number;
    newCustomerRatio: number;
}

export type SuspiciousPattern =
    | "VELOCITY_SPIKE"
    | "AMOUNT_SPIKE"
    | "FAILURE_SPIKE"
    | "NEW_CUSTOMER_SPIKE"
    | "COMBINED_SPIKE"
    | "SUBTLE_COMBINED";
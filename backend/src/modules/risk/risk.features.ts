import {
    RiskScenario,
    TransactionFeatures,
} from "./risk.types";

const NEW_CUSTOMER_WINDOW_HOURS = 24;

export const extractTransactionFeatures = (
    scenario: RiskScenario
): TransactionFeatures => {
    const transactions = scenario.transactions;

    const transactionCount = transactions.length;

    if (transactionCount === 0) {
        return {
            transactionCount: 0,
            totalAmount: 0,
            averageAmount: 0,
            failedTransactions: 0,
            failureRate: 0,
            transactionsPerMinute: 0,
            newCustomerTransactions: 0,
            newCustomerRatio: 0,
        };
    }

    const totalAmount = transactions.reduce(
        (sum, transaction) => {
            return sum + transaction.amount;
        },
        0
    );

    const averageAmount =
        totalAmount / transactionCount;

    const failedTransactions =
        transactions.filter(
            (transaction) =>
                transaction.status === "FAILED"
        ).length;

    const failureRate =
        failedTransactions / transactionCount;

    const windowStart = new Date(
        scenario.windowStart
    );

    const windowEnd = new Date(
        scenario.windowEnd
    );

    const windowDurationMinutes =
        (windowEnd.getTime() -
            windowStart.getTime()) /
        (1000 * 60);

    const transactionsPerMinute =
        windowDurationMinutes > 0
            ? transactionCount /
              windowDurationMinutes
            : 0;

    const newCustomerTransactions =
        transactions.filter((transaction) => {
            const customerCreatedAt =
                new Date(
                    transaction.customerCreatedAt
                );

            const ageInHours =
                (windowStart.getTime() -
                    customerCreatedAt.getTime()) /
                (1000 * 60 * 60);

            return (
                ageInHours >= 0 &&
                ageInHours <=
                    NEW_CUSTOMER_WINDOW_HOURS
            );
        }).length;

    const newCustomerRatio =
        newCustomerTransactions /
        transactionCount;

    return {
        transactionCount,
        totalAmount,
        averageAmount,
        failedTransactions,
        failureRate,
        transactionsPerMinute,
        newCustomerTransactions,
        newCustomerRatio,
    };
};
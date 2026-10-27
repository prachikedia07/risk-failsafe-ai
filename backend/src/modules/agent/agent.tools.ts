import prisma from "../../lib/prisma";

export const getRecentTransactions = async (
    merchantId: string,
    minutes: number
) => {
    const safeMinutes = Math.min(
        Math.max(minutes, 1),
        60
    );

    const since = new Date(
        Date.now() -
            safeMinutes * 60 * 1000
    );

    return prisma.transaction.findMany({
        where: {
            merchantId,
            timestamp: {
                gte: since,
            },
        },
        orderBy: {
            timestamp: "desc",
        },
        take: 100,

        select: {
            id: true,
            customerId: true,
            amount: true,
            currency: true,
            status: true,
            paymentMethod: true,
            failureReason: true,
            timestamp: true,
        },
    });
};

export const getMerchantBaseline = async (
    riskAnalysisId: string
) => {
    const analysis =
        await prisma.riskAnalysis.findUnique({
            where: {
                id: riskAnalysisId,
            },

            select: {
                features: true,
            },
        });

    if (!analysis) {
        throw new Error(
            "Risk analysis not found"
        );
    }

    /*
     * The Risk Engine already stored the
     * baseline mean and standard deviation
     * inside each feature's evidence.
     *
     * We return only the baseline portion.
     */
    return analysis.features;
};

export const getRiskSignals = async (
    riskAnalysisId: string
) => {
    const analysis =
        await prisma.riskAnalysis.findUnique({
            where: {
                id: riskAnalysisId,
            },

            select: {
                riskScore: true,
                riskLevel: true,
                prediction: true,
                features: true,
                reasons: true,
                createdAt: true,
            },
        });

    if (!analysis) {
        throw new Error(
            "Risk analysis not found"
        );
    }

    return analysis;
};


export const createRiskAlert = async ({
    merchantId,
    riskAnalysisId,
    riskScore,
    riskLevel,
    title,
    message,
    action,
    confidence,
    reasons,
    investigationProvider,
    investigationStatus,
}: {
    merchantId: string;
    riskAnalysisId: string;
    riskScore: number;
    riskLevel:
        | "LOW"
        | "MEDIUM"
        | "HIGH"
        | "CRITICAL";
    title: string;
    message: string;
    action: "ALLOW" | "REVIEW" | "PAUSE";
    confidence: number;
    reasons: string[];
    investigationProvider?: string | null;
    investigationStatus:
        | "PENDING"
        | "COMPLETED"
        | "UNAVAILABLE";
}) => {
    return prisma.riskAlert.upsert({
        where: {
            riskAnalysisId,
        },
        create: {
            merchantId,
            riskAnalysisId,
            riskScore,
            riskLevel,
            title,
            message,
            action,
            confidence,
            agentReasons: reasons,
            investigationStatus,
            investigationProvider: investigationProvider ?? null,
        },
        update: {
            message,
            action,
            confidence,
            agentReasons: reasons,
            investigationStatus,
            investigationProvider: investigationProvider ?? null,
        },
    });
};

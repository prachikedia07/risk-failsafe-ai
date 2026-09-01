import prisma from "../../lib/prisma";
import { razorpay } from "../../lib/razorpay";

import {
    PaymentMethod,
    TransactionStatus,
} from "../../generated/prisma/enums";

import {
    analyzeLiveMerchantRisk,
} from "../risk/risk.live.service";
import { investigateRisk } from "../agent/agent.service";

interface RazorpayPayment {
    id: string;
    order_id?: string | null;
    amount: number;
    currency: string;
    status: string;
    method: string;
    created_at: number;

    error_description?: string | null;
    error_reason?: string | null;
}

interface RazorpayWebhookEvent {
    event: string;

    payload?: {
        payment?: {
            entity?: RazorpayPayment;
        };
    };
}

const mapPaymentMethod = (
    method: string
): PaymentMethod => {
    switch (method.toLowerCase()) {
        case "upi":
            return PaymentMethod.UPI;

        case "card":
            return PaymentMethod.CARD;

        case "netbanking":
            return PaymentMethod.NETBANKING;

        case "wallet":
            return PaymentMethod.WALLET;

        default:
            return PaymentMethod.OTHER;
    }
};

export const processRazorpayWebhook = async (
    event: RazorpayWebhookEvent,
    eventId: string
) => {
    /*
     * We only process payment events that
     * affect our transaction history.
     */
    if (
        event.event !== "payment.captured" &&
        event.event !== "payment.failed"
    ) {
        return {
            processed: false as const,
            reason: "Event not handled",
        };
    }

    const payment =
        event.payload?.payment?.entity;

    if (!payment) {
        throw new Error(
            "Payment entity missing from Razorpay webhook"
        );
    }

    if (!payment.id) {
        throw new Error(
            "Razorpay payment ID missing"
        );
    }

    if (!payment.order_id) {
        throw new Error(
            "Razorpay order ID missing"
        );
    }

    /*
     * Idempotency:
     * Don't create the same transaction twice.
     */
    const existingTransaction =
        await prisma.transaction.findFirst({
            where: {
                OR: [
                    {
                        razorpayEventId:
                            eventId,
                    },
                    {
                        razorpayPaymentId:
                            payment.id,
                    },
                ],
            },
        });

    if (existingTransaction) {
        return {
            processed: false as const,
            reason:
                "Duplicate webhook/payment",
            transaction:
                existingTransaction,
        };
    }

    /*
     * Fetch the original Razorpay order.
     * Our merchantId and customerId were
     * stored in the order's notes.
     */
    const order =
        await razorpay.orders.fetch(
            payment.order_id
        );

    const merchantId =
        order.notes?.merchantId;

    const customerId =
        order.notes?.customerId;

    if (
        typeof merchantId !== "string" ||
        merchantId.length === 0
    ) {
        throw new Error(
            "Merchant ID missing from Razorpay order notes"
        );
    }

    if (
        typeof customerId !== "string" ||
        customerId.length === 0
    ) {
        throw new Error(
            "Customer ID missing from Razorpay order notes"
        );
    }

    /*
     * Make sure the customer really belongs
     * to this merchant.
     */
    const customer =
        await prisma.customer.findFirst({
            where: {
                id: customerId,
                merchantId: merchantId,
            },
            select: {
                id: true,
            },
        });

    if (!customer) {
        throw new Error(
            "Customer does not belong to merchant"
        );
    }

    const transactionStatus =
        event.event === "payment.captured"
            ? TransactionStatus.SUCCESS
            : TransactionStatus.FAILED;

    const failureReason =
        event.event === "payment.failed"
            ? (
                  payment.error_description ??
                  payment.error_reason ??
                  null
              )
            : null;

    const transaction =
        await prisma.transaction.create({
            data: {
                merchantId,
                customerId,

                amount: payment.amount,

                currency:
                    payment.currency,

                status:
                    transactionStatus,

                paymentMethod:
                    mapPaymentMethod(
                        payment.method
                    ),

                failureReason,

                razorpayPaymentId:
                    payment.id,

                razorpayEventId:
                    eventId,

                timestamp:
                    new Date(
                        payment.created_at *
                            1000
                    ),
            },
        });

        const riskResult =
    await analyzeLiveMerchantRisk(
        merchantId
    );

    if (riskResult) {
    console.log(
        "✅ Risk analysis created:",
        riskResult.savedAnalysis.id
    );

    console.log(
        "Risk score:",
        riskResult.savedAnalysis.riskScore
    );

    console.log(
        "Risk prediction:",
        riskResult.savedAnalysis.prediction
    );

    if (
        riskResult.savedAnalysis.prediction ===
        "SUSPICIOUS"
    ) {
        console.log(
            "🚨 Suspicious activity detected. Starting AI investigation..."
        );

        const agentResult =
            await investigateRisk(
                riskResult.savedAnalysis.id
            );

        console.log(
            "✅ AI investigation completed:",
            agentResult
        );
    }
}

    return {
    processed: true as const,
    transaction,
    riskAnalysis:
        riskResult?.savedAnalysis ?? null,
};
};
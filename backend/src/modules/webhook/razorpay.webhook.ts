import "dotenv/config";

import {
    createHmac,
    timingSafeEqual,
} from "crypto";

import {
    Request,
    Response,
} from "express";

const webhookSecret =
    process.env.RAZORPAY_WEBHOOK_SECRET;

if (!webhookSecret) {
    throw new Error(
        "RAZORPAY_WEBHOOK_SECRET is not configured"
    );
}

export const razorpayWebhookController = async (
    req: Request,
    res: Response
) => {
    const signature =
        req.header(
            "X-Razorpay-Signature"
        );

    if (!signature) {
        return res.status(400).json({
            success: false,
            message:
                "Missing Razorpay webhook signature",
        });
    }

    if (!Buffer.isBuffer(req.body)) {
        return res.status(400).json({
            success: false,
            message:
                "Webhook body must be raw",
        });
    }

    const expectedSignature =
        createHmac(
            "sha256",
            webhookSecret
        )
            .update(req.body)
            .digest("hex");

    const receivedBuffer =
        Buffer.from(
            signature,
            "utf8"
        );

    const expectedBuffer =
        Buffer.from(
            expectedSignature,
            "utf8"
        );

    if (
        receivedBuffer.length !==
        expectedBuffer.length
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Invalid webhook signature",
        });
    }

    if (
        !timingSafeEqual(
            receivedBuffer,
            expectedBuffer
        )
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Invalid webhook signature",
        });
    }

    const event = JSON.parse(
        req.body.toString("utf8")
    );

    const eventId =
        req.header(
            "x-razorpay-event-id"
        );

    console.log(
        "✅ Razorpay webhook verified"
    );

    console.log(
        "Event:",
        event.event
    );

    console.log(
        "Event ID:",
        eventId
    );

    if (
        event.event ===
        "payment.captured"
    ) {
        console.log(
            "✅ payment.captured received"
        );
    }

    if (
        event.event ===
        "payment.failed"
    ) {
        console.log(
            "✅ payment.failed received"
        );
    }

    return res.status(200).json({
        success: true,
        message:
            "Razorpay webhook received",
    });
};
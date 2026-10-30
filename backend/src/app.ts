import express from "express";
import cors from "cors";

import healthRoutes from "./modules/health/health.routes";
import merchantRoutes from "./modules/merchant/merchant.routes";
import customerRoutes from "./modules/customer/customer.routes";
import transactionRoutes from "./modules/transaction/transaction.routes";
import agentRoutes from "./modules/agent/agent.routes";
import paymentRoutes from "./modules/payment/payment.routes";
import alertRoutes from "./modules/alerts/alerts.routes";
import webhookRoutes from "./modules/webhook/razorpay.webhook.routes";

import { errorMiddleware } from "./middleware/error.middleware";
import evaluationRoutes from "./modules/evaluation/evaluation.routes";

const app = express();

app.use(
    cors({
        origin: [
            "http://localhost:3000",
            "http://localhost:5500",
            "http://127.0.0.1:5500",
        ],
    })
);

/*
 * IMPORTANT:
 * Razorpay webhook must receive the raw body
 * BEFORE express.json() parses it.
 */
app.use(
    "/api/webhooks/razorpay",
    express.raw({
        type: "application/json",
    }),
    webhookRoutes
);

/*
 * Normal application requests use JSON parsing.
 */
app.use(
    express.json({
        limit: "100kb",
    })
);

app.get("/", (_req, res) => {
    res.json({
        message:
            "RiskFailsafe AI backend is running!",
    });
});

app.use("/health", healthRoutes);
app.use("/api/merchants", merchantRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/agent", agentRoutes);
app.use(
    "/api/payments",
    paymentRoutes
);
app.use("/api/alerts", alertRoutes);
app.use("/api/evaluation", evaluationRoutes);
app.use(errorMiddleware);

export default app;
import express from "express";
import cors from "cors";
import healthRoutes from "./modules/health/health.routes";
import merchantRoutes from "./modules/merchant/merchant.routes";
import { errorMiddleware } from "./middleware/error.middleware";
import customerRoutes from "./modules/customer/customer.routes";
import transactionRoutes from "./modules/transaction/transaction.routes";

const app = express();

app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
    })
);
app.use(express.json({ limit: "100kb" }));

app.get("/", (_req, res) => {
    res.json({
        message: "RiskFailsafe AI backend is running!",
    });
});

app.use("/health", healthRoutes);
app.use("/api/merchants", merchantRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/transactions", transactionRoutes);
app.use(errorMiddleware);
export default app;
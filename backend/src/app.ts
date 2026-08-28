import express from "express";
import cors from "cors";
import healthRoutes from "./modules/health/health.routes";
import merchantRoutes from "./modules/merchant/merchant.routes";
import { errorMiddleware } from "./middleware/error.middleware";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
    res.json({
        message: "RiskFailsafe AI backend is running!",
    });
});

app.use("/health", healthRoutes);
app.use("/api/merchants", merchantRoutes);
app.use(errorMiddleware);
export default app;
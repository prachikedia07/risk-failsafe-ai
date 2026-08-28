import express from "express";
import cors from "cors";
import healthRoutes from "./modules/health/health.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
    res.json({
        message: "RiskFailsafe AI backend is running!",
    });
});

app.use("/health", healthRoutes);

export default app;
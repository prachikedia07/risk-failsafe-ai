import { Router } from "express";

import {
    investigateRiskController,
} from "./agent.controller";

import { asyncHandler } from "../../middleware/async-handler";

const router = Router();

router.post(
    "/investigate/:riskAnalysisId",
    asyncHandler(
        investigateRiskController
    )
);

export default router;
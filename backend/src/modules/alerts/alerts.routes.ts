import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import { getAlertsController } from "./alerts.controller";

const router = Router();

router.get("/", asyncHandler(getAlertsController));

export default router;
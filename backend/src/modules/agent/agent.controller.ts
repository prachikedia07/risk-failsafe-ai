import { Request, Response } from "express";
import { z } from "zod";

import { investigateRisk } from "./agent.service";

const riskAnalysisIdParamSchema = z.object({
    riskAnalysisId: z.uuid("Invalid risk analysis ID"),
});

export const investigateRiskController = async (
    req: Request,
    res: Response
) => {
    const { riskAnalysisId } =
        riskAnalysisIdParamSchema.parse(req.params);

    const decision =
        await investigateRisk(riskAnalysisId);

    return res.status(200).json({
        success: true,
        data: decision,
    });
};
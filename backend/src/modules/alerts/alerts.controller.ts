import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export const getAlertsController = async (
  _req: Request,
  res: Response
) => {
  const alerts = await prisma.riskAlert.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
    include: {
      riskAnalysis: {
        select: {
          prediction: true,
          features: true,
          reasons: true,
          createdAt: true,
        },
      },
    },
  });

  return res.status(200).json({
    success: true,
    data: alerts,
  });
};
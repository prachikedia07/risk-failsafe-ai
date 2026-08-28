import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "../generated/prisma/client";
import { AppError } from "../lib/app-error";

export const errorMiddleware = (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    console.error(error);

    // Our own application errors
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            success: false,
            code: error.code,
            message: error.message,
        });
    }

    // Request validation errors
    if (error instanceof ZodError) {
        return res.status(400).json({
            success: false,
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            errors: error.issues,
        });
    }

    // Prisma record-not-found / constraint / query errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
            return res.status(404).json({
                success: false,
                code: "RECORD_NOT_FOUND",
                message: "Requested record was not found",
            });
        }

        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                code: "DUPLICATE_RESOURCE",
                message: "A record with these values already exists",
            });
        }
    }

    // Unknown/unexpected error
    return res.status(500).json({
        success: false,
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
    });
};
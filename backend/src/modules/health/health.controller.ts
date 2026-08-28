import {Request, Response} from 'express';
import prisma from '../../lib/prisma';

export const healthCheck = async(req: Request, res: Response)=>{
    try {
        const merchantCount = await prisma.merchant.count();
        res.status(200).json({
            status: 'ok',
            database: "connected",
            merchantCount,
        })
    } catch (error) {
        console.log(error);
        console.log("Database connection error");
        res.status(500).json({
            status: 'error',
            database: "disconnected",
        });
    }
};
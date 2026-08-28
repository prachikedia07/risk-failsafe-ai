import {Request, Response} from 'express';

import{
    createMerchant, getAllMerchants, getMerchantById, updateMerchant
} from './merchant.service';

import {createMerchantSchema, merchantIdParamSchema, updateMerchantSchema} from './merchant.validation';

export const createMerchantController = async(
    req: Request, res: Response
) =>{
const validatedData = createMerchantSchema.parse(req.body);
const merchant = await createMerchant(validatedData);
return res.status(201).json({
    success: true,
    data: merchant,
});
}

export const getAllMerchantsController = async(
    req: Request, res: Response
) => {
    const merchants = await getAllMerchants();

    return res.status(200).json({
        success: true,
        data: merchants,
    });
}

export const getMerchantByIdController = async(
    req: Request, res: Response
) => {
     const { id } = merchantIdParamSchema.parse(req.params);

    const merchant = await getMerchantById(id);

    if(!merchant){
        return res.status(404).json({
            success: false,
            message: "Merchant not found",
        })
    }

    return res.status(200).json({
        success: true,
        data: merchant,
    });
}

export const updateMerchantController = async (
    req: Request,
    res: Response
) => {
    const { id } = merchantIdParamSchema.parse(req.params);

    const validatedData = updateMerchantSchema.parse(req.body);

    const merchant = await updateMerchant(id, validatedData);

    return res.status(200).json({
        success: true,
        data: merchant,
    });
};
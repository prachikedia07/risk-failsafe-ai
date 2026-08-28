import {Request, Response} from 'express';

import {
    createCustomer, getAllCustomers, getCustomerById, updateCustomer
} from './customer.service'

import {
    createCustomerSchema, customerIdParamSchema, updateCustomerSchema
} from './customer.validation'

export const createCustomerController = async(
    req: Request, res: Response
) => {
    const { name, merchantId } = createCustomerSchema.parse(req.body);
   
    const customer = await createCustomer({name, merchantId});
    return res.status(201).json({
        success: true,
        data: customer,
    });
}

export const getAllCustomersController = async(
    req: Request, res: Response
) =>{
    const customers = await getAllCustomers();
    return res.status(200).json({
        success: true,
        data: customers,
    });
}

export const getCustomerByIdController = async(
    req: Request, res: Response
) => {
    const { id } = customerIdParamSchema.parse(req.params);

    const customer = await getCustomerById(id);

    if(!customer){
        return res.status(404).json({
            success: false,
            code: "CUSTOMER_NOT_FOUND",
            message: "Customer not found",
        });
    }
    return res.status(200).json({
        success: true,
        data: customer,
    });
}

export const updateCustomerController = async(
    req: Request, res: Response) =>{
    const { id } = customerIdParamSchema.parse(req.params);

    const validatedData = updateCustomerSchema.parse(req.body);

    const customer = await updateCustomer(id, validatedData);

    return res.status(200).json({
        success: true,
        data: customer,
    });
    }
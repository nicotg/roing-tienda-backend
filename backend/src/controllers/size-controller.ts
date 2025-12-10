import { Request, Response } from "express";
import Size from "../models/size-model";
import ProductSize from "../models/size-product-model";

export const createSize = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { sizeDesc } = req.body;

    const newSize = await Size.create({
      sizeDesc,
    });

    return res.status(201).json({
      message: "Size created successfully",
      size: newSize
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error creating size",
      error: error.message
    });
  }
};

export const getAllSizes = async (req: Request, res: Response): Promise<Response> => {
  try {
    const sizes = await Size.findAll();

    return res.status(200).json({
      sizes
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error fetching sizes",
      error: error.message
    });
  }
};

export const addSizeToProduct = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { idProduct, idSize, stock} = req.params;

    
    const productSize = await ProductSize.create({
      idProduct: parseInt(idProduct),
      idSize: parseInt(idSize),
      stock: stock?parseInt(stock):0
    });

    return res.status(201).json({
      message: "Size added to product successfully",
      productSize
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error adding size to product",
      error: error.message
    });
  }
};
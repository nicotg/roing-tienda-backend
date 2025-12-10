import { Request, Response } from "express";
import Price from "../models/price-model";
import Product from "../models/product-model";

export const createPrice = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { idProduct } = req.params;
    const { value, updateDate } = req.body;

    const product = await Product.findByPk(idProduct);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const newPrice = await Price.create({
      idProduct: parseInt(idProduct),
      value,
      updateDate: updateDate || new Date()
    });

    return res.status(201).json({
      message: "Price created successfully",
      price: newPrice
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error creating price",
      error: error.message
    });
  }
};

export const getProductPrices = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { idProduct } = req.params;

    const prices = await Price.findAll({
      where: { idProduct: parseInt(idProduct) },
      order: [['updateDate', 'DESC']]
    });

    return res.status(200).json({
      prices
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error fetching prices",
      error: error.message
    });
  }
};

export const updatePrice = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { idProduct, updateDate } = req.params;
    const { value } = req.body;

    const price = await Price.findOne({
      where: {
        idProduct: parseInt(idProduct),
        updateDate: new Date(updateDate)
      }
    });

    if (!price) {
      return res.status(404).json({ message: "Price not found" });
    }

    price.value = value;
    await price.save();

    return res.status(200).json({
      message: "Price updated successfully",
      price
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error updating price",
      error: error.message
    });
  }
};
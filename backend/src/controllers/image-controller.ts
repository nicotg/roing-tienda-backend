import { Request, Response } from "express";
import Image from "../models/image-model";
import Product from "../models/product-model";

export const addImage = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { idProduct } = req.params;
    const { url, description } = req.body;

    const product = await Product.findByPk(idProduct);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const newImage = await Image.create({
      idProduct: parseInt(idProduct),
      url,
      description: description || ''
    });

    return res.status(201).json({
      message: "Image added successfully",
      image: newImage
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error adding image",
      error: error.message
    });
  }
};

export const getProductImages = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { idProduct } = req.params;

    const images = await Image.findAll({
      where: { idProduct: parseInt(idProduct) }
    });

    return res.status(200).json({
      images
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error fetching images",
      error: error.message
    });
  }
};

export const deleteImage = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { idProduct, url } = req.params;

    const image = await Image.findOne({
      where: {
        idProduct: parseInt(idProduct),
        url
      }
    });

    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    await image.destroy();

    return res.status(200).json({
      message: "Image deleted successfully"
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error deleting image",
      error: error.message
    });
  }
};
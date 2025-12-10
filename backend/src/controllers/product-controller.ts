import { Request, Response } from "express";
import Product from "../models/product-model";
import Category from "../models/category-model";
import Price from "../models/price-model";
import Image from "../models/image-model";
import Order from '../models/order-model';
import db from "../db/connection";
import ProductSize from "../models/size-product-model";
import Size from "../models/size-model";
import { FindOptions, Op, WhereOptions, fn, col, literal } from "sequelize";
import OrderLine from '../models/order-line-model';

// Extend FindOptions locally to include the optional `escape` property used for LIKE queries
type FindOptionsWithEscape = FindOptions & { escape?: string };

export const createProduct = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const transaction = await db.transaction();
  try {
    const {
      name,
      description,
      idCategory,
      initialPrice,
      images,
      sizes,
    } = req.body;

    
    const category = await Category.findByPk(idCategory, { transaction });
    if (!category) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Category does not exist",
      });
    }

    
    const productCreated = await Product.create(
      {
        name,
        description,
        idCategory,
      },
      { transaction }
    );

    
    if (initialPrice !== undefined) {
      await Price.create(
        {
          idProduct: productCreated.idProduct,
          value: initialPrice,
          updateDate: new Date(),
        },
        { transaction }
      );
    }

    
    if (images && Array.isArray(images)) {
      for (const imageData of images) {
        await Image.create(
          {
            idProduct: productCreated.idProduct,
            url: imageData.url,
            description: imageData.description || "",
          },
          { transaction }
        );
      }
    }

    
    if (sizes && Array.isArray(sizes)) {
      // sizes may be array of size IDs or objects with id and stock
      for (const s of sizes) {
        const sizeId = typeof s === 'number' ? s : (s.idSize ?? s.id);
        const stockVal = typeof s === 'object' && typeof s.stock === 'number' ? s.stock : 0;
        await ProductSize.create(
          {
            idProduct: productCreated.idProduct,
            idSize: sizeId,
            stock: stockVal,
          },
          { transaction }
        );
      }
    }

    await transaction.commit();

   
    const completeProduct = await Product.findByPk(productCreated.idProduct, {
      include: [
        {
          model: Price,
          as: "prices",
          limit: 1,
          order: [["updateDate", "DESC"]],
        },
        {
          model: Image,
          as: "images",
        },
        {
          model: Category,
          as: "category",
        },
        {
          model: Size,
          as: "sizes",
          through: { attributes: [] }, 
        },
      ],
    });

    return res.status(201).json({
      message: "Product created successfully",
      product: completeProduct,
    });
  } catch (error: any) {
    
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        // ignore rollback errors
      }
    }
    return res.status(500).json({
      message: "Error creating product",
      error: error.message,
    });
  }
};

export const updateProduct = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;

  // Extract fields from body
  const { name, description, idCategory, sizes, initialPrice, images } =
    req.body;

  const transaction = await db.transaction();

  try {
    // Find the product
    const productToUpdate = await Product.findByPk(id, { transaction });
    if (!productToUpdate) {
      await transaction.rollback();
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // Validate new category exists if provided
    if (idCategory !== undefined) {
      const category = await Category.findByPk(idCategory, {
        transaction,
      });
      if (!category) {
        await transaction.rollback();
        return res.status(400).json({
          message: "Category does not exist",
        });
      }
      productToUpdate.idCategory = idCategory;
    }

    // Update basic fields
    if (name !== undefined) productToUpdate.name = name;
    if (description !== undefined) productToUpdate.description = description;
    // stock per product no longer exists; handled via ProductSize

    // Save changes to product
    await productToUpdate.save({ transaction });

    // Update price if provided
    if (initialPrice !== undefined) {
      await Price.create(
        {
          idProduct: parseInt(id),
          value: initialPrice,
          updateDate: new Date(),
        },
        { transaction }
      );
    }

    // Update sizes if provided
    if (sizes !== undefined) {
      // Replace size set and optionally their stocks
      await ProductSize.destroy({
        where: { idProduct: id },
        transaction,
      });
      if (Array.isArray(sizes) && sizes.length > 0) {
        for (const s of sizes) {
          const sizeId = typeof s === 'number' ? s : (s.idSize ?? s.id);
          const stockVal = typeof s === 'object' && typeof s.stock === 'number' ? s.stock : 0;
          await ProductSize.create(
            {
              idProduct: parseInt(id),
              idSize: sizeId,
              stock: stockVal,
            },
            { transaction }
          );
        }
      }
    }

    if (images !== undefined) {
      
      await Image.destroy({
        where: { idProduct: parseInt(id) },
        transaction,
      });

    
      if (Array.isArray(images) && images.length > 0) {
        for (const imageData of images) {
          await Image.create(
            {
              idProduct: parseInt(id),
              url: imageData.url,
              description: imageData.description || "",
            },
            { transaction }
          );
        }
      }
    }

    await transaction.commit();

    const completeProduct = await Product.findByPk(id, {
      include: [
        {
          model: Price,
          as: "prices",
          order: [["updateDate", "DESC"]],
          limit: 1,
        },
        {
          model: Image,
          as: "images",
        },
        {
          model: Category,
          as: "category",
        },
        {
          model: Size,
          as: "sizes",
          through: { attributes: [] },
        },
      ],
    });

    return res.status(200).json({
      message: "Product updated successfully",
      product: completeProduct,
    });
  } catch (error: any) {
    
    // @ts-ignore: Property 'finished' does not exist on type 'Transaction' but it exists at runtime
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("Error in updateProduct:", error);

    return res.status(500).json({
      message: "Error updating product",
      error: error.message,
    });
  }
};

export const deleteProduct = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const transaction = await db.transaction();

  try {
    
    const productToDelete = await Product.findByPk(id, { transaction });
    if (!productToDelete) {
      await transaction.rollback();
      return res.status(404).json({
        message: "Product not found",
      });
    }

    
    await ProductSize.destroy({
      where: { idProduct: id },
      transaction,
    });

  
    await Price.destroy({
      where: { idProduct: id },
      transaction,
    });

    await Image.destroy({
      where: { idProduct: id },
      transaction,
    });

  
    await productToDelete.destroy({ transaction });

    await transaction.commit();

    return res.status(200).json({
      message: "Product deleted successfully",
    });
  } catch (error: any) {
   
    // @ts-ignore: Property 'finished' does not exist on type 'Transaction' but it exists at runtime
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return res.status(500).json({
      message: "Error deleting product",
      error: error.message,
    });
  }
};

export const getProduct = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;

  try {
    const product = await Product.findByPk(id, {
      include: [
        {
          model: Price,
          as: "prices",
          order: [["updateDate", "DESC"]],
        },
        {
          model: Image,
          as: "images",
        },
        {
          model: Category,
          as: "category",
        },
        {
          model: Size,
          as: "sizes",
          through: { attributes: ["stock"] },
        },
      ],
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json({
      product,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error fetching product",
      error: error.message,
    });
  }
};

export const getAllProducts = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { search } = req.query;

    let whereClause: WhereOptions | null = null;
    if (typeof search === "string") {
      const trimmedSearch = search.trim();
      if (trimmedSearch.length > 0) {
        const escapedSearch = trimmedSearch.replace(/[%_\\]/g, "\\$&");
        const likePattern = `%${escapedSearch}%`;

        whereClause = {
          [Op.or]: [
            { name: { [Op.like]: likePattern } },
            { description: { [Op.like]: likePattern } },
          ],
        };
      }
    }

  const findOptions: FindOptionsWithEscape = {
      include: [
        {
          model: Price,
          as: "prices",
          order: [["updateDate", "DESC"]],
          limit: 1,
        },
        {
          model: Image,
          as: "images",
          limit: 2,
        },
        {
          model: Category,
          as: "category",
        },
        {
          model: Size,
          as: "sizes",
          through: { attributes: ["stock"] },
        },
      ],
    };

    if (whereClause) {
      findOptions.where = whereClause;

  findOptions.escape = "\\";
    }

    const products = await Product.findAll(findOptions);

    return res.status(200).json({
      products,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error fetching products",
      error: error.message,
    });
  }
};

export const getCriticalProducts = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { criticalParam } = req.query;

    let criticalValue: number = 10;

    if (criticalParam && !isNaN(Number(criticalParam))) {
      criticalValue = parseInt(criticalParam as string, 10);
    }

    // Aggregate stock per product from ProductSize and return products whose total stock is less than criticalValue
    const productStocks = await ProductSize.findAll({
      attributes: [
        'idProduct',
        [fn('SUM', col('stock')), 'totalStock']
      ],
      group: ['idProduct'],
      having: literal(`SUM(stock) < ${criticalValue}`),
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['idProduct', 'name']
        }
      ]
    });

    const products = productStocks.map((ps: any) => ({
      idProduct: ps.idProduct,
      name: ps.product?.name || 'Unknown',
      totalStock: Number(ps.get('totalStock') || 0)
    }));

    return res.status(200).json({
      products,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Error fetching critical products',
      error: error.message,
    });
  }
};

export const getTopFive = async (req: Request, res: Response): Promise<Response> => {
  try {
    
    const topProducts = await OrderLine.findAll({
      attributes: [
        'idProduct',
        [fn('COUNT', col('OrderLine.idOrder')), 'orderCount']
      ],
      group: ['idProduct'],
      order: [[literal('orderCount'), 'DESC']],
      limit: 5,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['idProduct', 'name']
        }
      ]
    });

    return res.status(200).json({
      topProducts: topProducts.map((item: any) => ({
        name: item.product?.name || 'Unknown',
        orderCount: item.get('orderCount')
      }))
    });
  } catch (error: any) {
    console.error('Error fetching top products:', error);
    return res.status(500).json({
      message: 'Error fetching top products',
      error: error.message
    });
  }
};

// Update stock for a specific product-size relation
export const updateProductSizeStock = async (req: Request, res: Response): Promise<Response> => {
  const { id, sizeId } = req.params;
  const { stock } = req.body as { stock: number };

  if (stock === undefined || stock === null || Number.isNaN(Number(stock)) || Number(stock) < 0) {
    return res.status(400).json({ message: 'Invalid stock value' });
  }

  const transaction = await db.transaction();
  try {
    // Ensure product exists
    const product = await Product.findByPk(id, { transaction });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Product not found' });
    }

    // Ensure size exists
    const size = await Size.findByPk(sizeId, { transaction });
    if (!size) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Size not found' });
    }

    // Find or create the ProductSize relation
    let ps = await ProductSize.findOne({
      where: { idProduct: id, idSize: sizeId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!ps) {
      ps = await ProductSize.create({ idProduct: Number(id), idSize: Number(sizeId), stock: Number(stock) }, { transaction });
    } else {
      ps.stock = Number(stock);
      await ps.save({ transaction });
    }

    await transaction.commit();
    return res.status(200).json({ message: 'Stock actualizado', productSize: ps });
  } catch (error: any) {
    try { await transaction.rollback(); } catch {}
    console.error('Error updating product-size stock:', error);
    return res.status(500).json({ message: 'Error updating stock', error: error.message });
  }
};
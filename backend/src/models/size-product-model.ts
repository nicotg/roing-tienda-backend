import { DataTypes, Model } from "sequelize";
import db from '../db/connection';

interface ProductSizeAttributes {
  idProduct: number;
  idSize: number;
  stock: number;
}

class ProductSize extends Model<ProductSizeAttributes> implements ProductSizeAttributes {
  public idProduct!: number;
  public idSize!: number;
  public stock!: number;
}

ProductSize.init({
  idProduct: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    allowNull: false
  },
  idSize: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    allowNull: false
  },
  stock: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0
  }
}, {
  sequelize: db,
  tableName: 'product_size',
  timestamps: false
});

export default ProductSize;
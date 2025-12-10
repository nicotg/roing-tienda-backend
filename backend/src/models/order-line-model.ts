import { DataTypes, Model } from "sequelize";
import db from "../db/connection";

interface OrderLineAttributes {
  idOrderLine?: number;
  idOrder: number;
  idProduct: number;
  idSize?: number;
  quantity: number;
  subtotal: number;
}

class OrderLine extends Model<OrderLineAttributes> implements OrderLineAttributes {
  public idOrderLine!: number;
  public idOrder!: number;
  public idProduct!: number;
  public idSize!: number;
  public quantity!: number;
  public subtotal!: number;
}

OrderLine.init(
  {
    idOrderLine: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    idOrder: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'Order',    
        key: 'idOrder',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    idProduct: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'Product',   
        key: 'idProduct',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    idSize: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'Size',
        key: 'idSize',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    quantity: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    }
  },
  {
    sequelize: db,
    tableName: "order_line",
    timestamps: false,
  }
);

export default OrderLine;
import { DataTypes, Model, Optional } from "sequelize";
import db from "../db/connection";

interface OrderAttributes {
  idOrder: number;
  orderDate: Date;
  PickupDate?: Date;
  idUser: number;
  idPaymentMethod: number;
  external_reference?: string;
  payment_id?: string;
  total_amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_notes?: string;
  sport?: string;
  statusMp?: string; 
  currencyId?: string; 
}

interface OrderCreationAttributes extends Optional<OrderAttributes, 
  "idOrder" |  "PickupDate" | "external_reference" | 
  "payment_id" | "customer_phone" | "customer_notes" | "sport" | "statusMp" | "currencyId"> {}

class Order extends Model<OrderAttributes, OrderCreationAttributes> 
  implements OrderAttributes {
  
  public idOrder!: number;
  public orderDate!: Date;
  public PickupDate?: Date;
  public idUser!: number;
  public idPaymentMethod!: number;
  public external_reference?: string;
  public payment_id?: string;
  public total_amount!: number;
  public customer_name!: string;
  public customer_email!: string;
  public customer_phone?: string;
  public customer_notes?: string;
  public sport?: string;
  public statusMp?: string;
  public currencyId?: string;
}

Order.init({
  idOrder: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  orderDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },

  PickupDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  idUser: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  idPaymentMethod: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  external_reference: { 
    type: DataTypes.STRING(255),
    allowNull: true, 
  },
  payment_id: { 
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  total_amount: { 
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  customer_name: { 
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  customer_email: { 
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  customer_phone: { 
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  customer_notes: { 
    type: DataTypes.TEXT,
    allowNull: true,
  },
  sport: { 
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  statusMp: { 
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  currencyId: { 
    type: DataTypes.STRING(10),
    allowNull: true,
    defaultValue: 'ARS',
  },
}, {
  sequelize: db,
  tableName: "order",
  timestamps: false,
});

export default Order;

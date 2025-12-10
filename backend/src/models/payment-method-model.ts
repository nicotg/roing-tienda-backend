import { DataTypes, Model, Optional } from "sequelize";
import db from "../db/connection";

interface PaymentMethodAttributes {
  idPaymentMethod: number;
  name: string;
  fees: number;
}

interface PaymentMethodCreationAttributes extends Optional<PaymentMethodAttributes, "idPaymentMethod"> {}

class PaymentMethod extends Model<PaymentMethodAttributes, PaymentMethodCreationAttributes> 
  implements PaymentMethodAttributes {
  
  public idPaymentMethod!: number;
  public name!: string;
  public fees!: number;
}

PaymentMethod.init(
  {
    idPaymentMethod: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    fees: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
  },
  {
    sequelize: db,
    tableName: "payment_method",
    timestamps: false,
  }
);

export default PaymentMethod;
import { DataTypes, Model, Optional } from "sequelize";
import db from '../db/connection';

interface PriceAttributes {
  idProduct: number;
  updateDate: Date;
  value: number;
}

interface PriceCreationAttributes extends Optional<PriceAttributes, 'updateDate'> {}

class Price extends Model<PriceAttributes, PriceCreationAttributes> implements PriceAttributes {
  public idProduct!: number;
  public updateDate!: Date;
  public value!: number;
}

Price.init({
  idProduct: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    allowNull: false
  },
  updateDate: {
    type: DataTypes.DATE,
    primaryKey: true,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  value: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false
  }
}, {
  sequelize: db,
  tableName: 'price',
  timestamps: false
});

export default Price;
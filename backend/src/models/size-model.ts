import { DataTypes, Model, Optional } from "sequelize";
import db from '../db/connection';

interface SizeAttributes {
  idSize: number;
  sizeDesc: string;
}

interface SizeCreationAttributes extends Optional<SizeAttributes, 'idSize'> {}

class Size extends Model<SizeAttributes, SizeCreationAttributes> implements SizeAttributes {
  public idSize!: number;
  public sizeDesc!: string;
}

Size.init({
  idSize: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  },
  sizeDesc: {
    type: DataTypes.STRING(255),
    allowNull: false
  }
}, {
  sequelize: db,
  tableName: 'size',
  timestamps: false
});

export default Size;
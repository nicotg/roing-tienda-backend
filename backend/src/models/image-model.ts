import { DataTypes, Model, Optional } from "sequelize";
import db from '../db/connection';

interface ImageAttributes {
  idProduct: number;
  url: string;
  description: string;
}

interface ImageCreationAttributes extends Optional<ImageAttributes, 'description'> {}

class Image extends Model<ImageAttributes, ImageCreationAttributes> implements ImageAttributes {
  public idProduct!: number;
  public url!: string;
  public description!: string;
}

Image.init({
  idProduct: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    allowNull: false
  },
  url: {
    type: DataTypes.STRING(255),
    primaryKey: true,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false
  }
}, {
  sequelize: db,
  tableName: 'images',
  timestamps: false
});

export default Image;
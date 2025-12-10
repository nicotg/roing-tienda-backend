import { DataTypes, Model, Optional } from 'sequelize';
import db from '../db/connection';

interface CategoryAttributes {
  idCategory: number;
  name: string;
}

interface CategoryCreationAttributes extends Optional<CategoryAttributes, 'idCategory'> {}

class Category extends Model<CategoryAttributes, CategoryCreationAttributes> implements CategoryAttributes {
  public idCategory!: number;
  public name!: string;
}

Category.init({
  idCategory: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  }
}, {
  sequelize: db,
  tableName: 'category',
  timestamps: false
});

export default Category;
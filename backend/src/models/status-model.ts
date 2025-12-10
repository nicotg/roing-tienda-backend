import { DataTypes, Model } from "sequelize";
import db from "../db/connection";

interface StatusAttributes {
  idOrder: number;
  statusDate: Date;
  description: string;
}

class Status extends Model<StatusAttributes> implements StatusAttributes {
  public idOrder!: number;
  public statusDate!: Date;
  public description!: string;
}

Status.init(
  {
    idOrder: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      allowNull: false,
    },
    statusDate: {
      type: DataTypes.DATE,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
  },
  {
    sequelize: db,
    tableName: "status",
    timestamps: false,
  }
);

export default Status;
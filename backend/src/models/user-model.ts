import { DataTypes, Model, Optional } from 'sequelize';
import db from '../db/connection';


interface UserAttributes {
  idUser: string;
  dni?: number | null;
  email: string;
  name: string;
  surname: string;
  password: string;
  role?: string;
  isMember: boolean;
  registrationDate: Date;
  status: string;
  activationToken?: string | null;           
  activationTokenExpires?: Date | null;
  passwordResetTokenHash?: string | null;
  passwordResetTokenExpiresAt?: Date | null;
  passwordResetTokenUsedAt?: Date | null; 
}
interface UserCreationAttributes extends Optional<UserAttributes, 'idUser' | 'dni' | 'role' | 'isMember' | 'registrationDate' | 'status'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public idUser!: string;
  public dni?: number;
  public email!: string;
  public name!: string;
  public surname!: string;
  public password!: string;
  public role?: string;
  public isMember!: boolean;
  public registrationDate!: Date;
  public status!: string;
  public activationToken?: string | null;           
  public activationTokenExpires?: Date | null;  

  public passwordResetTokenHash?: string | null;
  public passwordResetTokenExpiresAt?: Date | null;
  public passwordResetTokenUsedAt?: Date | null;  
  

  toJSON(): Omit<UserAttributes, 'password'> {
    const values = Object.assign({}, this.get()) as UserAttributes;
    const copy: Partial<UserAttributes> = { ...values };
    delete copy.password; 
    return copy as Omit<UserAttributes, 'password'>;
  }
}

User.init({
  idUser: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  dni: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  surname: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'client'
  },
  isMember: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  registrationDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.STRING(150),
    allowNull: false,
    defaultValue: 'pending'
  },
  activationToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: null,
  },
  activationTokenExpires: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
 
  passwordResetTokenHash: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: null,
  },
  passwordResetTokenExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
  passwordResetTokenUsedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
  
}, {
  sequelize: db,
  tableName: 'user',
  timestamps: false
});

export default User;
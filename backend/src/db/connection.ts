import { Sequelize } from 'sequelize';

export const db = new Sequelize(
  process.env.DB_NAME || 'online_shop_fullstack_rowing',
  process.env.DB_USERNAME || '',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false,
    timezone: '+00:00' // Utc for dates
  }
);

export const connectDB = async () => {
  try {
    await db.authenticate();
    console.log('Database connection established.');
  } catch (error) {
    console.error('Could not connect to database:', error);
  }
};

export default db;


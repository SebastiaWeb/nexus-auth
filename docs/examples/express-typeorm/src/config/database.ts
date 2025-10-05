import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User, Account, Session, VerificationToken } from '../entities';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'nexusauth_example',
  synchronize: process.env.NODE_ENV === 'development', // Solo en desarrollo
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Account, Session, VerificationToken],
  migrations: ['src/migrations/**/*.ts'],
  subscribers: [],
});

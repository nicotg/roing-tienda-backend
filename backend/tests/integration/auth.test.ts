import request from 'supertest';


// Evita cargar el paquete ESM real de uuid
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }), { virtual: true });


import app from '../../src/app'
import { connectDB, db } from '../../src/db/connection'; 
import User from '../../src/models/user-model';
import bcrypt from 'bcryptjs';
import { describe, it, expect, beforeEach, jest, beforeAll, afterAll } from '@jest/globals';


beforeAll(async () => {
  await connectDB();
});

// This will delete all users before each test to ensure a clean state
beforeEach(async () => {
  await User.destroy({ where: {} });
});

// Disconnect from the database after all tests have run
afterAll(async () => {
  await db.close();
});

describe('POST /api/auth/login', () => {

  it('should authenticate a user with valid credentials and return a token', async () => {
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    await User.create({
      name: 'Test',
      surname: 'User',
      email: 'test@example.com',
      password: hashedPassword,
      status: 'active',
      isMember: false,
      registrationDate: new Date()
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.userFound.email).toBe('test@example.com');
  });

  it('should return a 400 error if the password is incorrect', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    await User.create({
      name: 'Test',
      surname: 'User',
      email: 'test@example.com',
      password: hashedPassword,
      status: 'active',
      isMember: false, 
      registrationDate: new Date()
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('La contraseña es incorrecta');
  });

  it('should return a 400 error if the user does not exist', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'somepassword'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('No existe una cuenta con este correo electrónico');
  });

  it('should return a 400 error if the user account is not active', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    await User.create({
      name: 'Inactive',
      surname: 'User',
      email: 'inactive@example.com',
      password: hashedPassword,
      status: 'inactive',
      isMember: false, 
      registrationDate: new Date()
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'inactive@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Tu cuenta no está activada. Revisa tu correo para activarla');
  });
});
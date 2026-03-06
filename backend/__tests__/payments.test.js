import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import paymentsRouter from '../routes/payments.js';
import { User, Payment } from '../database.js';

// Mock the database
jest.mock('../database.js', () => ({
  User: {
    findById: jest.fn(),
    updateOne: jest.fn()
  },
  Payment: {
    create: jest.fn(),
    findById: jest.fn(),
    updateOne: jest.fn()
  }
}));

// Mock fetch globally
global.fetch = jest.fn();

const app = express();
app.use(express.json());
app.use('/api/payments', paymentsRouter);

// Mock environment variables
process.env.PAYMENTS_ENABLED = 'true';
process.env.PAYCHANGU_SECRET = 'test-secret';
process.env.PAYCHANGU_API_BASE = 'https://api.paychangu.com';
process.env.BACKEND_URL = 'http://localhost:4000';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-jwt-secret';

describe('Payments API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/payments/create-session', () => {
    it('should create a PayChangu payment session successfully', async () => {
      // Mock user authentication
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        profileCompletion: 60
      };

      User.findById.mockResolvedValue(mockUser);

      // Mock payment creation
      const mockPayment = {
        _id: 'payment123',
        userId: 'user123',
        planId: 'daily',
        amount: 950,
        currency: 'MWK',
        status: 'pending'
      };

      Payment.create.mockResolvedValue(mockPayment);

      // Mock PayChangu API response
      const mockPayChanguResponse = {
        status: 'success',
        data: {
          checkout_url: 'https://checkout.paychangu.com/test123'
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPayChanguResponse)
      });

      Payment.updateOne.mockResolvedValue({});

      // Create JWT token for authentication
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ id: 'user123' }, 'test-jwt-secret');

      const response = await request(app)
        .post('/api/payments/create-session')
        .set('Authorization', `Bearer ${token}`)
        .send({
          planId: 'daily',
          provider: 'paychangu'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('checkoutUrl');
      expect(response.body).toHaveProperty('paymentId', 'payment123');
      expect(fetch).toHaveBeenCalledWith('https://api.paychangu.com/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'test-secret'
        },
        body: JSON.stringify({
          amount: 950,
          currency: 'MWK',
          email: 'test@example.com',
          tx_ref: 'payment123',
          callback_url: 'http://localhost:4000/api/payments/webhook',
          return_url: 'http://localhost:3000/payments?sessionId=payment123'
        })
      });
    });

    it('should return error for invalid plan', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com'
      };

      User.findById.mockResolvedValue(mockUser);

      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ id: 'user123' }, 'test-jwt-secret');

      const response = await request(app)
        .post('/api/payments/create-session')
        .set('Authorization', `Bearer ${token}`)
        .send({
          planId: 'invalid-plan',
          provider: 'paychangu'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid plan id');
    });
  });
});
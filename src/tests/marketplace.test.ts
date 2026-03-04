import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/user.model.js';
import Listing from '../models/listing.model.js';
import PrivateChatRoom from '../models/private.model.js';
import { signUserAccessToken } from '../utils/jwt.js';

describe('Marketplace API Integration Tests', () => {
  let authToken: string;
  let testUser: any;
  let sellerUser: any;
  let testListing: any;

  beforeAll(async () => {
    // Connect to a test database if possible, or use the dev one (be careful)
    // For this environment, we'll assume the DB is already connected via server.ts 
    // but app.ts doesn't connect. We might need to connect here.
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/herridez-test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // Setup Test Users
    testUser = await User.create({
      name: 'Test Buyer',
      email: `buyer_${Date.now()}@test.com`,
      phone: Math.floor(Math.random() * 9000000000 + 1000000000).toString(),
      subscription: { 
        tier: 'pro', 
        expiryDate: new Date(Date.now() + 86400000),
        startDate: new Date(),
        ridesUsedThisMonth: 0,
        lastRideResetDate: new Date(),
        autoRenew: false
      }
    });

    sellerUser = await User.create({
      name: 'Test Seller',
      email: `seller_${Date.now()}@test.com`,
      phone: Math.floor(Math.random() * 9000000000 + 1000000000).toString(),
      subscription: { 
        tier: 'pro',
        startDate: new Date(),
        ridesUsedThisMonth: 0,
        lastRideResetDate: new Date(),
        autoRenew: false
      }
    });

    authToken = signUserAccessToken(testUser._id);

    // Create a dummy listing
    testListing = await Listing.create({
      sellerId: sellerUser._id,
      title: 'Test Bike',
      description: 'A great bike',
      price: 5000,
      category: 'bike',
      status: 'active'
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@test.com$/ });
    await Listing.deleteMany({ title: /^Test/ });
    await PrivateChatRoom.deleteMany({ context: 'marketplace' });
    await mongoose.connection.close();
  });

  describe('GET /api/v1/marketplace', () => {
    it('should return 403 if user is not Pro', async () => {
      // Mock free user
      const freeUser = await User.create({
        name: 'Free User',
        email: `free_${Date.now()}@test.com`,
        phone: Math.floor(Math.random() * 9000000000 + 1000000000).toString(),
        subscription: { 
          tier: 'free',
          startDate: new Date(),
          ridesUsedThisMonth: 0,
          lastRideResetDate: new Date(),
          autoRenew: false
        }
      });
      const freeToken = signUserAccessToken(freeUser._id.toString());

      const res = await request(app)
        .get('/api/v1/marketplace')
        .set('Authorization', `Bearer ${freeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('UPGRADE_REQUIRED');
    });

    it('should return listings for Pro user', async () => {
      const res = await request(app)
        .get('/api/v1/marketplace')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/v1/marketplace/:listingId/contact', () => {
    it('should create a chat room and send a product card', async () => {
      const res = await request(app)
        .post(`/api/v1/marketplace/${testListing._id}/contact`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.roomId).toBeDefined();
      
      // Verify otherUser mapping logic (user1/user2) matches what we fixed in frontend
      const chatRoom = await PrivateChatRoom.findOne({ roomId: res.body.data.roomId });
      expect(chatRoom).toBeDefined();
      expect(chatRoom?.user1).toBeDefined();
      expect(chatRoom?.user2).toBeDefined();
      expect(chatRoom?.context).toBe('marketplace');
    });

    it('should not allow contacting your own listing', async () => {
      const sellerToken = signUserAccessToken(sellerUser._id);
      
      const res = await request(app)
        .post(`/api/v1/marketplace/${testListing._id}/contact`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('You cannot contact yourself');
    });
  });
});

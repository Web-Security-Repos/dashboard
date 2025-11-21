const request = require('supertest');
const app = require('../server');

// Basic API endpoint tests
describe('API Endpoints', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('GET /api/repositories', () => {
    it('should return list of repositories', async () => {
      const response = await request(app).get('/api/repositories');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/stats/summary', () => {
    it('should return summary statistics', async () => {
      const response = await request(app).get('/api/stats/summary');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('repositories');
      expect(response.body).toHaveProperty('analyses');
      expect(response.body).toHaveProperty('alerts');
    });
  });
});


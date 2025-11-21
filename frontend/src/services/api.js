import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const repositoriesAPI = {
  getAll: (filters) => api.get('/repositories', { params: filters }),
  getById: (id) => api.get(`/repositories/${id}`),
  getAnalyses: (id, options) => api.get(`/repositories/${id}/analyses`, { params: options }),
  getAlerts: (id, filters) => api.get(`/repositories/${id}/alerts`, { params: filters })
};

export const alertsAPI = {
  getAll: (filters) => api.get('/alerts', { params: filters })
};

export const statsAPI = {
  getSummary: () => api.get('/stats/summary'),
  getTrends: (days) => api.get('/stats/trends', { params: { days } }),
  getVulnerabilityDistribution: () => api.get('/stats/vulnerability-distribution')
};

export const scanAPI = {
  triggerScan: (repoId) => api.post(`/scan/trigger/${repoId}`),
  triggerAllScans: () => api.post('/scan/trigger-all'),
  fetchData: () => api.post('/scan/fetch-data')
};

export default api;


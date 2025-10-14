import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchPayments = async () => {
  const response = await api.get('/payments');
  return response.data;
};

export const fetchPaymentById = async (id) => {
  const response = await api.get(`/payments/${id}`);
  return response.data;
};

export const fetchPaymentsByStatus = async (status) => {
  const response = await api.get(`/payments/status/${status}`);
  return response.data;
};

export const fetchRecentPayments = async (hours) => {
  const response = await api.get(`/payments/recent/${hours}`);
  return response.data;
};

export const fetchStatistics = async () => {
  const response = await api.get('/payments/statistics');
  return response.data;
};

export const createPayment = async (payment) => {
  const response = await api.post('/payments', payment);
  return response.data;
};

export const updatePaymentStatus = async (id, status, errorMessage = null) => {
  const params = { status };
  if (errorMessage) {
    params.errorMessage = errorMessage;
  }
  const response = await api.put(`/payments/${id}/status`, null, { params });
  return response.data;
};

export const generateSampleData = async () => {
  const response = await api.post('/payments/generate-sample-data');
  return response.data;
};

export default api;



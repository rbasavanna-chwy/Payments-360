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

// Filter endpoints
export const fetchPaymentStatuses = async () => {
  const response = await api.get('/payments/filters/payment-statuses');
  return response.data;
};

export const fetchPaymentMethods = async () => {
  const response = await api.get('/payments/filters/payment-methods');
  return response.data;
};

export const fetchOrderTypes = async () => {
  const response = await api.get('/payments/filters/order-types');
  return response.data;
};

export const fetchAgedMetrics = async (orderType, paymentMethod, paymentState, dateFilter, frequency = 'daily') => {
  const params = {};
  if (orderType && orderType !== 'all') params.orderType = orderType;
  if (paymentMethod && paymentMethod !== 'all') params.paymentMethod = paymentMethod;
  if (paymentState && paymentState !== 'all') params.paymentState = paymentState;
  if (dateFilter && dateFilter !== 'all') params.dateFilter = dateFilter;
  if (frequency) params.frequency = frequency;
  
  const response = await api.get('/payments/aged-metrics', { params });
  return response.data;
};

// Alert Settings endpoints
export const fetchAlertSettings = async () => {
  const response = await api.get('/payments/alert-settings');
  return response.data;
};

export const saveAlertSettings = async (warningThreshold, criticalThreshold, queryText) => {
  const response = await api.post('/payments/alert-settings', {
    warningThreshold,
    criticalThreshold,
    queryText
  });
  return response.data;
};

export default api;

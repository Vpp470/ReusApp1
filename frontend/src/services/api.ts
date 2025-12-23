import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Determinar la URL base segons la plataforma
// En web, les peticions a /api es redirigeixen automàticament al backend
// En mobile, necessitem la URL completa
const getBaseURL = () => {
  // En web, usar URL relativa per aprofitar el proxy
  if (Platform.OS === 'web') {
    return '/api';
  }
  // En mobile, usar la URL completa
  const envUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
  return `${envUrl}/api`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth services
export const authService = {
  register: async (userData: { email: string; name: string; password: string; phone?: string }) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', null, { params: { email, password } });
    return response.data;
  },
  updatePushToken: async (pushToken: string, authToken: string) => {
    const response = await api.put('/users/push-token', 
      { push_token: pushToken },
      { headers: { Authorization: authToken } }
    );
    return response.data;
  },
  updateLanguage: async (language: string, authToken: string) => {
    const response = await api.put('/users/language', 
      { language },
      { headers: { Authorization: authToken } }
    );
    return response.data;
  },
};

// Establishments services
export const establishmentsService = {
  getAll: async () => {
    const response = await api.get('/establishments');
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/establishments/${id}`);
    return response.data;
  },
  update: async (id: string, data: any, authToken: string) => {
    const response = await api.put(`/admin/establishments/${id}`, data, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    return response.data;
  },
};

// Offers services
export const offersService = {
  getAll: async () => {
    const response = await api.get('/offers');
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/offers/${id}`);
    return response.data;
  },
};

// Events services
export const eventsService = {
  getAll: async () => {
    const response = await api.get('/events');
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/events/${id}`);
    return response.data;
  },
};

// Gift Cards services
export const giftCardsService = {
  create: async (amount: number, userId: string) => {
    const response = await api.post('/gift-cards/create', { amount, user_id: userId });
    return response.data;
  },
  getUserCards: async (userId: string) => {
    const response = await api.get(`/gift-cards/user/${userId}`);
    return response.data;
  },
  getByCode: async (code: string) => {
    const response = await api.get(`/gift-cards/${code}`);
    return response.data;
  },
};

// Payment services
export const paymentService = {
  createPayPalPayment: async (data: { amount: number; currency: string; return_url: string; cancel_url: string }) => {
    const response = await api.post('/payments/paypal/create', data);
    return response.data;
  },
  executePayPalPayment: async (paymentId: string, payerId: string, userId: string, amount: number) => {
    const response = await api.post('/payments/paypal/execute', null, {
      params: { payment_id: paymentId, payer_id: payerId, user_id: userId, amount },
    });
    return response.data;
  },
};

// Tickets services
export const ticketsService = {
  scan: async (data: { user_id: string; ticket_code: string; establishment_id?: string; amount?: number }) => {
    const response = await api.post('/tickets/scan', data);
    return response.data;
  },
  getUserTickets: async (userId: string) => {
    const response = await api.get(`/tickets/user/${userId}`);
    return response.data;
  },
};

// Promotions services
export const promotionsService = {
  getAll: async (token?: string) => {
    const headers: any = {};
    if (token) headers.Authorization = token;
    const response = await api.get('/promotions', { headers });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/promotions/${id}`);
    return response.data;
  },
  create: async (token: string, data: any) => {
    const response = await api.post('/promotions', data, {
      headers: { Authorization: token },
    });
    return response.data;
  },
  update: async (token: string, id: string, data: any) => {
    const response = await api.put(`/promotions/${id}`, data, {
      headers: { Authorization: token },
    });
    return response.data;
  },
  delete: async (token: string, id: string) => {
    const response = await api.delete(`/promotions/${id}`, {
      headers: { Authorization: token },
    });
    return response.data;
  },
  approve: async (token: string, id: string) => {
    const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    const response = await api.post(`/promotions/${id}/approve`, {}, {
      headers: { Authorization: authHeader },
    });
    return response.data;
  },
  reject: async (token: string, id: string, reason: string) => {
    const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    const response = await api.post(`/promotions/${id}/reject`, null, {
      params: { reason },
      headers: { Authorization: authHeader },
    });
    return response.data;
  },
};

// Admin services
export const adminService = {
  // Stats
  getStats: async (token: string) => {
    const response = await api.get('/admin/stats', {
      headers: { Authorization: token },
    });
    return response.data;
  },

  // Establishments
  establishments: {
    getAll: async (token: string) => {
      const response = await api.get('/admin/establishments', {
        headers: { Authorization: token },
      });
      return response.data;
    },
    create: async (token: string, data: any) => {
      const response = await api.post('/admin/establishments', data, {
        headers: { Authorization: token },
      });
      return response.data;
    },
    update: async (token: string, id: string, data: any) => {
      const response = await api.put(`/admin/establishments/${id}`, data, {
        headers: { Authorization: token },
      });
      return response.data;
    },
    delete: async (token: string, id: string) => {
      const response = await api.delete(`/admin/establishments/${id}`, {
        headers: { Authorization: token },
      });
      return response.data;
    },
    importExcel: async (token: string, formData: FormData) => {
      const response = await api.post('/admin/import-establishments', formData, {
        headers: {
          Authorization: token,
          // No establir Content-Type manualment - axios ho gestiona automàticament
        },
        timeout: 60000, // 60 segons per fitxers grans
        transformRequest: (data) => data, // No transformar FormData
      });
      return response.data;
    },
    exportEmails: async (token: string) => {
      const response = await api.get('/admin/establishments/export-emails', {
        headers: { Authorization: token },
        responseType: 'blob', // Important per rebre el fitxer com a blob
      });
      return response.data;
    },
  },

  // Offers
  offers: {
    create: async (token: string, data: any) => {
      const response = await api.post('/admin/offers', data, {
        headers: { Authorization: token },
      });
      return response.data;
    },
    update: async (token: string, id: string, data: any) => {
      const response = await api.put(`/admin/offers/${id}`, data, {
        headers: { Authorization: token },
      });
      return response.data;
    },
    delete: async (token: string, id: string) => {
      const response = await api.delete(`/admin/offers/${id}`, {
        headers: { Authorization: token },
      });
      return response.data;
    },
  },

  // Events
  events: {
    create: async (token: string, data: any) => {
      const response = await api.post('/admin/events', data, {
        headers: { Authorization: token },
      });
      return response.data;
    },
    update: async (token: string, id: string, data: any) => {
      const response = await api.put(`/admin/events/${id}`, data, {
        headers: { Authorization: token },
      });
      return response.data;
    },
    delete: async (token: string, id: string) => {
      const response = await api.delete(`/admin/events/${id}`, {
        headers: { Authorization: token },
      });
      return response.data;
    },
  },

  // News
  news: {
    getAll: async (token: string) => {
      const response = await api.get('/admin/news', {
        headers: { Authorization: token },
      });
      return response.data;
    },
    create: async (token: string, data: any) => {
      const response = await api.post('/admin/news', data, {
        headers: { Authorization: token },
      });
      return response.data;
    },
    update: async (token: string, id: string, data: any) => {
      const response = await api.put(`/admin/news/${id}`, data, {
        headers: { Authorization: token },
      });
      return response.data;
    },
    delete: async (token: string, id: string) => {
      const response = await api.delete(`/admin/news/${id}`, {
        headers: { Authorization: token },
      });
      return response.data;
    },
  },

  // Users
  users: {
    getAll: async (token: string, skip: number = 0, limit: number = 100, search?: string) => {
      const params: any = { skip, limit };
      if (search) params.search = search;
      
      const response = await api.get('/admin/users', {
        headers: { Authorization: token },
        params
      });
      return response.data;
    },
    getCount: async (token: string) => {
      const response = await api.get('/admin/users/count', {
        headers: { Authorization: token },
      });
      return response.data;
    },
    getById: async (token: string, id: string) => {
      const response = await api.get(`/admin/users/${id}`, {
        headers: { Authorization: token },
      });
      return response.data;
    },
    update: async (token: string, id: string, data: any) => {
      const response = await api.put(`/admin/users/${id}`, data, {
        headers: { Authorization: token },
      });
      return response.data;
    },
    delete: async (token: string, id: string) => {
      const response = await api.delete(`/admin/users/${id}`, {
        headers: { Authorization: token },
      });
      return response.data;
    },
  },

  // Gift Cards
  giftCards: {
    getAll: async (token: string) => {
      const response = await api.get('/admin/gift-cards', {
        headers: { Authorization: token },
      });
      return response.data;
    },
  },

  // Image Upload
  uploadImage: async (token: string, file: FormData) => {
    const response = await api.post('/admin/upload-image', file, {
      headers: {
        Authorization: token,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default api;
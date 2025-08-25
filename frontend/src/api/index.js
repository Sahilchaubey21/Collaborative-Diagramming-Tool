import axios from 'axios';
import { io } from 'socket.io-client';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? (process.env.REACT_APP_API_URL || 'http://localhost:8000')
    : '', // Use relative URLs in development to utilize proxy
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login page
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Socket.io setup
export const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:8000', {
  path: '/socket.io/',
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

// Auth API functions
export const auth = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  register: async (username, email, password, full_name) => {
    const response = await api.post('/auth/register', {
      username,
      email,
      password,
      full_name,
    });
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      socket.disconnect();
    }
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
};

// Diagrams API functions
export const diagrams = {
  create: async (diagramData) => {
    const response = await api.post('/diagrams/', diagramData);
    return response.data;
  },

  getAll: async (skip = 0, limit = 10, search = '') => {
    const params = { skip, limit };
    if (search) params.search = search;
    const response = await api.get('/diagrams/', { params });
    return response.data;
  },

  getShared: async (skip = 0, limit = 10, search = '') => {
    const params = { skip, limit };
    if (search) params.search = search;
    const response = await api.get('/diagrams/shared', { params });
    return response.data;
  },

  getById: async (diagramId) => {
    const response = await api.get(`/diagrams/${diagramId}`);
    return response.data;
  },

  update: async (diagramId, updateData) => {
    const response = await api.put(`/diagrams/${diagramId}`, updateData);
    return response.data;
  },

  delete: async (diagramId) => {
    const response = await api.delete(`/diagrams/${diagramId}`);
    return response.data;
  },

  getPublic: async (skip = 0, limit = 10, search = '') => {
    const params = { skip, limit };
    if (search) params.search = search;
    const response = await api.get('/diagrams/public', { params });
    return response.data;
  },

  addCollaborator: async (diagramId, userEmail) => {
    const response = await api.post(`/diagrams/${diagramId}/collaborators/${userEmail}`);
    return response.data;
  },

  removeCollaborator: async (diagramId, userEmail) => {
    const response = await api.delete(`/diagrams/${diagramId}/collaborators/${userEmail}`);
    return response.data;
  },
};

// Chat API functions
export const chat = {
  sendMessage: async (diagramId, message, messageType = 'text', replyTo = null) => {
    const response = await api.post(`/chat/${diagramId}/messages`, {
      message,
      message_type: messageType,
      reply_to: replyTo
    });
    return response.data;
  },

  getMessages: async (diagramId, skip = 0, limit = 50) => {
    const response = await api.get(`/chat/${diagramId}/messages`, {
      params: { skip, limit },
    });
    return response.data;
  },

  editMessage: async (diagramId, messageId, newMessage) => {
    const response = await api.put(`/chat/${diagramId}/messages/${messageId}`, {
      message: newMessage,
      message_type: 'text'
    });
    return response.data;
  },

  deleteMessage: async (diagramId, messageId) => {
    const response = await api.delete(`/chat/${diagramId}/messages/${messageId}`);
    return response.data;
  },

  addReaction: async (diagramId, messageId, emoji) => {
    const response = await api.post(`/chat/${diagramId}/messages/${messageId}/reactions`, null, {
      params: { emoji }
    });
    return response.data;
  }
};

export default api;

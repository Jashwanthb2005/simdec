import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post("/api/auth/register", data),
  login: (data) => api.post("/api/auth/login", data),
  getCurrentUser: () => api.get("/api/auth/me"),
};

// Shipment API
export const shipmentAPI = {
  create: (data) => api.post("/api/shipments/create", data),
  getAll: (params) => api.get("/api/shipments/all", { params }),
  getById: (id) => api.get(`/api/shipments/${id}`),
  approve: (id, override = null) => api.post(`/api/shipments/${id}/approve`, override),
  addFeedback: (id, data) => api.post(`/api/shipments/${id}/feedback`, data),
  getStats: (params) => api.get("/api/shipments/stats/overview", { params }),
};

// Admin API
export const adminAPI = {
  getUsers: () => api.get("/api/admin/users"),
  updateUserRole: (id, role) => api.put(`/api/admin/users/${id}/role`, { role }),
  getStats: () => api.get("/api/admin/stats"),
  getModelStatus: () => api.get("/api/admin/model/status"),
  retrainModel: () => api.post("/api/admin/model/retrain"),
  getLogs: (params) => api.get("/api/admin/logs", { params }),
};

// Legacy inference API (for backward compatibility)
export const inferenceAPI = {
  predict: (data) => api.post("/api/infer", data),
};

export default api;


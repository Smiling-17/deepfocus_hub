import axios from "axios";

const baseURL = (() => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }
  return "http://localhost:5000/api";
})();

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json"
  },
  timeout: 10000
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("deepfocus-token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      window.localStorage.removeItem("deepfocus-token");
      window.localStorage.removeItem("deepfocus-user");
      window.dispatchEvent(new Event("deepfocus-logout"));
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.code === "ECONNABORTED") {
    return "Kết nối quá hạn, vui lòng thử lại sau.";
  }
  return "Có lỗi xảy ra, vui lòng thử lại sau.";
};

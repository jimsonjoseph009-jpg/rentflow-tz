import axios from "axios";
import { API_BASE_URL } from "../config";

const API = axios.create({
  baseURL: API_BASE_URL,
});

API.interceptors.request.use((config) => {
  config.withCredentials = true;
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 402) {
      try {
        const msg = error?.response?.data?.message || "Active subscription required";
        sessionStorage.setItem("rf_billing_notice", msg);
      } catch {}

      if (typeof window !== "undefined") {
        const path = window.location?.pathname || "";
        if (path !== "/billing") {
          window.location.href = "/billing";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default API;

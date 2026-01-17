/**
 * API Client Configuration
 * Configures the base URL for backend API calls
 */

// Get API URL from environment or use default
// In development: use current host (empty string = relative path)
// In production: use VITE_API_URL from env or https://api.volxai.com
export const API_BASE_URL = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : (typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? ''
      : 'https://api.volxai.com');

export const API_ENDPOINTS = {
  // Auth endpoints
  register: `${API_BASE_URL}/api/auth/register`,
  login: `${API_BASE_URL}/api/auth/login`,
  logout: `${API_BASE_URL}/api/auth/logout`,
  me: `${API_BASE_URL}/api/auth/me`,

  // Health check
  ping: `${API_BASE_URL}/api/ping`,
};

/**
 * Generic API request handler
 */
export async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit & { body?: any } = {},
): Promise<T> {
  const { body, ...fetchOptions } = options;

  const config: RequestInit = {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
  };

  // Add token if available
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  // Add body if provided
  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(endpoint, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

/**
 * Register a new user
 */
export async function registerUser(data: {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}) {
  const response = await apiCall(API_ENDPOINTS.register, {
    method: "POST",
    body: data,
  });

  // Store token if registration successful
  if (response.token) {
    localStorage.setItem("authToken", response.token);
  }

  return response;
}

/**
 * Login user
 */
export async function loginUser(data: { email: string; password: string }) {
  const response = await apiCall(API_ENDPOINTS.login, {
    method: "POST",
    body: data,
  });

  // Store token if login successful
  if (response.token) {
    localStorage.setItem("authToken", response.token);
  }

  return response;
}

/**
 * Logout user
 */
export async function logoutUser() {
  await apiCall(API_ENDPOINTS.logout, {
    method: "POST",
  });

  // Clear token
  localStorage.removeItem("authToken");
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  return apiCall(API_ENDPOINTS.me, {
    method: "GET",
  });
}

/**
 * Health check
 */
export async function checkHealth() {
  return apiCall(API_ENDPOINTS.ping, {
    method: "GET",
  });
}

/**
 * Get stored auth token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem("authToken");
}

/**
 * Clear auth token
 */
export function clearAuthToken(): void {
  localStorage.removeItem("authToken");
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Build full API URL with base URL
 * Used for all API calls that need full URLs (cross-domain requests)
 */
export function buildApiUrl(path: string): string {
  // If API_BASE_URL is empty (development mode), use relative path directly
  if (API_BASE_URL === '') {
    return path;
  }
  // Otherwise, combine base URL with path
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
}

/**
 * Build admin API URL with base URL
 * Alias for buildApiUrl for consistency with existing admin components
 */
export function buildAdminApiUrl(path: string): string {
  return buildApiUrl(path);
}

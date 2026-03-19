// API Configuration
// Replace with your actual backend URL
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// WebSocket URL for real-time features
export const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3000';

export const getAuthHeaders = () => {
  const token = localStorage.getItem('rivvo_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

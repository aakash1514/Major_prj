// Remove unused import
// import { useAuthStore } from '../store/authStore';

// Use direct API URL to avoid TypeScript issues
const API_URL = 'http://localhost:5000/api';

/**
 * Makes authenticated API requests to the backend
 */
export const api = {
  /**
   * GET request
   */
  async get(endpoint: string) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      const errorMessage = responseData.error || responseData.message || `API error: ${response.status}`;
      throw new Error(errorMessage);
    }
    
    return responseData;
  },
  
  /**
   * POST request
   */
  async post(endpoint: string, data: any) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data)
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      const errorMessage = responseData.error || responseData.message || `API error: ${response.status}`;
      throw new Error(errorMessage);
    }
    
    return responseData;
  },
  
  /**
   * PUT request
   */
  async put(endpoint: string, data: any) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(data)
  });

  const responseData = await response.json();

  if (!response.ok) {
    const errorMessage = responseData.error || responseData.message || `API error: ${response.status}`;
    throw new Error(errorMessage);
  }

  return responseData;
},
  
  /**
   * DELETE request
   */
  async delete(endpoint: string) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      const errorMessage = responseData.error || responseData.message || `API error: ${response.status}`;
      throw new Error(errorMessage);
    }
    
    return responseData;
  }
};